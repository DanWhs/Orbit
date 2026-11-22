import { AccentId, AccentPreset, AccentValue } from '../types/orbit';

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: 'neon-orange',
    hex: '#FF6A00',
    lightTextHex: '#C84700',
    fgOnAccent: '#FFFFFF',
    labels: {
      it: 'Arancione Neon',
      en: 'Neon Orange',
      fr: 'Orange Néon',
      de: 'Neonorange',
      es: 'Naranja Neón',
    },
  },
  {
    id: 'neon-green',
    hex: '#22FF55',
    lightTextHex: '#0B7A28',
    fgOnAccent: '#07090F',
    labels: {
      it: 'Verde Fluo',
      en: 'Fluo Green',
      fr: 'Vert Fluo',
      de: 'Neongrün',
      es: 'Verde Flúor',
    },
  },
  {
    id: 'electric-cyan',
    hex: '#00E5FF',
    lightTextHex: '#007388',
    fgOnAccent: '#07090F',
    labels: {
      it: 'Ciano Elettrico',
      en: 'Electric Cyan',
      fr: 'Cyan Électrique',
      de: 'Elektrisches Cyan',
      es: 'Cian Eléctrico',
    },
  },
  {
    id: 'neon-magenta',
    hex: '#FF1EB4',
    lightTextHex: '#B8007A',
    fgOnAccent: '#FFFFFF',
    labels: {
      it: 'Magenta Neon',
      en: 'Neon Magenta',
      fr: 'Magenta Néon',
      de: 'Neonmagenta',
      es: 'Magenta Neón',
    },
  },
  {
    id: 'fluo-yellow',
    hex: '#E6FF00',
    lightTextHex: '#6E7A00',
    fgOnAccent: '#07090F',
    labels: {
      it: 'Giallo Fluo',
      en: 'Fluo Yellow',
      fr: 'Jaune Fluo',
      de: 'Neongelb',
      es: 'Amarillo Flúor',
    },
  },
  {
    id: 'fluo-purple',
    hex: '#A855F7',
    lightTextHex: '#7E22CE',
    fgOnAccent: '#FFFFFF',
    labels: {
      it: 'Viola Fluo',
      en: 'Fluo Purple',
      fr: 'Violet Fluo',
      de: 'Neonviolett',
      es: 'Morado Flúor',
    },
  },
  {
    id: 'cobalt-blue',
    hex: '#2979FF',
    lightTextHex: '#1554C7',
    fgOnAccent: '#FFFFFF',
    labels: {
      it: 'Blu Elettrico',
      en: 'Electric Blue',
      fr: 'Bleu Électrique',
      de: 'Elektrisches Blau',
      es: 'Azul Eléctrico',
    },
  },
  {
    id: 'laser-coral',
    hex: '#FF3B5C',
    lightTextHex: '#C41236',
    fgOnAccent: '#FFFFFF',
    labels: {
      it: 'Corallo Fluo',
      en: 'Laser Coral',
      fr: 'Corail Fluo',
      de: 'Neonkoralle',
      es: 'Coral Flúor',
    },
  },
  {
    id: 'hyper-mint',
    hex: '#00F5A0',
    lightTextHex: '#007B52',
    fgOnAccent: '#07090F',
    labels: {
      it: 'Menta Fluo',
      en: 'Hyper Mint',
      fr: 'Menthe Fluo',
      de: 'Neonminze',
      es: 'Menta Flúor',
    },
  },
  {
    id: 'solar-gold',
    hex: '#FFB800',
    lightTextHex: '#9A5B00',
    fgOnAccent: '#07090F',
    labels: {
      it: 'Oro Fluo',
      en: 'Solar Gold',
      fr: 'Or Fluo',
      de: 'Neongold',
      es: 'Oro Flúor',
    },
  },
];

export const DEFAULT_ACCENT_ID: AccentId = 'neon-orange';

export function getAccentPreset(id: AccentValue | string | null | undefined): AccentPreset {
  return ACCENT_PRESETS.find((p) => p.id === id) ?? ACCENT_PRESETS[0];
}

export function normalizeHexColor(val: string | null | undefined): `#${string}` | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(withHash)) return null;
  return withHash.toUpperCase() as `#${string}`;
}

function relativeLuminance(r: number, g: number, b: number): number {
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

export interface ResolvedAccentTokens {
  hex: string;
  lightTextHex: string;
  fgOnAccent: '#07090F' | '#FFFFFF';
  isCustom: boolean;
  presetId: AccentId | null;
}

export function resolveAccentTokens(accentValue: AccentValue | string | null | undefined): ResolvedAccentTokens {
  const matchedPreset = ACCENT_PRESETS.find((p) => p.id === accentValue);
  if (matchedPreset) {
    return {
      hex: matchedPreset.hex,
      lightTextHex: matchedPreset.lightTextHex,
      fgOnAccent: matchedPreset.fgOnAccent,
      isCustom: false,
      presetId: matchedPreset.id,
    };
  }

  const customHex = normalizeHexColor(accentValue);
  if (customHex) {
    const bigint = parseInt(customHex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    const lum = relativeLuminance(r, g, b);
    const fgOnAccent: '#07090F' | '#FFFFFF' = lum > 0.36 ? '#07090F' : '#FFFFFF';

    let lightTextHex: string = customHex;
    if (lum > 0.25) {
      const factor = Math.max(0.32, Math.min(0.75, Math.sqrt(0.24 / lum)));
      const dr = Math.round(r * factor)
        .toString(16)
        .padStart(2, '0');
      const dg = Math.round(g * factor)
        .toString(16)
        .padStart(2, '0');
      const db = Math.round(b * factor)
        .toString(16)
        .padStart(2, '0');
      lightTextHex = `#${dr}${dg}${db}`.toUpperCase();
    }

    return {
      hex: customHex,
      lightTextHex,
      fgOnAccent,
      isCustom: true,
      presetId: null,
    };
  }

  const fallback = ACCENT_PRESETS[0];
  return {
    hex: fallback.hex,
    lightTextHex: fallback.lightTextHex,
    fgOnAccent: fallback.fgOnAccent,
    isCustom: false,
    presetId: fallback.id,
  };
}

export function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return '255, 106, 0';
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}
