import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStageLayout } from './layoutMath';
import { isValidQuickLinkInput, normalizeUrl, sanitizeQuickLinks } from './storage';
import { hexToRgb } from '../constants/accents';
import { clearSearchHistory, getSearchHistory, saveSearchHistory } from './searchEngine';
import { buildBuyMeACoffeeUrl } from '../constants/support';

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

test('clearSearchHistory wipes persisted search history cleanly', () => {
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
  assert.deepEqual(getSearchHistory(), ['typescript', 'orbit']);
  clearSearchHistory();
  assert.deepEqual(getSearchHistory(), []);
});

test('Buy Me a Coffee URL builder returns the official donation form URL', () => {
  assert.equal(buildBuyMeACoffeeUrl(), 'https://www.buymeacoffee.com/');
});
