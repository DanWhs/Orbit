function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export interface AwaySeriousMotion {
  dx: number;
  dy: number;
  rot: number;
  leftHeightMul: number;
  rightHeightMul: number;
  breath: number;
  bobY: number;
}

/**
 * Generates subtle, alive skeptical micro-motion when the cursor leaves the frame ("seriously?").
 * Keeps the deadpan flat-top stare directed at the user while adding impatient glances,
 * asymmetrical lid tension, occasional slow blinks, and gentle breathing.
 */
export function computeAwaySeriousMotion(
  nowMs: number,
  enteredAtMs: number,
  botSize: number
): AwaySeriousMotion {
  const elapsed = Math.max(0, nowMs - enteredAtMs);
  const cycleMs = elapsed % 2600;
  let blinkDip = 0;
  if (cycleMs >= 1750 && cycleMs <= 2070) {
    const bp = (cycleMs - 1750) / 320;
    blinkDip = Math.sin(bp * Math.PI) * 0.56;
  }

  const dx = Math.sin(elapsed * 0.00145) * 0.14 + Math.sin(elapsed * 0.0032) * 0.025;
  const dy = -0.02 + Math.cos(elapsed * 0.0019) * 0.04;
  const rot = -2.4 + Math.sin(elapsed * 0.00165) * 1.15;

  const baseSquint = 1 - blinkDip;
  const leftHeightMul = clamp((0.44 + Math.sin(elapsed * 0.0026) * 0.045) * baseSquint, 0.1, 0.7);
  const rightHeightMul = clamp((0.44 + Math.sin(elapsed * 0.0026 + 0.9) * 0.035) * baseSquint, 0.1, 0.7);

  return {
    dx,
    dy,
    rot,
    leftHeightMul,
    rightHeightMul,
    breath: Math.sin(nowMs * 0.0019) * 0.72,
    bobY: Math.sin(nowMs * 0.00145) * botSize * 0.0075,
  };
}

export interface SleepingMotion {
  dx: number;
  dy: number;
  rot: number;
  lidHeightMul: number;
  lidY: number;
  breath: number;
  bobY: number;
}

/**
 * Generates calm, organic breathing and tiny dream-drift while Orbit is asleep with Zzz.
 */
export function computeSleepingMotion(nowMs: number, botSize: number): SleepingMotion {
  const phase = nowMs * 0.00155;
  const inhale = Math.sin(phase);
  return {
    dx: Math.sin(nowMs * 0.00075) * 0.065,
    dy: 0.16 + inhale * 0.035,
    rot: -3.8 + Math.sin(phase - 0.4) * 1.3,
    lidHeightMul: 0.125 + Math.max(0, inhale) * 0.035,
    lidY: botSize * (0.042 + inhale * 0.0045),
    breath: inhale * 1.15,
    bobY: Math.sin(phase - 0.6) * botSize * 0.011,
  };
}

export interface WakingHappyMotion {
  rotOffset: number;
  widthMul: number;
  heightMul: number;
  eyeBounceY: number;
  gazeJitterDx: number;
  gazeJitterDy: number;
}

/**
 * Adds a cheerful wake-up eye shimmer & head bounce while Orb greets the returning pointer.
 */
export function computeWakingHappyMotion(
  nowMs: number,
  enteredAtMs: number,
  durationMs: number,
  botSize: number
): WakingHappyMotion {
  const p = clamp((nowMs - enteredAtMs) / Math.max(1, durationMs), 0, 1);
  const bounce = Math.sin(p * Math.PI * 3);
  return {
    rotOffset: Math.sin(p * Math.PI * 3) * 2.2,
    widthMul: 1.25 + Math.cos(p * Math.PI * 3.5) * 0.04,
    heightMul: 0.54 + Math.sin(p * Math.PI * 3.5) * 0.05,
    eyeBounceY: -Math.abs(bounce) * botSize * 0.012,
    gazeJitterDx: Math.sin(p * Math.PI * 4) * 0.035,
    gazeJitterDy: Math.cos(p * Math.PI * 4) * 0.025,
  };
}
