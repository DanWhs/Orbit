import { BotReactionType } from '../components/OrbitBot';
import { OrbPresenceState } from './idleSleepState';

export type OrbitUiSoundType =
  | 'menu-open'
  | 'menu-close'
  | 'clear-history'
  | 'quicklink-tap';

type ToneSpec = [freqStart: number, durationSec: number, freqEnd?: number, gainPeak?: number, delayMs?: number];

const REACTION_SOUNDS: Record<BotReactionType, ToneSpec[]> = {
  wink: [[510, 0.13, 660, 0.028, 0]],
  surprise: [[370, 0.16, 650, 0.028, 0]],
  glance: [[430, 0.15, 560, 0.024, 0]],
  sleepy: [[460, 0.24, 290, 0.024, 0]],
  think: [[440, 0.11, 480, 0.02, 0]],
  happy: [
    [520, 0.14, 760, 0.028, 0],
    [700, 0.14, 940, 0.024, 90],
  ],
  judge: [[340, 0.18, 290, 0.026, 0]],
  perplexed: [[410, 0.18, 510, 0.026, 0]],
  curious: [
    [450, 0.12, 540, 0.022, 0],
    [540, 0.11, 610, 0.016, 85],
  ],
  peek: [[490, 0.12, 600, 0.022, 0]],
  content: [
    [510, 0.12, 680, 0.022, 0],
    [660, 0.14, 740, 0.016, 80],
  ],
};

const PRESENCE_SOUNDS: Record<Exclude<OrbPresenceState, 'awake'>, ToneSpec[]> = {
  'away-serious': [
    [410, 0.11, 355, 0.024, 0],
    [350, 0.16, 300, 0.02, 105],
  ],
  sleeping: [
    [350, 0.22, 260, 0.02, 0],
    [250, 0.3, 195, 0.016, 170],
  ],
  'waking-happy': [
    [460, 0.11, 610, 0.024, 0],
    [620, 0.13, 820, 0.024, 85],
    [800, 0.16, 980, 0.018, 170],
  ],
};

const UI_SOUNDS: Record<OrbitUiSoundType, ToneSpec[]> = {
  'menu-open': [
    [420, 0.11, 580, 0.02, 0],
    [560, 0.13, 690, 0.015, 65],
  ],
  'menu-close': [[540, 0.13, 380, 0.018, 0]],
  'clear-history': [[480, 0.15, 270, 0.02, 0]],
  'quicklink-tap': [[520, 0.11, 710, 0.02, 0]],
};

let sharedAudioCtx: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContext(createIfMissing: boolean): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedAudioCtx && createIfMissing) {
      sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended' && createIfMissing) {
      void sharedAudioCtx.resume().catch(() => {});
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'running') {
      audioUnlocked = true;
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function unlockOrbitAudio(): void {
  const ctx = getAudioContext(true);
  if (ctx && ctx.state === 'running') {
    audioUnlocked = true;
  }
}

function scheduleTone(
  ctx: AudioContext,
  freq: number,
  dur = 0.13,
  freqEnd?: number,
  gainPeak = 0.028,
  delayMs = 0
): void {
  try {
    const t = ctx.currentTime + delayMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + dur * 0.85);
    }
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(gainPeak, t + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.025);
  } catch {
    // Ignore browser audio errors
  }
}

function playSequence(specs: ToneSpec[], onlyIfUnlocked = false, scaleGain = 1): void {
  const ctx = getAudioContext(!onlyIfUnlocked);
  if (!ctx) return;
  if (onlyIfUnlocked && ctx.state !== 'running' && !audioUnlocked) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
  for (const [f0, dur, f1, peak = 0.026, delay = 0] of specs) {
    scheduleTone(ctx, f0, dur, f1, peak * scaleGain, delay);
  }
}

export function playReactionSound(type: BotReactionType, ambient = false): void {
  const specs = REACTION_SOUNDS[type];
  if (!specs) return;
  playSequence(specs, ambient, ambient ? 0.55 : 1);
}

export function playPresenceSound(state: OrbPresenceState): void {
  if (state === 'awake') return;
  const specs = PRESENCE_SOUNDS[state];
  if (!specs) return;
  playSequence(specs, true, 1);
}

export function playUiSound(type: OrbitUiSoundType): void {
  const specs = UI_SOUNDS[type];
  if (!specs) return;
  playSequence(specs, false, 1);
}
