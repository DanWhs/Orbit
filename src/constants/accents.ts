import { AccentId, AccentPreset } from '../types/orbit';

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
];

export const DEFAULT_ACCENT_ID: AccentId = 'neon-orange';

export function getAccentPreset(id: AccentId | string | null | undefined): AccentPreset {
  return ACCENT_PRESETS.find((p) => p.id === id) ?? ACCENT_PRESETS[0];
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

