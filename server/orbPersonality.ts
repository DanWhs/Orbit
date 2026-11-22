import type { BotReactionType, OrbPresenceState, OrbitUiSoundType, ToneSpec } from '../src/types/orbit.ts';

export const AWAY_BORED_TO_SLEEP_MS = 4200;
export const TOUCH_INACTIVITY_MS = 150_000;
export const WAKE_HAPPY_DURATION_MS = 1150;

export const CLICK_POOL: BotReactionType[] = ['wink', 'surprise', 'glance', 'sleepy'];
export const MINI_CLICK_POOL: BotReactionType[] = ['wink', 'happy', 'surprise', 'glance'];
export const IDLE_POOL: BotReactionType[] = ['peek', 'curious', 'glance', 'content', 'wink'];

export const DURATIONS: Record<BotReactionType, number> = {
  wink: 680,
  surprise: 700,
  glance: 900,
  sleepy: 1100,
  think: 3200,
  happy: 850,
  judge: 1800,
  perplexed: 1850,
  curious: 1450,
  peek: 1250,
  content: 1150,
};

export const MINI_DURATIONS: Record<BotReactionType, number> = {
  wink: 680,
  surprise: 700,
  glance: 900,
  sleepy: 1100,
  think: 1800,
  happy: 850,
  judge: 1700,
  perplexed: 1750,
  curious: 1300,
  peek: 1150,
  content: 1050,
};

export const REACTION_SOUNDS: Record<BotReactionType, ToneSpec[]> = {
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

export const PRESENCE_SOUNDS: Record<Exclude<OrbPresenceState, 'awake'>, ToneSpec[]> = {
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

export const UI_SOUNDS: Record<OrbitUiSoundType, ToneSpec[]> = {
  'menu-open': [
    [420, 0.11, 580, 0.02, 0],
    [560, 0.13, 690, 0.015, 65],
  ],
  'menu-close': [[540, 0.13, 380, 0.018, 0]],
  'clear-history': [[480, 0.15, 270, 0.02, 0]],
  'quicklink-tap': [[520, 0.11, 710, 0.02, 0]],
  'standby-enter': [
    [480, 0.14, 390, 0.018, 0],
    [390, 0.18, 330, 0.014, 75],
  ],
};

export function getAudioProfilePayload() {
  return {
    reactions: REACTION_SOUNDS,
    presence: PRESENCE_SOUNDS,
    ui: UI_SOUNDS,
  };
}
