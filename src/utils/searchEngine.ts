import { SearchSuggestion } from '../types/orbit';
import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from './storage';

export interface SearchEngineInfo {
  name: string;
  searchUrl: string;
}

const suggestionCache = new Map<string, string[]>();

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

export function getSearchHistory(): string[] {
  const raw = readStorage<unknown>(STORAGE_KEYS.history, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export function saveSearchHistory(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  const next = [trimmed, ...getSearchHistory().filter((item) => item !== trimmed)].slice(0, 30);
  writeStorage(STORAGE_KEYS.history, next);
}

export function clearSearchHistory(): void {
  removeStorage(STORAGE_KEYS.history);
  removeStorage('orbit_history');
  removeStorage('bs_h');
  removeStorage('search_history');
  suggestionCache.clear();
}

export function getHistorySuggestions(): SearchSuggestion[] {
  return getSearchHistory()
    .slice(0, 2)
    .map((text) => ({ text, kind: 'history' }));
}

export function buildSuggestions(
  query: string,
  networkSuggestions: string[]
): SearchSuggestion[] {
  const trimmed = query.trim();
  if (!trimmed) return getHistorySuggestions();

  const lower = trimmed.toLowerCase();
  const out: SearchSuggestion[] = [];
  const add = (text: string | undefined, kind: SearchSuggestion['kind']) => {
    if (
      out.length < 3 &&
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

  add(
    getSearchHistory().find((item) => item.toLowerCase().startsWith(lower)),
    'history'
  );
  for (const s of networkSuggestions) {
    add(s, 'search');
  }

  return out;
}

export async function fetchExternalSuggestions(
  query: string,
  lang: string,
  allowExternal: boolean
): Promise<string[] | null> {
  // Preventive blocking: do not request autocomplete suggestions unless user opted into functionalExternal
  if (!allowExternal) return null;

  const trimmed = query.trim();
  if (!trimmed) return null;

  const key = `${lang}:${trimmed.toLowerCase()}`;
  const cached = suggestionCache.get(key);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  try {
    const res = await fetch(
      `/api/suggest?q=${encodeURIComponent(trimmed)}&lang=${encodeURIComponent(lang)}`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { suggestions?: unknown };
    const list = Array.isArray(data?.suggestions)
      ? data.suggestions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      : [];
    if (list.length > 0) {
      suggestionCache.set(key, list);
      return list;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function resolveDestinationUrl(query: string, engine: SearchEngineInfo): string {
  const trimmed = query.trim();
  if (isLikelyUrl(trimmed)) {
    return /^https?:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
  return `${engine.searchUrl}${encodeURIComponent(trimmed)}`;
}
