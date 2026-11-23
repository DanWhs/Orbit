import type {
  BotReactionType,
  OrbPoseTarget,
  OrbPresenceState,
  OrbSoundCue,
  OrbStepRequest,
  OrbStepResponse,
} from '../src/types/orbit.ts';
import {
  AWAY_BORED_TO_SLEEP_MS,
  CLICK_POOL,
  DURATIONS,
  IDLE_POOL,
  MINI_CLICK_POOL,
  MINI_DURATIONS,
  TOUCH_INACTIVITY_MS,
  WAKE_HAPPY_DURATION_MS,
} from './orbPersonality.ts';

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

export interface PresenceEvalInput {
  currentState: OrbPresenceState;
  stateEnteredAt: number;
  now: number;
  bootReady: boolean;
  menuOpen: boolean;
  standbyMode?: boolean;
  hasQuery: boolean;
  isTouchMode: boolean;
  pointerOutside: boolean;
  lastActivityAt: number;
}

export interface PresenceEvalResult {
  nextState: OrbPresenceState;
  changed: boolean;
  stopAllAnimations: boolean;
}

/**
 * Proprietary Orbit state machine evaluating away ("seriously?") -> sleep ("Zzz") -> waking-happy.
 * In Desktop Standby mode, Orbit ignores cursor exit so it stays awake watching the clock with random idles.
 */
export function evaluatePresenceState(input: PresenceEvalInput): PresenceEvalResult {
  const {
    currentState,
    stateEnteredAt,
    now,
    bootReady,
    menuOpen,
    standbyMode = false,
    hasQuery,
    isTouchMode,
    pointerOutside,
    lastActivityAt,
  } = input;

  if (!bootReady || menuOpen || hasQuery || standbyMode) {
    return {
      nextState: 'awake',
      changed: currentState !== 'awake',
      stopAllAnimations: false,
    };
  }

  const awayTriggered = isTouchMode
    ? now - lastActivityAt >= TOUCH_INACTIVITY_MS
    : pointerOutside;

  if (awayTriggered) {
    if (currentState === 'awake' || currentState === 'waking-happy') {
      return {
        nextState: 'away-serious',
        changed: true,
        stopAllAnimations: true,
      };
    }
    if (currentState === 'away-serious' && now - stateEnteredAt >= AWAY_BORED_TO_SLEEP_MS) {
      return {
        nextState: 'sleeping',
        changed: true,
        stopAllAnimations: true,
      };
    }
    return {
      nextState: currentState,
      changed: false,
      stopAllAnimations: true,
    };
  }

  if (currentState === 'sleeping') {
    return {
      nextState: 'waking-happy',
      changed: true,
      stopAllAnimations: false,
    };
  }

  if (currentState === 'waking-happy') {
    if (now - stateEnteredAt >= WAKE_HAPPY_DURATION_MS) {
      return {
        nextState: 'awake',
        changed: true,
        stopAllAnimations: false,
      };
    }
    return {
      nextState: 'waking-happy',
      changed: false,
      stopAllAnimations: false,
    };
  }

  if (currentState === 'away-serious') {
    return {
      nextState: 'awake',
      changed: true,
      stopAllAnimations: false,
    };
  }

  return {
    nextState: 'awake',
    changed: false,
    stopAllAnimations: false,
  };
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

function isReactionType(v: unknown): v is BotReactionType {
  return (
    v === 'wink' ||
    v === 'surprise' ||
    v === 'glance' ||
    v === 'sleepy' ||
    v === 'think' ||
    v === 'happy' ||
    v === 'judge' ||
    v === 'perplexed' ||
    v === 'curious' ||
    v === 'peek' ||
    v === 'content'
  );
}

interface InternalReactionState {
  on: boolean;
  type: BotReactionType;
  t0: number;
  dur: number;
  dir: number;
}

interface OrbSessionRuntime {
  updatedAt: number;
  presence: OrbPresenceState;
  presenceEnteredAt: number;
  reaction: InternalReactionState;
  nextThinkAt: number;
  nextIdleAt: number;
  idlePoolIdx: number;
  lastClickIdx: number;
  lastNonce: number;
  wasBootReady: boolean;
  lastActivityAt: number;
  lastPtrMoveAt: number;
}

const sessions = new Map<string, OrbSessionRuntime>();
const SESSION_TTL_MS = 15 * 60 * 1000;

function cleanupSessions(now: number): void {
  if (sessions.size < 250) return;
  for (const [key, s] of sessions.entries()) {
    if (now - s.updatedAt > SESSION_TTL_MS) {
      sessions.delete(key);
    }
  }
}

function getOrCreateSession(sessionId: string, now: number): OrbSessionRuntime {
  cleanupSessions(now);
  let s = sessions.get(sessionId);
  if (!s) {
    s = {
      updatedAt: now,
      presence: 'awake',
      presenceEnteredAt: now,
      reaction: { on: false, type: 'wink', t0: 0, dur: 680, dir: 1 },
      nextThinkAt: now + 6500,
      nextIdleAt: now + 2600,
      idlePoolIdx: 0,
      lastClickIdx: -1,
      lastNonce: -1,
      wasBootReady: false,
      lastActivityAt: now,
      lastPtrMoveAt: now,
    };
    sessions.set(sessionId, s);
  }
  s.updatedAt = now;
  return s;
}

function applyReactionExpression(
  type: BotReactionType,
  rt: number,
  dir: number,
  D: number,
  standbyMode: boolean,
  pose: OrbPoseTarget
): void {
  const b =
    type === 'think' ||
    type === 'happy' ||
    type === 'judge' ||
    type === 'perplexed' ||
    type === 'curious' ||
    type === 'content'
      ? hold(rt)
      : bell(rt);

  if (type === 'glance') {
    pose.dx = standbyMode
      ? pose.dx * (1 - b * 0.25) + 0.92 * (b * 0.25)
      : pose.dx * (1 - b) + dir * 0.84 * b;
    pose.dy = pose.dy * (1 - b) + (standbyMode ? -0.14 : -0.36) * b;
    pose.tRot = (standbyMode ? 1 : dir) * b * 5.8;
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
    pose.dx = standbyMode
      ? pose.dx * (1 - b * 0.15) + 0.88 * (b * 0.15)
      : pose.dx * (1 - b) + dir * (0.48 + Math.sin(rt * Math.PI * 2) * 0.08) * b;
    pose.dy = pose.dy * (1 - b) - (standbyMode ? 0.08 : 0.18) * b;
    pose.tRot = (standbyMode ? 1 : dir) * b * (5.8 + Math.sin(rt * Math.PI * 2.5) * 1.2);
    pose.tLH *= 1 + b * 0.08;
    pose.tRH *= 1 - b * 0.16;
    pose.tLTBias -= b * 5;
    pose.tRTBias += b * 6;
  } else if (type === 'peek') {
    pose.dx = standbyMode
      ? pose.dx * (1 - b * 0.18) + 0.92 * (b * 0.18)
      : pose.dx * (1 - b) + dir * 0.66 * b;
    pose.dy = pose.dy * (1 - b) - (standbyMode ? 0.16 : 0.34) * b;
    pose.tRot = (standbyMode ? 1 : dir) * b * 4.8;
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

export function stepOrbEngine(req: OrbStepRequest): OrbStepResponse {
  const now = Number.isFinite(req.nowMs) ? req.nowMs : Date.now();
  const sessionId = (req.sessionId || 'default').slice(0, 64);
  const s = getOrCreateSession(sessionId, now);

  const variant = req.variant === 'mini' ? 'mini' : 'main';
  const D = clamp(Number(req.botSize) || 180, 30, 620);
  const standbyMode = Boolean(req.standbyMode) && variant === 'main';
  const supportMode = Boolean(req.supportMode) && variant === 'main' && !standbyMode;
  const menuOpen = Boolean(req.menuOpen);
  const hasQuery = Boolean(req.hasQuery);
  const isFocused = Boolean(req.isFocused);
  const caretRatio = clamp(Number(req.caretRatio) || 0, -1, 1);
  const drag = Boolean(req.drag);
  const reduceMotion = Boolean(req.reduceMotion);
  const pointerOutside = Boolean(req.pointerOutside);
  const isTouchMode = Boolean(req.isTouchMode);
  const bootReady = Boolean(req.bootReady);
  const tx = clamp(Number(req.pointerDx) || 0, -1.2, 1.2);
  const ty = clamp(Number(req.pointerDy) || 0, -1.2, 1.2);
  const lastActivityAgoMs = Math.max(0, Number(req.lastActivityAgoMs) || 0);
  const lastPtrAgoMs = Math.max(0, Number(req.lastPtrAgoMs) || 0);
  const lastTypedAgoMs = Math.max(0, Number(req.lastTypedAgoMs ?? 999999));
  const activelyTyping = hasQuery && isFocused && lastTypedAgoMs < 2400;
  const passiveEmptyFocus = isFocused && !hasQuery;
  const durTable = variant === 'mini' ? MINI_DURATIONS : DURATIONS;
  let soundCue: OrbSoundCue | null = null;

  if (!s.wasBootReady && bootReady) {
    s.wasBootReady = true;
    s.lastActivityAt = now;
  }
  s.lastActivityAt = now - lastActivityAgoMs;
  s.lastPtrMoveAt = now - lastPtrAgoMs;

  // Handle explicit events triggered from UI (click on bot, settings modification, boot pop)
  const ev = req.event;
  if (ev && typeof ev === 'object') {
    const evNonce = typeof ev.nonce === 'number' ? ev.nonce : -1;
    const isFresh = evNonce < 0 || evNonce !== s.lastNonce;
    if (isFresh) {
      if (evNonce >= 0) s.lastNonce = evNonce;
      if (ev.kind === 'click') {
        const pool = variant === 'mini' ? MINI_CLICK_POOL : CLICK_POOL;
        let idx = Math.floor(Math.random() * pool.length);
        if (idx === s.lastClickIdx) idx = (idx + 1) % pool.length;
        s.lastClickIdx = idx;
        const type = pool[idx];
        const dir = ev.dir && ev.dir < 0 ? -1 : 1;
        s.reaction = { on: true, type, t0: now, dur: durTable[type], dir };
        soundCue = { channel: 'reaction', id: type, ambient: false };
      } else if (ev.kind === 'signal' && isReactionType(ev.reactionType)) {
        const dir = ev.dir && ev.dir < 0 ? -1 : 1;
        s.reaction = {
          on: true,
          type: ev.reactionType,
          t0: now,
          dur: durTable[ev.reactionType],
          dir,
        };
        if (!ev.silent) {
          soundCue = { channel: 'reaction', id: ev.reactionType, ambient: false };
        }
      }
    }
  }

  // Evaluate desktop/mobile presence (disabled in mini mark & ignored for away/sleep during desktop standbyMode or supportMode)
  let stopAllAnimations = false;
  if (variant === 'main') {
    const presenceEval = evaluatePresenceState({
      currentState: s.presence,
      stateEnteredAt: s.presenceEnteredAt,
      now,
      bootReady,
      menuOpen,
      standbyMode: standbyMode || supportMode,
      hasQuery,
      isTouchMode,
      pointerOutside,
      lastActivityAt: s.lastActivityAt,
    });
    stopAllAnimations = presenceEval.stopAllAnimations;
    if (presenceEval.changed) {
      s.presence = presenceEval.nextState;
      s.presenceEnteredAt = now;
      if (presenceEval.nextState !== 'awake') {
        soundCue = { channel: 'presence', id: presenceEval.nextState, ambient: false };
      }
    }
  } else {
    s.presence = 'awake';
  }

  if (stopAllAnimations && s.reaction.on) {
    s.reaction.on = false;
  }

  // Schedule periodic think (when user has a typed query or paused mid-typing) & random idle expressions (including desktop passive empty focus and Standby/Support!)
  if (variant === 'main' && s.presence === 'awake') {
    if (
      !standbyMode &&
      !supportMode &&
      hasQuery &&
      isFocused &&
      !menuOpen &&
      !s.reaction.on &&
      !reduceMotion &&
      now > s.nextThinkAt
    ) {
      s.reaction = { on: true, type: 'think', t0: now, dur: durTable.think, dir: 1 };
      s.nextThinkAt = now + 5200 + Math.random() * 4400;
    } else if (
      bootReady &&
      (!isFocused || passiveEmptyFocus || standbyMode || supportMode) &&
      !activelyTyping &&
      !menuOpen &&
      !drag &&
      !s.reaction.on &&
      !reduceMotion &&
      (standbyMode || supportMode || now - s.lastPtrMoveAt > 2000) &&
      now > s.nextIdleAt
    ) {
      const idleType: BotReactionType = supportMode
        ? (['happy', 'content', 'wink'] as const)[s.idlePoolIdx % 3]
        : IDLE_POOL[s.idlePoolIdx % IDLE_POOL.length];
      s.idlePoolIdx = (s.idlePoolIdx + 1) % IDLE_POOL.length;
      const idleDir = standbyMode || supportMode ? 1 : s.idlePoolIdx % 2 === 0 ? 1 : -1;
      s.reaction = { on: true, type: idleType, t0: now, dur: durTable[idleType], dir: idleDir };
      if (!soundCue) {
        soundCue = { channel: 'reaction', id: idleType, ambient: true };
      }
      const gapBase = standbyMode || supportMode ? 3600 : 4000;
      s.nextIdleAt = now + durTable[idleType] + gapBase + Math.random() * 3200;
    }
  }

  // Evaluate reaction timeline
  let rt = -1;
  if (s.reaction.on) {
    rt = (now - s.reaction.t0) / Math.max(1, s.reaction.dur);
    if (rt >= 1) {
      s.reaction.on = false;
      rt = -1;
    }
  }

  // Support showcase gaze smoothly alternates between reading the letter on the left and smiling at the viewer
  const supportGlance = Math.max(0, Math.sin(now * 0.00062));
  const supportDx = -0.62 * (1 - supportGlance * 0.78) + Math.sin(now * 0.0009) * 0.04;
  const supportDy = -0.02 + Math.sin(now * 0.00075) * 0.04;

  // Base pose target
  const br = reduceMotion ? 0 : Math.sin(now * 0.0021);
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
      s.presence === 'awake' && !menuOpen && !reduceMotion && !s.reaction.on
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
        ? !s.reaction.on
        : s.presence === 'awake' &&
          !standbyMode &&
          !supportMode &&
          !menuOpen &&
          !(hasQuery && isFocused) &&
          !s.reaction.on &&
          now - s.lastPtrMoveAt < 2400,
    allowNaturalBlink:
      variant === 'mini'
        ? !s.reaction.on
        : s.presence === 'awake' && !s.reaction.on,
  };

  if (variant === 'main') {
    const awayMotion =
      s.presence === 'away-serious'
        ? computeAwaySeriousMotion(now, s.presenceEnteredAt, D)
        : null;
    const sleepMotion =
      s.presence === 'sleeping' ? computeSleepingMotion(now, D) : null;
    const wakeMotion =
      s.presence === 'waking-happy'
        ? computeWakingHappyMotion(now, s.presenceEnteredAt, WAKE_HAPPY_DURATION_MS, D)
        : null;

    if (awayMotion) {
      pose.dx = awayMotion.dx;
      pose.dy = awayMotion.dy;
      pose.tRot = awayMotion.rot;
      pose.tScX = 1 + (reduceMotion ? 0 : awayMotion.breath * 0.006);
      pose.tScY = 1 - (reduceMotion ? 0 : awayMotion.breath * 0.006);
      pose.tLW = 1.12;
      pose.tRW = 1.12;
      pose.tLH = awayMotion.leftHeightMul;
      pose.tRH = awayMotion.rightHeightMul;
      pose.tLY = D * 0.012;
      pose.tRY = D * 0.012;
      pose.tLTBias = 6.7;
      pose.tRTBias = -6.7;
      pose.tLFlatTop = 0.94;
      pose.tRFlatTop = 0.94;
      pose.tBobY = reduceMotion ? 0 : awayMotion.bobY;
      pose.followPointerLive = false;
    } else if (sleepMotion) {
      pose.dx = sleepMotion.dx;
      pose.dy = sleepMotion.dy;
      pose.tRot = sleepMotion.rot;
      pose.tScX = 1 + (reduceMotion ? 0 : sleepMotion.breath * 0.0095);
      pose.tScY = 1 - (reduceMotion ? 0 : sleepMotion.breath * 0.009);
      pose.tLW = 1.18;
      pose.tRW = 1.18;
      pose.tLH = sleepMotion.lidHeightMul;
      pose.tRH = sleepMotion.lidHeightMul;
      pose.tLY = sleepMotion.lidY;
      pose.tRY = sleepMotion.lidY;
      pose.tLTBias = 9.2;
      pose.tRTBias = -9.2;
      pose.tLFlatTop = 0.85;
      pose.tRFlatTop = 0.85;
      pose.tBobY = reduceMotion ? 0 : sleepMotion.bobY;
      pose.followPointerLive = false;
    } else if (wakeMotion) {
      pose.dx = tx + wakeMotion.gazeJitterDx;
      pose.dy = ty + wakeMotion.gazeJitterDy;
      pose.tRot = tx * 4.5 + wakeMotion.rotOffset;
      pose.tScX *= 1.028;
      pose.tScY *= 1.028;
      pose.tLH *= wakeMotion.heightMul;
      pose.tRH *= wakeMotion.heightMul;
      pose.tLW *= wakeMotion.widthMul;
      pose.tRW *= wakeMotion.widthMul;
      pose.tLY = -D * 0.024 + wakeMotion.eyeBounceY;
      pose.tRY = -D * 0.024 + wakeMotion.eyeBounceY;
      pose.tLTBias = -7;
      pose.tRTBias = 7;
      pose.tArcBottom = 0.95;
      pose.followPointerLive = true;
    } else {
      if (supportMode) {
        // Warm smiling happy eyes gazing toward the letter and viewer
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
        if (menuOpen && now - s.lastPtrMoveAt > 1600) {
          pose.dx = 0.72;
          pose.dy = Math.sin(now * 0.0008) * 0.08;
        } else if (hasQuery && isFocused && !menuOpen) {
          // Live typing choreography: track text caret, tilt head attentively, subtle keystroke bounce
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
        } else if (passiveEmptyFocus && !menuOpen && !reduceMotion && now - s.lastPtrMoveAt > 2400) {
          // Desktop passive focus with empty bar: glance softly toward bar + wander naturally
          pose.dx = Math.sin(now * 0.00048) * 0.18;
          pose.dy = 0.24 + Math.sin(now * 0.00062 + 0.8) * 0.09;
        } else if (!drag && !menuOpen && !reduceMotion && now - s.lastPtrMoveAt > 2400) {
          pose.dx += Math.sin(now * 0.00042) * 0.12;
          pose.dy += Math.sin(now * 0.00056 + 1) * 0.08;
        }
      }

      if (rt >= 0) {
        applyReactionExpression(s.reaction.type, rt, s.reaction.dir, D, standbyMode || supportMode, pose);
      }
    }
  } else {
    // Mini mark (used inside Settings / Legal left header)
    pose.tRot = reduceMotion ? 0 : Math.sin(now * 0.001) * 1.1;
    if (rt >= 0) {
      applyReactionExpression(s.reaction.type, rt, s.reaction.dir, D, false, pose);
    }
  }

  const activeReaction =
    s.presence !== 'awake'
      ? s.presence
      : s.reaction.on
        ? s.reaction.type
        : 'idle';

  const thinkActive =
    variant === 'main' &&
    s.presence === 'awake' &&
    s.reaction.on &&
    s.reaction.type === 'think' &&
    rt > 0.04 &&
    rt < 0.9;

  return {
    presenceState: s.presence,
    activeReaction,
    thinkActive,
    stopAllAnimations,
    poseTarget: pose,
    soundCue,
  };
}
