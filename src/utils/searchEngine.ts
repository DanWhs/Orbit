import { LanguageCode, SearchSuggestion } from '../types/orbit';
import { readStorage, STORAGE_KEYS, writeStorage } from './storage';

export interface SearchEngineInfo {
  name: string;
  searchUrl: string;
}

const LOCAL_SUFFIXES: Record<LanguageCode, string[]> = {
  it: ['significato', 'traduzione', 'cos’è', 'prezzo', 'recensioni', 'wikipedia', 'news', 'mappa'],
  en: ['meaning', 'definition', 'translate', 'reviews', 'wikipedia', 'news', 'map', 'guide'],
  fr: ['définition', 'traduction', 'prix', 'avis', 'wikipédia', 'actualités', 'carte', 'guide'],
  de: ['bedeutung', 'übersetzung', 'preis', 'bewertung', 'wikipedia', 'nachrichten', 'karte', 'guide'],
  es: ['significado', 'traducción', 'precio', 'reseñas', 'wikipedia', 'noticias', 'mapa', 'guía'],
};

const suggestionCache = new Map<string, string[]>();
let consecutiveFailures = 0;

export function detectSearchEngine(): SearchEngineInfo {
  if (typeof navigator === 'undefined') {
    return { name: 'Google', searchUrl: 'https://www.google.com/search?q=' };
  }
  const ua = navigator.userAgent;
  if (/EdgA?\/|Edg\//.test(ua)) {
    return { name: 'Bing', searchUrl: 'https://www.bing.com/search?q=' };
  }
  if (/DuckDuckGo/i.test(ua)) {
    return { name: 'DuckDuckGo', searchUrl: 'https://duckduckgo.com/?q=' };
  }
  return { name: 'Google', searchUrl: 'https://www.google.com/search?q=' };
}

export function isLikelyUrl(input: string): boolean {
  const trimmed = input.trim();
  return (
    /^https?:\/\/\S+$/i.test(trimmed) ||
    /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(trimmed)
  );
}

function hashString(s: string): number {
  let h = 0;
  for (const ch of s) {
    h = (h * 31 + ch.charCodeAt(0)) | 0;
  }
  return Math.abs(h);
}

export function getSearchHistory(): string[] {
  return readStorage<string[]>(STORAGE_KEYS.history, []);
}

export function saveSearchHistory(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  const next = [trimmed, ...getSearchHistory().filter((item) => item !== trimmed)].slice(0, 30);
  writeStorage(STORAGE_KEYS.history, next);
}

export function clearSearchHistory(): void {
  writeStorage(STORAGE_KEYS.history, []);
}

export function getHistorySuggestions(): SearchSuggestion[] {
  return getSearchHistory()
    .slice(0, 2)
    .map((text) => ({ text, kind: 'history' }));
}

export function buildSuggestions(
  query: string,
  networkSuggestions: string[],
  lang: LanguageCode
): SearchSuggestion[] {
  const trimmed = query.trim();
  if (!trimmed) return getHistorySuggestions();

  const lower = trimmed.toLowerCase();
  const out: SearchSuggestion[] = [];
  const add = (text: string | undefined, kind: SearchSuggestion['kind']) => {
    if (
      out.length < 2 &&
      text &&
      text.toLowerCase() !== lower &&
      !out.some((item) => item.text.toLowerCase() === text.toLowerCase())
    ) {
      out.push({ text, kind });
    }
  };

  if (isLikelyUrl(trimmed)) {
    out.push({ text: trimmed, kind: 'url' });
  }

  add(networkSuggestions[0], 'search');
  add(
    getSearchHistory().find((item) => item.toLowerCase().startsWith(lower)),
    'history'
  );
  add(networkSuggestions[1], 'search');
  add(networkSuggestions[2], 'search');

  const suffixes = LOCAL_SUFFIXES[lang] ?? LOCAL_SUFFIXES.en;
  const startIndex = hashString(lower);
  for (let i = 0; i < suffixes.length && out.length < 2; i++) {
    add(`${trimmed} ${suffixes[(startIndex + i) % suffixes.length]}`, 'search');
  }

  return out;
}

async function fetchJsonWithTimeout<T>(url: string, pick: (data: unknown) => T | null): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1400);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return pick(data);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchExternalSuggestions(
  query: string,
  lang: LanguageCode,
  allowExternal: boolean
): Promise<string[] | null> {
  // Preventive blocking: do not contact third-party suggestion APIs unless user opted into functionalExternal
  if (!allowExternal) return null;

  const key = `${lang}:${query.toLowerCase()}`;
  const cached = suggestionCache.get(key);
  if (cached) return cached;
  if (consecutiveFailures >= 2) return null;

  const encoded = encodeURIComponent(query);
  const providers: Array<() => Promise<string[] | null>> = [
    () =>
      fetchJsonWithTimeout<string[]>(
        `https://en.wikipedia.org/w/api.php?action=opensearch&limit=3&format=json&origin=*&search=${encoded}`.replace(
          'https://en.',
          `https://${lang === 'it' || lang === 'fr' || lang === 'de' || lang === 'es' ? lang : 'en'}.`
        ),
        (d) => (Array.isArray(d) && Array.isArray(d[1]) ? (d[1] as string[]) : null)
      ),
    () =>
      fetchJsonWithTimeout<string[]>(
        `https://duckduckgo.com/ac/?q=${encoded}`,
        (d) => {
          if (!Array.isArray(d)) return null;
          if (typeof d[0] === 'string' && Array.isArray(d[1])) return d[1] as string[];
          return d
            .map((x) => (x && typeof x === 'object' && 'phrase' in x ? String((x as { phrase: unknown }).phrase) : ''))
            .filter(Boolean);
        }
      ),
  ];

  for (const run of providers) {
    const result = await run();
    if (result && result.length > 0) {
      consecutiveFailures = 0;
      suggestionCache.set(key, result);
      return result;
    }
  }
  consecutiveFailures++;
  return null;
}

export function resolveDestinationUrl(query: string, engine: SearchEngineInfo): string {
  const trimmed = query.trim();
  if (isLikelyUrl(trimmed)) {
    return /^https?:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
  return `${engine.searchUrl}${encodeURIComponent(trimmed)}`;
}
