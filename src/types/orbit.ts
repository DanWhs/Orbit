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
  supportMode?: boolean;
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
  lastTypedAgoMs?: number;
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

export type MotionPreference = 'system' | 'reduce' | 'full';
export type TextScaleMode = 'normal' | 'large' | 'xlarge';
export type ColorFilterMode = 'none' | 'grayscale' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface AccessibilityPreferences {
  motionMode: MotionPreference;
  highContrast: boolean;
  largeText: boolean;
  textScale: TextScaleMode;
  focusRings: boolean;
  reduceTransparency: boolean;
  underlineLinks: boolean;
  dyslexiaFont: boolean;
  relaxedSpacing: boolean;
  largeTargets: boolean;
  colorFilter: ColorFilterMode;
  readingGuide: boolean;
  screenReaderHints: boolean;
}

export type DiagnosticLevel = 'info' | 'warn' | 'error';
export type DiagnosticSource = 'server' | 'client' | 'ai' | 'network';

export interface DiagnosticEntry {
  id: string;
  ts: string;
  level: DiagnosticLevel;
  source: DiagnosticSource;
  event: string;
  message: string;
  statusCode?: number;
  durationMs?: number;
}

export interface DiagnosticsSnapshot {
  serverStartedAt: string;
  uptimeSec: number;
  nodeVersion: string;
  platform: string;
  memoryRssMb: number;
  heapUsedMb: number;
  totalRecorded: number;
  entries: DiagnosticEntry[];
}

export interface HealthProbeResult {
  id: string;
  label: string;
  ok: boolean;
  latencyMs: number;
  detail: string;
}

export type FeedbackCategory = 'bug' | 'idea' | 'ux' | 'praise';

export interface FeedbackEntry {
  id: string;
  createdAt: string;
  dayKey: string;
  category: FeedbackCategory;
  rating: number;
  message: string;
  contactEmail?: string;
  lang: LanguageCode;
  includedInDigestAt?: string | null;
}

export interface FeedbackDigestSummary {
  dayKey: string;
  toEmail: string;
  countToday: number;
  totalCount: number;
  averageRating: number;
  autoEmailConfigured: boolean;
  webhookConfigured: boolean;
  lastAutoDispatchAt: string | null;
  digestText: string;
  entries: FeedbackEntry[];
}

export type GeminiChatModelId =
  | 'gemini-4-hydrogen'
  | 'gemini-3.1-flash-lite'
  | 'gemini-4-neon'
  | 'gemini-4-carbon';

export type GeminiRoleId = 'auto' | 'assistant' | 'fast' | 'interactive' | 'reasoning';

export type ImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface AiStatusResponse {
  connected: boolean;
  maskedHint: string | null;
  layersActive: number;
}

export interface AiAskResponse {
  answer: string;
  model: GeminiChatModelId;
  roleUsed: Exclude<GeminiRoleId, 'auto'>;
}

export interface AiImageResponse {
  imageUrl: string;
  text?: string;
  model: 'gemini-nano-banana-2.1';
}

export interface AiChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
  needKey?: boolean;
  model?: string;
  roleBadge?: Exclude<GeminiRoleId, 'auto'>;
  imageUrl?: string;
  sourceImageUrl?: string;
  mode?: 'chat' | 'image';
}

export interface ChangelogEntry {
  version: string;
  dateLabel: string;
  title: string;
  isCurrent?: boolean;
  items: string[];
}

export interface SupportPillar {
  title: string;
  desc: string;
}

export interface DonationPromptState {
  dismissedCount: number;
  neverShow: boolean;
  lastShownAt: number;
  donatedClicked: boolean;
}

export interface AmbientGlowState {
  x1Pct: number;
  y1Pct: number;
  x2Pct: number;
  y2Pct: number;
  cxPct: number;
  cyPct: number;
  alpha1Light: number;
  alpha2Light: number;
  alphaCenterLight: number;
  alpha1Dark: number;
  alpha2Dark: number;
  alphaCenterDark: number;
}

