import { AccentId, ConsentState, QuickLink, ThemeMode } from '../types/orbit';

export const STORAGE_KEYS = {
  theme: 'orbit_theme_v1',
  accent: 'orbit_accent_v1',
  quickLinks: 'orbit_quick_links_v1',
  history: 'orbit_history_v1',
  localeRegion: 'orbit_locale_region_v1',
  i18nCache: 'orbit_i18n_cache_v1',
  consent: 'orbit_consent_v1',
} as const;

export const MAX_QUICK_LINKS = 4;

export const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { id: 'ql-youtube', title: 'YouTube', url: 'https://www.youtube.com/' },
  { id: 'ql-gmail', title: 'Gmail', url: 'https://mail.google.com/' },
  { id: 'ql-maps', title: 'Maps', url: 'https://maps.google.com/' },
  { id: 'ql-wikipedia', title: 'Wikipedia', url: 'https://it.wikipedia.org/' },
];

export function readStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or private-mode errors gracefully
  }
}

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidQuickLinkInput(title: string, url: string): boolean {
  const cleanTitle = title.trim();
  const normalized = normalizeUrl(url);
  if (!cleanTitle || !normalized) return false;
  try {
    const parsed = new URL(normalized);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

export function sanitizeQuickLinks(links: unknown): QuickLink[] {
  if (!Array.isArray(links)) return DEFAULT_QUICK_LINKS;
  const cleaned: QuickLink[] = [];
  for (const item of links) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Partial<QuickLink>;
    const title = typeof candidate.title === 'string' ? candidate.title.trim().slice(0, 32) : '';
    const url = typeof candidate.url === 'string' ? normalizeUrl(candidate.url) : '';
    if (isValidQuickLinkInput(title, url)) {
      cleaned.push({
        id: typeof candidate.id === 'string' && candidate.id ? candidate.id : `ql-${cleaned.length}-${Date.now()}`,
        title,
        url,
      });
    }
    if (cleaned.length >= MAX_QUICK_LINKS) break;
  }
  return cleaned;
}

export function getInitialTheme(): ThemeMode {
  const saved = readStorage<ThemeMode | null>(STORAGE_KEYS.theme, null);
  if (saved === 'dark' || saved === 'light') return saved;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'dark';
}

export function getInitialAccent(): AccentId {
  return readStorage<AccentId>(STORAGE_KEYS.accent, 'neon-orange');
}

export function detectGpcSignal(): boolean {
  if (typeof navigator === 'undefined') return false;
  return Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl);
}

export function getInitialConsent(): ConsentState {
  const gpc = detectGpcSignal();
  const saved = readStorage<ConsentState | null>(STORAGE_KEYS.consent, null);
  if (saved && typeof saved === 'object') {
    return {
      decided: Boolean(saved.decided),
      necessary: true,
      functionalExternal: gpc ? false : Boolean(saved.functionalExternal),
      analytics: gpc ? false : Boolean(saved.analytics),
      doNotSellOrShare: gpc ? true : Boolean(saved.doNotSellOrShare),
      gpcDetected: gpc,
      updatedAt: saved.updatedAt ?? null,
    };
  }
  return {
    decided: false,
    necessary: true,
    functionalExternal: false,
    analytics: false,
    doNotSellOrShare: gpc,
    gpcDetected: gpc,
    updatedAt: null,
  };
}
