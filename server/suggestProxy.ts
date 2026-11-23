import type { LanguageCode } from '../src/types/orbit.ts';

const ALLOWED_LANGS = new Set<LanguageCode>(['it', 'en', 'fr', 'de', 'es']);
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

interface CacheEntry {
  expiresAt: number;
  items: string[];
}

const cache = new Map<string, CacheEntry>();

function normalizeLang(raw: unknown): LanguageCode {
  if (typeof raw === 'string' && ALLOWED_LANGS.has(raw as LanguageCode)) {
    return raw as LanguageCode;
  }
  return 'en';
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 1500): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OrbitSearch/1.0 (+https://github.com)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGoogleSuggest(query: string, lang: LanguageCode): Promise<string[]> {
  const encoded = encodeURIComponent(query);
  // Free, unlimited, keyless public Firefox client endpoint on Google Suggest
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=${lang}&q=${encoded}`;
  const data = await fetchJsonWithTimeout(url);
  if (!Array.isArray(data) || !Array.isArray(data[1])) return [];
  return data[1].filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

async function fetchDuckDuckGoSuggest(query: string): Promise<string[]> {
  const encoded = encodeURIComponent(query);
  // Free, unlimited, keyless DuckDuckGo autocomplete list endpoint
  const url = `https://duckduckgo.com/ac/?q=${encoded}&type=list`;
  const data = await fetchJsonWithTimeout(url);
  if (!Array.isArray(data)) return [];
  if (typeof data[0] === 'string' && Array.isArray(data[1])) {
    return data[1].filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  return data
    .map((item) =>
      item && typeof item === 'object' && 'phrase' in item
        ? String((item as { phrase: unknown }).phrase).trim()
        : ''
    )
    .filter(Boolean);
}

export async function fetchFreeUnlimitedSuggestions(
  rawQuery: unknown,
  rawLang: unknown
): Promise<string[]> {
  const query = typeof rawQuery === 'string' ? rawQuery.trim().slice(0, 120) : '';
  if (!query) return [];
  const lang = normalizeLang(rawLang);
  const key = `${lang}:${query.toLowerCase()}`;
  const now = Date.now();

  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.items;
  }

  // Query both free unlimited services in parallel and prefer DuckDuckGo + Google deduplicated results
  const [ddgResult, googleResult] = await Promise.allSettled([
    fetchDuckDuckGoSuggest(query),
    fetchGoogleSuggest(query, lang),
  ]);

  const ddgList = ddgResult.status === 'fulfilled' ? ddgResult.value : [];
  const googleList = googleResult.status === 'fulfilled' ? googleResult.value : [];

  const merged: string[] = [];
  const seen = new Set<string>([query.toLowerCase()]);
  for (const candidate of [...ddgList, ...googleList]) {
    const clean = candidate.trim();
    const lc = clean.toLowerCase();
    if (!clean || seen.has(lc)) continue;
    seen.add(lc);
    merged.push(clean);
    if (merged.length >= 6) break;
  }

  if (cache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  if (merged.length > 0) {
    cache.set(key, { expiresAt: now + CACHE_TTL_MS, items: merged });
  }
  return merged;
}
