export type ThemeMode = 'system' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

export type AccentId =
  | 'neon-orange'
  | 'neon-green'
  | 'electric-cyan'
  | 'neon-magenta'
  | 'fluo-yellow'
  | 'fluo-purple'
  | 'cobalt-blue'
  | 'laser-coral'
  | 'hyper-mint'
  | 'solar-gold';

export type AccentValue = AccentId | `#${string}`;

export interface AccentPreset {
  id: AccentId;
  hex: string;
  lightTextHex: string;
  fgOnAccent: '#07090F' | '#FFFFFF';
  labels: Record<LanguageCode, string>;
}

export interface QuickLink {
  id: string;
  title: string;
  url: string;
}

export type LanguageCode = 'it' | 'en' | 'fr' | 'de' | 'es';
export type JurisdictionCode = 'IT' | 'EU' | 'UK' | 'US' | 'GLOBAL';

export interface LocaleRegionOption {
  id: string;
  lang: LanguageCode;
  jurisdiction: JurisdictionCode;
  shortLabel: string;
  fullLabel: string;
}

export interface ConsentState {
  decided: boolean;
  necessary: true;
  functionalExternal: boolean;
  analytics: boolean;
  doNotSellOrShare: boolean;
  gpcDetected: boolean;
  updatedAt: string | null;
}

export interface SearchSuggestion {
  text: string;
  kind: 'history' | 'search' | 'url';
}

export interface LegalSection {
  id: string;
  number: string;
  title: string;
  body: string;
  hasCookieControls?: boolean;
  hasUsPrivacyControls?: boolean;
}

export type BootPhase = 'word' | 'collapsing' | 'pop' | 'ready';

export type BotReactionType =
  | 'wink'
  | 'surprise'
  | 'glance'
  | 'sleepy'
  | 'think'
  | 'happy'
  | 'judge'
  | 'perplexed'
  | 'curious'
  | 'peek'
  | 'content';

export type OrbPresenceState = 'awake' | 'away-serious' | 'sleeping' | 'waking-happy';

export type OrbitUiSoundType =
  | 'menu-open'
  | 'menu-close'
  | 'clear-history'
  | 'quicklink-tap'
  | 'standby-enter';

export type ToneSpec = [
  freqStart: number,
  durationSec: number,
  freqEnd?: number,
  gainPeak?: number,
  delayMs?: number,
];

export interface OrbAudioProfile {
  reactions: Record<BotReactionType, ToneSpec[]>;
  presence: Record<Exclude<OrbPresenceState, 'awake'>, ToneSpec[]>;
  ui: Record<OrbitUiSoundType, ToneSpec[]>;
}

export interface OrbPoseTarget {
  dx: number;
  dy: number;
  tRot: number;
  tScX: number;
  tScY: number;
  tLW: number;
  tLH: number;
  tRW: number;
  tRH: number;
  tLY: number;
  tRY: number;
  tArcBottom: number;
  tLFlatTop: number;
  tRFlatTop: number;
  tLTBias: number;
  tRTBias: number;
  tBobY: number;
  followPointerLive: boolean;
  allowNaturalBlink: boolean;
}

export interface OrbSoundCue {
  channel: 'reaction' | 'presence';
  id: string;
  ambient: boolean;
}

export interface OrbStepEvent {
  kind: 'click' | 'signal';
  reactionType?: BotReactionType;
  dir?: number;
  silent?: boolean;
  nonce?: number;
}

export interface OrbStepRequest {
  sessionId: string;
  variant: 'main' | 'mini';
  nowMs: number;
  botSize: number;
  bootReady: boolean;
  menuOpen: boolean;
  standbyMode: boolean;
  hasQuery: boolean;
  isFocused: boolean;
  caretRatio: number;
  drag: boolean;
  reduceMotion: boolean;
  isTouchMode: boolean;
  pointerOutside: boolean;
  pointerDx: number;
  pointerDy: number;
  lastActivityAgoMs: number;
  lastPtrAgoMs: number;
  event?: OrbStepEvent | null;
}

export interface OrbStepResponse {
  presenceState: OrbPresenceState;
  activeReaction: string;
  thinkActive: boolean;
  stopAllAnimations: boolean;
  poseTarget: OrbPoseTarget;
  soundCue: OrbSoundCue | null;
}

export type WeatherConditionKey = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';

export interface WeatherData {
  city: string;
  tempC: number;
  weatherCode: number;
  conditionKey: WeatherConditionKey;
  isDay: boolean;
}
