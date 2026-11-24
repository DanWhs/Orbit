import type { BotReactionType, OrbPoseTarget, OrbPresenceState } from '../types/orbit';

const DURATION_TABLE: Record<BotReactionType, number> = {
  wink: 680,
  surprise: 700,
  glance: 900,
  sleepy: 1100,
  think: 3200,
  happy: 850,
  judge: 1800,
  perplexed: 1850,
  curious: 1450,
  peek: 1250,
  content: 1150,
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function sine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function bell(t: number): number {
  return t <= 0 || t >= 1 ? 0 : sine(Math.sin(t * Math.PI));
}

function sstep(a: number, b: number, t: number): number {
  const k = clamp((t - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
}

function hold(t: number): number {
  return sstep(0, 0.16, t) * (1 - sstep(0.78, 1, t));
}

export interface LocalReactionState {
  on: boolean;
  type: BotReactionType;
  t0: number;
  dur: number;
  dir: number;
}

export function getReactionDuration(type: BotReactionType, variant: 'main' | 'mini' = 'main'): number {
  const base = DURATION_TABLE[type] ?? 750;
  return variant === 'mini' && type === 'think' ? 1800 : base;
}

/**
 * Pure local 60fps expression/pose computer mirroring the backend Orb engine.
 * Guarantees crisp, immediate click, boot-wink, typing, menu, donation, and Supporta Orb animations
 * in both local preview and stateless production web even between HTTP syncs.
 */
export function computeLocalOrbPose(params: {
  now: number;
  renderSize: number;
  tx: number;
  ty: number;
  variant: 'main' | 'mini';
  standbyMode: boolean;
  supportMode: boolean;
  menuOpen: boolean;
  hasQuery: boolean;
  isFocused: boolean;
  caretRatio: number;
  drag: boolean;
  reduceMotion: boolean;
  lastTypedAgoMs: number;
  lastPtrAgoMs: number;
  presence: OrbPresenceState;
  reaction: LocalReactionState;
  basePoseFromServer?: OrbPoseTarget | null;
  serverSyncedRecently?: boolean;
}): { pose: OrbPoseTarget; thinkActive: boolean; reactionActive: boolean } {
  const {
    now,
    renderSize: D,
    tx,
    ty,
    variant,
    standbyMode,
    supportMode,
    menuOpen,
    hasQuery,
    isFocused,
    caretRatio,
    drag,
    reduceMotion,
    lastTypedAgoMs,
    lastPtrAgoMs,
    presence,
    reaction,
  } = params;

  let rt = -1;
  if (reaction.on) {
    rt = (now - reaction.t0) / Math.max(1, reaction.dur);
    if (rt >= 1) {
      reaction.on = false;
      rt = -1;
    }
  }

  // If server just sent an authoritative sleeping/away-serious/waking-happy pose and no newer local reaction overrides it,
  // blend directly from serverPose for those presence states.
  if (
    params.basePoseFromServer &&
    params.serverSyncedRecently &&
    (presence === 'away-serious' || presence === 'sleeping' || presence === 'waking-happy') &&
    !reaction.on
  ) {
    return {
      pose: params.basePoseFromServer,
      thinkActive: false,
      reactionActive: false,
    };
  }

  const br = reduceMotion ? 0 : Math.sin(now * 0.0021);
  const supportGlance = Math.max(0, Math.sin(now * 0.00062));
  const supportDx = -0.62 * (1 - supportGlance * 0.78) + Math.sin(now * 0.0009) * 0.04;
  const supportDy = -0.02 + Math.sin(now * 0.00075) * 0.04;

  const pose: OrbPoseTarget = {
    dx: standbyMode
      ? 0.84 + Math.sin(now * 0.00055) * 0.025
      : supportMode
        ? supportDx
        : tx,
    dy: standbyMode
      ? -0.02 + Math.sin(now * 0.00072) * 0.022
      : supportMode
        ? supportDy
        : ty,
    tRot:
      variant === 'mini'
        ? reduceMotion
          ? 0
          : Math.sin(now * 0.001) * 1.1
        : presence === 'awake' && !menuOpen && !reduceMotion && !reaction.on
          ? supportMode
            ? -2.2 + Math.sin(now * 0.00095) * 1.6
            : Math.sin(now * 0.00085) * 1.45
          : 0,
    tScX: 1 + br * 0.006,
    tScY: 1 - br * 0.006,
    tLW: 1,
    tLH: 1,
    tRW: 1,
    tRH: 1,
    tLY: 0,
    tRY: 0,
    tArcBottom: 0,
    tLFlatTop: 0,
    tRFlatTop: 0,
    tLTBias: 0,
    tRTBias: 0,
    tBobY: reduceMotion || menuOpen ? 0 : Math.sin(now * 0.00145) * D * 0.012,
    followPointerLive:
      variant === 'mini'
        ? !reaction.on
        : presence === 'awake' &&
          !standbyMode &&
          !supportMode &&
          !menuOpen &&
          !(hasQuery && isFocused) &&
          !reaction.on &&
          lastPtrAgoMs < 2400,
    allowNaturalBlink:
      variant === 'mini' ? !reaction.on : presence === 'awake' && !reaction.on,
  };

  if (variant === 'main') {
    if (supportMode) {
      pose.tLW *= 1.18;
      pose.tRW *= 1.18;
      pose.tLH *= 0.62;
      pose.tRH *= 0.62;
      pose.tLY = -D * 0.018;
      pose.tRY = -D * 0.018;
      pose.tLTBias = -6;
      pose.tRTBias = 6;
      pose.tArcBottom = 0.92;
    } else if (!standbyMode) {
      if (menuOpen && lastPtrAgoMs > 1600) {
        pose.dx = 0.72;
        pose.dy = Math.sin(now * 0.0008) * 0.08;
      } else if (hasQuery && isFocused && !menuOpen) {
        const pulse =
          !reduceMotion && lastTypedAgoMs < 650
            ? Math.exp(-lastTypedAgoMs / 260) * Math.sin((lastTypedAgoMs / 650) * Math.PI * 2)
            : 0;
        pose.dx = caretRatio * 0.78 + (!reduceMotion ? Math.sin(now * 0.0022) * 0.03 : 0);
        pose.dy = 0.41 + (!reduceMotion ? Math.sin(now * 0.0045) * 0.025 + pulse * 0.04 : 0);
        pose.tRot = caretRatio * 4.2 + pulse * 2.1;
        pose.tLW *= 1.04 + Math.abs(pulse) * 0.05;
        pose.tRW *= 1.04 + Math.abs(pulse) * 0.05;
        pose.tLH *= 1 - Math.max(0, pulse) * 0.14;
        pose.tRH *= 1 - Math.max(0, pulse) * 0.14;
        pose.tBobY += pulse * D * 0.022;
      } else if (isFocused && !hasQuery && !menuOpen && !reduceMotion && lastPtrAgoMs > 2400) {
        pose.dx = Math.sin(now * 0.00048) * 0.18;
        pose.dy = 0.24 + Math.sin(now * 0.00062 + 0.8) * 0.09;
      } else if (!drag && !menuOpen && !reduceMotion && lastPtrAgoMs > 2400) {
        pose.dx += Math.sin(now * 0.00042) * 0.12;
        pose.dy += Math.sin(now * 0.00056 + 1) * 0.08;
      }
    }
  }

  if (rt >= 0) {
    const type = reaction.type;
    const dir = reaction.dir;
    const isSteppedHold =
      type === 'think' ||
      type === 'happy' ||
      type === 'judge' ||
      type === 'perplexed' ||
      type === 'curious' ||
      type === 'content';
    const b = isSteppedHold ? hold(rt) : bell(rt);
    const keepSoftMode = standbyMode || supportMode;

    if (type === 'glance') {
      pose.dx = keepSoftMode
        ? pose.dx * (1 - b * 0.25) + 0.92 * (b * 0.25)
        : pose.dx * (1 - b) + dir * 0.84 * b;
      pose.dy = pose.dy * (1 - b) + (keepSoftMode ? -0.14 : -0.36) * b;
      pose.tRot = (keepSoftMode ? 1 : dir) * b * 5.8;
      pose.tLW *= 1 + b * 0.1;
      pose.tRH *= 1 - b * 0.3;
      pose.tRW *= 1 + b * 0.14;
      pose.tLTBias -= b * 8;
      pose.tRTBias += b * 5;
    } else if (type === 'think') {
      pose.dx = pose.dx * (1 - b) + (0.68 + Math.sin(rt * Math.PI * 3) * 0.08) * b;
      pose.dy = pose.dy * (1 - b) + (-0.62 + Math.cos(rt * Math.PI * 2) * 0.05) * b;
      pose.tLH *= 1 - b * 0.22;
      pose.tRH *= 1 - b * 0.1;
      pose.tLTBias -= b * 6;
      pose.tRTBias += b * 2;
    } else if (type === 'sleepy') {
      pose.dy = pose.dy * (1 - b * 0.75) + 0.4 * b;
      pose.tRot = dir * b * 3;
      pose.tScY *= 1 - b * 0.02;
      pose.tLH *= 1 - b * 0.7;
      pose.tRH *= 1 - b * 0.7;
      pose.tLW *= 1 + b * 0.16;
      pose.tRW *= 1 + b * 0.16;
      pose.tLY = pose.tRY = b * D * 0.026;
      pose.tLTBias += b * 5;
      pose.tRTBias -= b * 5;
    } else if (type === 'judge') {
      pose.dx = pose.dx * (1 - b) + (0.78 + Math.sin(rt * Math.PI * 2.5) * 0.09) * b;
      pose.dy = pose.dy * (1 - b) - 0.05 * b;
      pose.tRot = -b * (6 + Math.sin(rt * Math.PI * 2) * 1.5);
      pose.tLH *= 1 - b * 0.52;
      pose.tRH *= 1 - b * 0.52;
      pose.tLW *= 1 + b * 0.14;
      pose.tRW *= 1 + b * 0.14;
      pose.tLY = pose.tRY = b * D * 0.018;
      pose.tLTBias += b * 4;
      pose.tRTBias -= b * 4;
      pose.tLFlatTop = b * 0.9;
      pose.tRFlatTop = b * 0.9;
    } else if (type === 'perplexed') {
      pose.dx = pose.dx * (1 - b) + (0.72 + Math.cos(rt * Math.PI * 2.5) * 0.08) * b;
      pose.dy = pose.dy * (1 - b) + (-0.14 + Math.sin(rt * Math.PI * 2) * 0.04) * b;
      pose.tRot = b * (8.5 + Math.sin(rt * Math.PI * 3) * 1.8);
      pose.tLH *= 1 - b * 0.44;
      pose.tLW *= 1 + b * 0.08;
      pose.tLY = b * D * 0.022;
      pose.tLTBias += b * 11;
      pose.tLFlatTop = b * 0.75;
      pose.tRH *= 1 + b * 0.15;
      pose.tRW *= 1 + b * 0.12;
      pose.tRY = -b * D * 0.02;
      pose.tRTBias -= b * 8;
    } else if (type === 'curious') {
      pose.dx = keepSoftMode
        ? pose.dx * (1 - b * 0.15) + 0.88 * (b * 0.15)
        : pose.dx * (1 - b) + dir * (0.48 + Math.sin(rt * Math.PI * 2) * 0.08) * b;
      pose.dy = pose.dy * (1 - b) - (keepSoftMode ? 0.08 : 0.18) * b;
      pose.tRot = (keepSoftMode ? 1 : dir) * b * (5.8 + Math.sin(rt * Math.PI * 2.5) * 1.2);
      pose.tLH *= 1 + b * 0.08;
      pose.tRH *= 1 - b * 0.16;
      pose.tLTBias -= b * 5;
      pose.tRTBias += b * 6;
    } else if (type === 'peek') {
      pose.dx = keepSoftMode
        ? pose.dx * (1 - b * 0.18) + 0.92 * (b * 0.18)
        : pose.dx * (1 - b) + dir * 0.66 * b;
      pose.dy = pose.dy * (1 - b) - (keepSoftMode ? 0.16 : 0.34) * b;
      pose.tRot = (keepSoftMode ? 1 : dir) * b * 4.8;
      pose.tLW *= 1 + b * 0.14;
      pose.tRW *= 1 + b * 0.14;
      pose.tLH *= 1 + b * 0.12;
      pose.tRH *= 1 + b * 0.12;
    } else if (type === 'content') {
      pose.dy = pose.dy * (1 - b * 0.4) - 0.06 * b;
      pose.tRot = Math.sin(rt * Math.PI * 2) * 2.2;
      pose.tScX *= 1 + b * 0.015;
      pose.tScY *= 1 + b * 0.015;
      pose.tLH *= 1 - b * 0.48;
      pose.tRH *= 1 - b * 0.48;
      pose.tLW *= 1 + b * 0.2;
      pose.tRW *= 1 + b * 0.2;
      pose.tLY = pose.tRY = -b * D * 0.02;
      pose.tLTBias -= b * 5;
      pose.tRTBias += b * 5;
      pose.tArcBottom = b * 0.85;
    } else if (type === 'wink') {
      if (dir < 0) {
        pose.tLH *= 1 - b * 0.88;
        pose.tLW *= 1 + b * 0.2;
        pose.tLTBias -= b * 7;
        pose.tRH *= 1 + b * 0.06;
      } else {
        pose.tRH *= 1 - b * 0.88;
        pose.tRW *= 1 + b * 0.2;
        pose.tRTBias += b * 7;
        pose.tLH *= 1 + b * 0.06;
      }
      pose.tRot += dir * b * 4;
    } else if (type === 'surprise') {
      pose.tScX *= 1 + b * 0.03;
      pose.tScY *= 1 + b * 0.03;
      pose.tLW *= 1 + b * 0.22;
      pose.tRW *= 1 + b * 0.22;
      pose.tLH *= 1 + b * 0.16;
      pose.tRH *= 1 + b * 0.16;
    } else if (type === 'happy') {
      pose.tScX *= 1 + b * 0.025;
      pose.tScY *= 1 + b * 0.025;
      pose.tLH *= 1 - b * (0.58 - Math.sin(rt * Math.PI * 3) * 0.05);
      pose.tRH *= 1 - b * (0.58 - Math.sin(rt * Math.PI * 3) * 0.05);
      pose.tLW *= 1 + b * 0.26;
      pose.tRW *= 1 + b * 0.26;
      pose.tLY = pose.tRY = -b * (D * 0.026 + Math.abs(Math.sin(rt * Math.PI * 3)) * D * 0.01);
      pose.tLTBias -= b * 7;
      pose.tRTBias += b * 7;
      pose.tArcBottom = b;
    }
  }

  const thinkActive =
    variant === 'main' &&
    presence === 'awake' &&
    rt >= 0 &&
    reaction.type === 'think' &&
    rt > 0.04 &&
    rt < 0.9;

  return { pose, thinkActive, reactionActive: rt >= 0 };
}
