import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStageLayout } from './layoutMath';
import {
  getInitialTheme,
  isValidQuickLinkInput,
  normalizeUrl,
  resolveThemeMode,
  sanitizeQuickLinks,
  shouldShowBootIntro,
  STORAGE_KEYS,
} from './storage';
import { ACCENT_PRESETS, hexToRgb, normalizeHexColor, resolveAccentTokens } from '../constants/accents';
import { clearSearchHistory, getHistorySuggestions, getSearchHistory, saveSearchHistory } from './searchEngine';
import {
  AWAY_BORED_TO_SLEEP_MS,
  evaluatePresenceState,
  TOUCH_INACTIVITY_MS,
  WAKE_HAPPY_DURATION_MS,
} from './idleSleepState';
import {
  computeAwaySeriousMotion,
  computeSleepingMotion,
  computeWakingHappyMotion,
} from './orbMotionMath';
import {
  playPresenceSound,
  playReactionSound,
  playUiSound,
  unlockOrbitAudio,
} from './orbSounds';

test('desktop idle layout centers the entire bot+bar+links group vertically', () => {
  const layout = computeStageLayout({
    viewportWidth: 1440,
    viewportHeight: 900,
    fullHeight: 900,
    safeTop: 0,
    safeBottom: 0,
    isMobile: false,
    isFocused: false,
    hasQuickLinks: true,
    suggestionCount: 0,
  });

  assert.equal(layout.keyboardActive, false);
  const groupTop = layout.botCenterY - layout.botSize / 2;
  const groupBottom = layout.uiTopY + 58 + 52; // bar + quick links
  const topMargin = groupTop;
  const bottomMargin = 900 - groupBottom;
  assert.ok(Math.abs(topMargin - bottomMargin) <= 2, `Expected balanced vertical centering, got top=${topMargin}, bottom=${bottomMargin}`);
});

test('mobile idle layout is centered, shifts up on virtual keyboard, and returns identically on close', () => {
  const initialIdle = computeStageLayout({
    viewportWidth: 390,
    viewportHeight: 844,
    fullHeight: 844,
    safeTop: 0,
    safeBottom: 0,
    isMobile: true,
    isFocused: false,
    hasQuickLinks: true,
    suggestionCount: 0,
  });

  assert.equal(initialIdle.keyboardActive, false);
  const idleTop = initialIdle.botCenterY - initialIdle.botSize / 2;
  const idleBottom = initialIdle.uiTopY + 58 + 52;
  assert.ok(Math.abs(idleTop - (844 - idleBottom)) <= 2, 'Mobile idle group must be centered vertically');

  // Simulate virtual keyboard shrinking visualViewport to 430px
  const keyboardOpen = computeStageLayout({
    viewportWidth: 390,
    viewportHeight: 430,
    fullHeight: 844,
    safeTop: 0,
    safeBottom: 0,
    isMobile: true,
    isFocused: true,
    hasQuickLinks: true,
    suggestionCount: 2,
  });

  assert.equal(keyboardOpen.keyboardActive, true);
  assert.ok(keyboardOpen.uiTopY < initialIdle.uiTopY, 'Group must translate upward when keyboard opens');
  const keyboardBottom = keyboardOpen.uiTopY + 58 + (keyboardOpen.visibleSuggestions > 0 ? 10 + keyboardOpen.visibleSuggestions * 46 : 0);
  assert.ok(keyboardBottom <= 430, `Nothing should clip below visualViewport height (bottom=${keyboardBottom})`);
  assert.ok(keyboardOpen.botCenterY - keyboardOpen.botSize / 2 >= 12, 'Bot must not clip off the top');

  // Simulate closing keyboard
  const restoredIdle = computeStageLayout({
    viewportWidth: 390,
    viewportHeight: 844,
    fullHeight: 844,
    safeTop: 0,
    safeBottom: 0,
    isMobile: true,
    isFocused: false,
    hasQuickLinks: true,
    suggestionCount: 0,
  });

  assert.equal(restoredIdle.botCenterY, initialIdle.botCenterY);
  assert.equal(restoredIdle.uiTopY, initialIdle.uiTopY);
  assert.equal(restoredIdle.botSize, initialIdle.botSize);
});

test('quick links sanitization enforces max 4 links and valid URLs', () => {
  assert.equal(normalizeUrl('github.com'), 'https://github.com');
  assert.equal(isValidQuickLinkInput('GitHub', 'github.com'), true);
  assert.equal(isValidQuickLinkInput('', 'github.com'), false);
  assert.equal(isValidQuickLinkInput('Bad', 'javascript:alert(1)'), false);

  const sanitized = sanitizeQuickLinks([
    { id: '1', title: 'One', url: 'one.com' },
    { id: '2', title: 'Two', url: 'https://two.com' },
    { id: '3', title: 'Three', url: 'three.org' },
    { id: '4', title: 'Four', url: 'four.io' },
    { id: '5', title: 'Five', url: 'five.dev' },
  ]);
  assert.equal(sanitized.length, 4);
  assert.equal(sanitized[0].url, 'https://one.com');
});

test('hexToRgb converts 6-digit hex accents to comma-separated RGB channels', () => {
  assert.equal(hexToRgb('#FF6A00'), '255, 106, 0');
  assert.equal(hexToRgb('#00E5FF'), '0, 229, 255');
  assert.equal(hexToRgb('#22FF55'), '34, 255, 85');
  assert.equal(hexToRgb('invalid'), '255, 106, 0');
});

test('all 10 fluo accent presets include valid dark/light hex colors and 5-language labels', () => {
  assert.equal(ACCENT_PRESETS.length, 10);
  const hexRe = /^#[0-9A-Fa-f]{6}$/;
  const langs = ['it', 'en', 'fr', 'de', 'es'] as const;
  for (const preset of ACCENT_PRESETS) {
    assert.match(preset.hex, hexRe, `Invalid hex on ${preset.id}`);
    assert.match(preset.lightTextHex, hexRe, `Invalid lightTextHex on ${preset.id}`);
    assert.ok(preset.fgOnAccent === '#07090F' || preset.fgOnAccent === '#FFFFFF');
    for (const lang of langs) {
      assert.ok(preset.labels[lang].trim().length > 0, `Missing ${lang} label on ${preset.id}`);
    }
  }
});

test('clearSearchHistory removes persisted history keys and keeps new sessions empty', () => {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };

  saveSearchHistory('orbit');
  saveSearchHistory('typescript');
  store.set('bs_h', JSON.stringify(['legacy']));
  assert.deepEqual(getSearchHistory(), ['typescript', 'orbit']);
  clearSearchHistory();
  assert.deepEqual(getSearchHistory(), []);
  assert.deepEqual(getHistorySuggestions(), []);
  assert.equal(store.get(STORAGE_KEYS.history), undefined);
  assert.equal(store.get('bs_h'), undefined);
});

test('presence state machine transitions away-serious -> sleeping -> waking-happy -> awake on desktop and touch', () => {
  // Desktop: pointer leaves frame -> immediately away-serious ("seriously?")
  const r1 = evaluatePresenceState({
    currentState: 'awake',
    stateEnteredAt: 1000,
    now: 2000,
    bootReady: true,
    menuOpen: false,
    hasQuery: false,
    isTouchMode: false,
    pointerOutside: true,
    lastActivityAt: 1500,
  });
  assert.equal(r1.nextState, 'away-serious');
  assert.equal(r1.stopAllAnimations, true);

  // Desktop: still outside after AWAY_BORED_TO_SLEEP_MS -> sleeping
  const r2 = evaluatePresenceState({
    currentState: 'away-serious',
    stateEnteredAt: 2000,
    now: 2000 + AWAY_BORED_TO_SLEEP_MS,
    bootReady: true,
    menuOpen: false,
    hasQuery: false,
    isTouchMode: false,
    pointerOutside: true,
    lastActivityAt: 1500,
  });
  assert.equal(r2.nextState, 'sleeping');
  assert.equal(r2.stopAllAnimations, true);

  // Desktop: pointer re-enters frame -> waking-happy -> awake
  const r3 = evaluatePresenceState({
    currentState: 'sleeping',
    stateEnteredAt: 6200,
    now: 9000,
    bootReady: true,
    menuOpen: false,
    hasQuery: false,
    isTouchMode: false,
    pointerOutside: false,
    lastActivityAt: 9000,
  });
  assert.equal(r3.nextState, 'waking-happy');
  assert.equal(r3.stopAllAnimations, false);

  const r4 = evaluatePresenceState({
    currentState: 'waking-happy',
    stateEnteredAt: 9000,
    now: 9000 + WAKE_HAPPY_DURATION_MS,
    bootReady: true,
    menuOpen: false,
    hasQuery: false,
    isTouchMode: false,
    pointerOutside: false,
    lastActivityAt: 9000,
  });
  assert.equal(r4.nextState, 'awake');

  // Mobile/Touch: stays awake before TOUCH_INACTIVITY_MS (2.5m), then triggers away-serious -> sleeping
  const t1 = evaluatePresenceState({
    currentState: 'awake',
    stateEnteredAt: 0,
    now: TOUCH_INACTIVITY_MS - 1000,
    bootReady: true,
    menuOpen: false,
    hasQuery: false,
    isTouchMode: true,
    pointerOutside: false,
    lastActivityAt: 0,
  });
  assert.equal(t1.nextState, 'awake');

  const t2 = evaluatePresenceState({
    currentState: 'awake',
    stateEnteredAt: 0,
    now: TOUCH_INACTIVITY_MS,
    bootReady: true,
    menuOpen: false,
    hasQuery: false,
    isTouchMode: true,
    pointerOutside: false,
    lastActivityAt: 0,
  });
  assert.equal(t2.nextState, 'away-serious');
  assert.equal(t2.stopAllAnimations, true);
});

test('desktop stage layout remains identical when blurring search input on compact viewports with suggestions', () => {
  const focused = computeStageLayout({
    viewportWidth: 1280,
    viewportHeight: 540,
    fullHeight: 540,
    safeTop: 0,
    safeBottom: 0,
    isMobile: false,
    isFocused: true,
    hasQuickLinks: true,
    suggestionCount: 2,
  });
  const blurred = computeStageLayout({
    viewportWidth: 1280,
    viewportHeight: 540,
    fullHeight: 540,
    safeTop: 0,
    safeBottom: 0,
    isMobile: false,
    isFocused: false,
    hasQuickLinks: true,
    suggestionCount: 2,
  });

  assert.equal(blurred.botSize, focused.botSize);
  assert.equal(blurred.botCenterY, focused.botCenterY);
  assert.equal(blurred.uiTopY, focused.uiTopY);
});

test('away-serious, sleeping, and waking-happy eye/body motions stay organically alive over time', () => {
  const a1 = computeAwaySeriousMotion(1200, 1000, 180);
  const a2 = computeAwaySeriousMotion(2100, 1000, 180);
  assert.ok(Math.abs(a1.dx - a2.dx) > 0.05, 'away-serious must subtly scan eyes rather than freeze');
  assert.ok(Math.abs(a1.bobY - a2.bobY) > 0.05, 'away-serious must retain subtle living breath');

  const s1 = computeSleepingMotion(1000, 180);
  const s2 = computeSleepingMotion(3000, 180);
  const s3 = computeSleepingMotion(5000, 180);
  assert.ok(s1.lidHeightMul < 0.2 && s2.lidHeightMul < 0.2, 'sleeping lids remain closed');
  assert.ok(Math.abs(s1.breath - s2.breath) > 0.5, 'sleeping must breathe rhythmically');
  assert.ok(Math.abs(s1.dx - s3.dx) > 0.02, 'sleeping eyes must have subtle dream drift');

  const w1 = computeWakingHappyMotion(1150, 1000, WAKE_HAPPY_DURATION_MS, 180);
  const w2 = computeWakingHappyMotion(1550, 1000, WAKE_HAPPY_DURATION_MS, 180);
  assert.ok(Math.abs(w1.rotOffset - w2.rotOffset) > 0.2, 'waking-happy must have playful head motion');
});

test('orbSounds plays tones cleanly for all reactions, presence states, and UI interactions', () => {
  // Should be a no-op without throwing in pure Node (no window)
  assert.doesNotThrow(() => {
    unlockOrbitAudio();
    playReactionSound('wink');
    playReactionSound('curious', true);
    playPresenceSound('away-serious');
    playPresenceSound('sleeping');
    playPresenceSound('waking-happy');
    playPresenceSound('awake');
    playUiSound('menu-open');
    playUiSound('menu-close');
    playUiSound('clear-history');
    playUiSound('quicklink-tap');
  });

  // With a mock browser window + AudioContext, verify tones are scheduled for each cue
  let oscillatorsStarted = 0;
  class MockAudioContext {
    state = 'running';
    currentTime = 1.0;
    destination = {};
    resume() {
      return Promise.resolve();
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: () => {},
        start: () => {
          oscillatorsStarted += 1;
        },
        stop: () => {},
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: () => {},
      };
    }
  }

  const prevWindow = (globalThis as unknown as { window?: unknown }).window;
  (globalThis as unknown as { window: unknown }).window = {
    AudioContext: MockAudioContext,
  };
  try {
    unlockOrbitAudio();
    playPresenceSound('away-serious');
    playPresenceSound('sleeping');
    playPresenceSound('waking-happy');
    playUiSound('menu-open');
    playUiSound('menu-close');
    playUiSound('clear-history');
    playUiSound('quicklink-tap');
    playReactionSound('peek', true);
    playReactionSound('happy');
    assert.ok(oscillatorsStarted >= 13, `Expected multi-tone cues to schedule oscillators, got ${oscillatorsStarted}`);
  } finally {
    (globalThis as unknown as { window?: unknown }).window = prevWindow;
  }
});

test('getInitialTheme defaults to system and resolveThemeMode resolves OS dark/light cleanly', () => {
  const store = new Map<string, string>();
  const prevLS = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  try {
    assert.equal(getInitialTheme(), 'system');
    assert.equal(resolveThemeMode('system', true), 'dark');
    assert.equal(resolveThemeMode('system', false), 'light');
    assert.equal(resolveThemeMode('dark', false), 'dark');
    assert.equal(resolveThemeMode('light', true), 'light');
  } finally {
    (globalThis as unknown as { localStorage?: Storage }).localStorage = prevLS;
  }
});

test('resolveAccentTokens handles presets and arbitrary beta hex colors with readable contrast', () => {
  const preset = resolveAccentTokens('electric-cyan');
  assert.equal(preset.isCustom, false);
  assert.equal(preset.presetId, 'electric-cyan');
  assert.equal(preset.hex, '#00E5FF');

  const brightCustom = resolveAccentTokens('#E6FF00');
  assert.equal(brightCustom.isCustom, true);
  assert.equal(brightCustom.fgOnAccent, '#07090F');
  assert.notEqual(brightCustom.lightTextHex, '#E6FF00', 'Bright yellow should darken in light mode for legibility');

  const darkCustom = resolveAccentTokens('#122040');
  assert.equal(darkCustom.isCustom, true);
  assert.equal(darkCustom.fgOnAccent, '#FFFFFF');

  assert.equal(normalizeHexColor('abc123'), '#ABC123');
  assert.equal(normalizeHexColor('nope'), null);
});

test('shouldShowBootIntro shows on first visit before cookie decision, disables after, and obeys alwaysShowIntro', () => {
  assert.equal(
    shouldShowBootIntro({
      introSeen: false,
      alwaysShowIntro: false,
      consentDecided: false,
      autostart: false,
      reducedMotion: false,
    }),
    true
  );

  // After cookies are decided / first access completed -> skip intro
  assert.equal(
    shouldShowBootIntro({
      introSeen: true,
      alwaysShowIntro: false,
      consentDecided: true,
      autostart: false,
      reducedMotion: false,
    }),
    false
  );

  // Override ON -> always show intro on reload
  assert.equal(
    shouldShowBootIntro({
      introSeen: true,
      alwaysShowIntro: true,
      consentDecided: true,
      autostart: false,
      reducedMotion: false,
    }),
    true
  );

  // autostart or reducedMotion always skip intro
  assert.equal(
    shouldShowBootIntro({
      introSeen: false,
      alwaysShowIntro: true,
      consentDecided: false,
      autostart: true,
      reducedMotion: false,
    }),
    false
  );
  assert.equal(
    shouldShowBootIntro({
      introSeen: false,
      alwaysShowIntro: true,
      consentDecided: false,
      autostart: false,
      reducedMotion: true,
    }),
    false
  );
});

