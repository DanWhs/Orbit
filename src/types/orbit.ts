export type ThemeMode = 'dark' | 'light';

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
