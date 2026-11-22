import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Moon,
  Sun,
} from 'lucide-react';
import { UiDictionary } from '../i18n/translations';
import type { LanguageCode, WeatherConditionKey, WeatherData } from '../types/orbit';

interface StandbyOverlayProps {
  active: boolean;
  lang: LanguageCode;
  dict: UiDictionary;
  onExit: () => void;
}

const WEATHER_ICONS: Record<WeatherConditionKey, typeof Sun> = {
  clear: Sun,
  cloudy: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

function getWeatherLabel(key: WeatherConditionKey, dict: UiDictionary): string {
  switch (key) {
    case 'clear':
      return dict.weatherClear;
    case 'cloudy':
      return dict.weatherCloudy;
    case 'fog':
      return dict.weatherFog;
    case 'rain':
      return dict.weatherRain;
    case 'snow':
      return dict.weatherSnow;
    case 'storm':
      return dict.weatherStorm;
    default:
      return dict.weatherCloudy;
  }
}

export const StandbyOverlay = memo(function StandbyOverlay({
  active,
  lang,
  dict,
  onExit,
}: StandbyOverlayProps) {
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Live 1-second clock update while Standby Mode is active
  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [active]);

  // Fetch local weather once upon entering Standby Mode (Open-Meteo keyless via backend)
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const tz =
      typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Europe/Rome';
    fetch(`/api/weather?tz=${encodeURIComponent(tz)}`)
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as WeatherData;
      })
      .then((data) => {
        if (!cancelled && data) setWeather(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active]);

  const localeTag = lang === 'it' ? 'it-IT' : lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-US';
  const bigTime = new Intl.DateTimeFormat(localeTag, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  const dateSubText = new Intl.DateTimeFormat(localeTag, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);

  const WeatherIcon =
    weather?.conditionKey === 'clear' && !weather.isDay
      ? Moon
      : weather
        ? WEATHER_ICONS[weather.conditionKey]
        : Sun;

  return (
    <AnimatePresence>
      {active && (
        <div
          data-testid="standby-overlay"
          onClick={onExit}
          className="fixed inset-0 z-25 cursor-pointer"
          style={{ pointerEvents: active ? 'auto' : 'none' }}
        >
          <motion.div
            initial={{ opacity: 0, x: 28, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{
              opacity: 0,
              x: 18,
              scale: 0.99,
              transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
            }}
            transition={{ duration: 0.56, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            style={{ willChange: 'transform, opacity' }}
            className="absolute left-[50%] right-8 lg:right-16 top-1/2 -translate-y-1/2 flex flex-col items-start justify-center pl-4 md:pl-8 select-none"
          >
            {/* Giant primary time that Orbit gazes directly at */}
            <time
              data-testid="standby-clock-main"
              dateTime={now.toISOString()}
              className="font-display font-bold tabular-nums leading-[0.94] tracking-[-0.045em]"
              style={{
                fontSize: 'clamp(74px, 11.5vw, 156px)',
                color: 'var(--fg)',
              }}
            >
              {bigTime}
            </time>

            {/* Smaller date + local weather right below (time is not repeated) */}
            <div
              data-testid="standby-subinfo"
              className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] md:text-[17px] font-medium"
              style={{ color: 'var(--mut)' }}
            >
              <span data-testid="standby-date-sub" className="capitalize">
                {dateSubText}
              </span>

              {weather && (
                <>
                  <span aria-hidden="true" className="opacity-35">
                    ·
                  </span>
                  <span
                    data-testid="standby-weather"
                    className="inline-flex items-center gap-2 font-semibold"
                    style={{ color: 'var(--fg)' }}
                  >
                    <WeatherIcon
                      className="w-4 h-4 shrink-0"
                      style={{ color: 'var(--acc-text)' }}
                      aria-hidden="true"
                    />
                    <span className="tabular-nums">{weather.tempC}°C</span>
                    <span className="font-medium" style={{ color: 'var(--mut)' }}>
                      {weather.city} · {getWeatherLabel(weather.conditionKey, dict)}
                    </span>
                  </span>
                </>
              )}
            </div>

            <p
              className="mt-7 text-xs font-medium tracking-[0.02em] opacity-55"
              style={{ color: 'var(--mut)' }}
            >
              {dict.standbyExitHint}
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
