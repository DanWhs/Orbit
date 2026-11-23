import type { AmbientGlowState } from '../src/types/orbit.ts';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Proprietary Orbit backend atmospheric glow choreography.
 * Toned slightly softer than static 0.16/0.14/0.11 & 0.18/0.15/0.12 presets,
 * gently drifting and breathing over slow organic cycles while respecting reduced motion.
 */
export function computeAmbientGlow(nowMs: number, reduceMotion: boolean): AmbientGlowState {
  if (reduceMotion || !Number.isFinite(nowMs)) {
    return {
      x1Pct: 19,
      y1Pct: 19,
      x2Pct: 81,
      y2Pct: 81,
      cxPct: 50,
      cyPct: 43,
      alpha1Light: 0.112,
      alpha2Light: 0.095,
      alphaCenterLight: 0.072,
      alpha1Dark: 0.128,
      alpha2Dark: 0.106,
      alphaCenterDark: 0.082,
    };
  }

  const t = nowMs * 0.001;
  const wave1 = Math.sin(t * 0.28);
  const wave2 = Math.cos(t * 0.22 + 1.1);
  const wave3 = Math.sin(t * 0.17 + 2.4);
  const breath = Math.sin(t * 0.36);

  return {
    x1Pct: round2(19 + wave1 * 4.2),
    y1Pct: round2(19 + wave2 * 3.8),
    x2Pct: round2(81 - wave2 * 4.5),
    y2Pct: round2(81 - wave1 * 3.6),
    cxPct: round2(50 + wave3 * 3.4),
    cyPct: round2(43 + Math.cos(t * 0.24) * 3.1),
    alpha1Light: round3(0.112 + breath * 0.016),
    alpha2Light: round3(0.096 + Math.sin(t * 0.31 + 1.4) * 0.014),
    alphaCenterLight: round3(0.072 + Math.cos(t * 0.29 + 0.6) * 0.011),
    alpha1Dark: round3(0.128 + breath * 0.018),
    alpha2Dark: round3(0.108 + Math.sin(t * 0.31 + 1.4) * 0.015),
    alphaCenterDark: round3(0.082 + Math.cos(t * 0.29 + 0.6) * 0.012),
  };
}
