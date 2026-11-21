export type OrbPresenceState = 'awake' | 'away-serious' | 'sleeping' | 'waking-happy';

export const AWAY_BORED_TO_SLEEP_MS = 4200;
export const TOUCH_INACTIVITY_MS = 150_000; // 2.5 minutes for touch / mobile inactivity
export const WAKE_HAPPY_DURATION_MS = 1150;

export interface PresenceEvalInput {
  currentState: OrbPresenceState;
  stateEnteredAt: number;
  now: number;
  bootReady: boolean;
  menuOpen: boolean;
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
 * Pure state machine evaluating Orbit's away ("seriously?") -> sleep ("Zzz") -> waking-happy transitions.
 * - Desktop: leaving the page frame triggers 'away-serious', then 'sleeping' after 4.2s of boredom.
 * - Mobile / Touch: 2.5 minutes without clicks/touches triggers 'away-serious', then 'sleeping' after 4.2s.
 * - Returning pointer or tapping while asleep triggers 'waking-happy' (looks at pointer + happy eyes) before 'awake'.
 */
export function evaluatePresenceState(input: PresenceEvalInput): PresenceEvalResult {
  const {
    currentState,
    stateEnteredAt,
    now,
    bootReady,
    menuOpen,
    hasQuery,
    isTouchMode,
    pointerOutside,
    lastActivityAt,
  } = input;

  if (!bootReady || menuOpen || hasQuery) {
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

  // User returned inside frame or tapped on touch device
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
