import type { WeatherConditionKey, WeatherData } from '../src/types/orbit.ts';

interface GeoCoords {
  city: string;
  lat: number;
  lon: number;
}

const TZ_COORDS: Record<string, GeoCoords> = {
  'europe/rome': { city: 'Roma', lat: 41.9028, lon: 12.4964 },
  'europe/milan': { city: 'Milano', lat: 45.4642, lon: 9.19 },
  'europe/london': { city: 'London', lat: 51.5074, lon: -0.1278 },
  'europe/paris': { city: 'Paris', lat: 48.8566, lon: 2.3522 },
  'europe/berlin': { city: 'Berlin', lat: 52.52, lon: 13.405 },
  'europe/madrid': { city: 'Madrid', lat: 40.4168, lon: -3.7038 },
  'europe/zurich': { city: 'Zurich', lat: 47.3769, lon: 8.5417 },
  'europe/amsterdam': { city: 'Amsterdam', lat: 52.3676, lon: 4.9041 },
  'america/new_york': { city: 'New York', lat: 40.7128, lon: -74.006 },
  'america/chicago': { city: 'Chicago', lat: 41.8781, lon: -87.6298 },
  'america/denver': { city: 'Denver', lat: 39.7392, lon: -104.9903 },
  'america/los_angeles': { city: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  'america/sao_paulo': { city: 'São Paulo', lat: -23.5505, lon: -46.6333 },
  'asia/tokyo': { city: 'Tokyo', lat: 35.6762, lon: 139.6503 },
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const weatherCache = new Map<string, { expiresAt: number; data: WeatherData }>();

function mapWmoToCondition(code: number): WeatherConditionKey {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95 && code <= 99) return 'storm';
  return 'cloudy';
}

function isPublicIp(ip: string): boolean {
  const clean = ip.replace(/^::ffff:/, '').trim();
  if (!clean) return false;
  if (
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    clean.startsWith('172.16.') ||
    clean.startsWith('172.17.') ||
    clean.startsWith('172.18.') ||
    clean.startsWith('172.19.') ||
    clean.startsWith('172.2') ||
    clean.startsWith('172.30.') ||
    clean.startsWith('172.31.') ||
    clean.startsWith('fc') ||
    clean.startsWith('fd')
  ) {
    return false;
  }
  return /^[0-9a-fA-F.:]{3,45}$/.test(clean);
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 1800): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveCoords(clientIp: string, timeZone: string): Promise<GeoCoords> {
  const cleanIp = clientIp.replace(/^::ffff:/, '').trim();
  if (isPublicIp(cleanIp)) {
    const geo = await fetchJsonWithTimeout(
      `https://get.geojs.io/v1/ip/geo/${encodeURIComponent(cleanIp)}.json`
    );
    if (geo && typeof geo === 'object') {
      const rec = geo as { city?: unknown; latitude?: unknown; longitude?: unknown };
      const lat = Number(rec.latitude);
      const lon = Number(rec.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return {
          city: typeof rec.city === 'string' && rec.city.trim() ? rec.city.trim() : timeZone.split('/').pop()?.replace(/_/g, ' ') || 'Local',
          lat,
          lon,
        };
      }
    }
  }

  const tzKey = timeZone.toLowerCase();
  if (TZ_COORDS[tzKey]) {
    return TZ_COORDS[tzKey];
  }

  // Fallback city label inferred from timezone
  return TZ_COORDS['europe/rome'];
}

export async function getLocalWeather(clientIp: string, rawTz: unknown): Promise<WeatherData> {
  const tz =
    typeof rawTz === 'string' && /^[A-Za-z_]+\/[A-Za-z0-9_+-]+$/.test(rawTz.trim())
      ? rawTz.trim()
      : 'Europe/Rome';
  const coords = await resolveCoords(clientIp, tz);
  const cacheKey = `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}`;
  const now = Date.now();
  const hit = weatherCache.get(cacheKey);
  if (hit && hit.expiresAt > now) {
    return hit.data;
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat.toFixed(4)}&longitude=${coords.lon.toFixed(4)}&current=temperature_2m,weather_code,is_day&timezone=auto`;
  const raw = await fetchJsonWithTimeout(url, 2200);

  let tempC = 18;
  let weatherCode = 1;
  let isDay = true;
  if (raw && typeof raw === 'object' && 'current' in raw) {
    const cur = (raw as { current?: { temperature_2m?: unknown; weather_code?: unknown; is_day?: unknown } }).current;
    if (cur) {
      if (typeof cur.temperature_2m === 'number' && Number.isFinite(cur.temperature_2m)) {
        tempC = Math.round(cur.temperature_2m);
      }
      if (typeof cur.weather_code === 'number' && Number.isFinite(cur.weather_code)) {
        weatherCode = cur.weather_code;
      }
      if (typeof cur.is_day === 'number') {
        isDay = cur.is_day === 1;
      }
    }
  }

  const data: WeatherData = {
    city: coords.city,
    tempC,
    weatherCode,
    conditionKey: mapWmoToCondition(weatherCode),
    isDay,
  };
  weatherCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, data });
  return data;
}
