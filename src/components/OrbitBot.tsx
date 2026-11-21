import { memo, useEffect, useRef, useState } from 'react';
import { BootPhase } from '../types/orbit';
import { evaluatePresenceState, OrbPresenceState, WAKE_HAPPY_DURATION_MS } from '../utils/idleSleepState';
import { damp } from '../utils/layoutMath';
import {
  computeAwaySeriousMotion,
  computeSleepingMotion,
  computeWakingHappyMotion,
} from '../utils/orbMotionMath';
import { playPresenceSound, playReactionSound, unlockOrbitAudio } from '../utils/orbSounds';

export type BotReactionType =
  | 'wink'
  | 'surprise'
  | 'glance'
  | 'sleepy'
  | 'think'
  | 'happy'
  | 'judge'
  | 'perplexed'
  | 'curious'
  | 'peek'
  | 'content';

interface OrbitBotProps {
  bootPhase: BootPhase;
  botSize: number;
  botCenterY: number;
  horizontalPercent: number; // 50 normally, ~24 on desktop when side menu is open
  viewportWidth: number;
  scale: number;
  animateStageTransition: boolean;
  menuOpen: boolean;
  isFocused: boolean;
  hasQuery?: boolean;
  caretRatio: number;
  reactionSignal: { type: BotReactionType; nonce: number } | null;
  ariaLabel: string;
  onBotClick?: () => void;
}

const POOL: BotReactionType[] = ['wink', 'surprise', 'glance', 'sleepy'];
const IDLE_POOL: BotReactionType[] = ['peek', 'curious', 'glance', 'content', 'wink'];
const DURATIONS: Record<BotReactionType, number> = {
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

export const OrbitBot = memo(function OrbitBot({
  bootPhase,
  botSize,
  botCenterY,
  horizontalPercent,
  viewportWidth,
  scale,
  animateStageTransition,
  menuOpen,
  isFocused,
  hasQuery = false,
  caretRatio,
  reactionSignal,
  ariaLabel,
  onBotClick,
}: OrbitBotProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scaleWrapRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLButtonElement>(null);
  const leftEyeRef = useRef<HTMLDivElement>(null);
  const rightEyeRef = useRef<HTMLDivElement>(null);
  const thinkRef = useRef<HTMLDivElement>(null);
  const snowRef = useRef<HTMLCanvasElement>(null);

  const [activeReactionLabel, setActiveReactionLabel] = useState<string>('idle');
  const [presenceState, setPresenceState] = useState<OrbPresenceState>('awake');

  const propsRef = useRef({
    bootPhase,
    botSize,
    botCenterY,
    horizontalPercent,
    viewportWidth,
    scale,
    isFocused,
    hasQuery,
    caretRatio,
    menuOpen,
  });
  propsRef.current = {
    bootPhase,
    botSize,
    botCenterY,
    horizontalPercent,
    viewportWidth,
    scale,
    isFocused,
    hasQuery,
    caretRatio,
    menuOpen,
  };

  const reactionRef = useRef<{ on: boolean; type: BotReactionType; t0: number; dur: number; dir: number }>({
    on: false,
    type: 'wink',
    t0: 0,
    dur: 680,
    dir: 1,
  });
  const lastIndexRef = useRef(-1);
  const bootWinkTriggeredRef = useRef(false);

  const triggerReaction = (type: BotReactionType, clientX?: number, silent = false) => {
    const botCenterX =
      (propsRef.current.horizontalPercent / 100) * (propsRef.current.viewportWidth || window.innerWidth);
    const dir = clientX !== undefined && clientX < botCenterX ? -1 : 1;
    reactionRef.current = {
      on: true,
      type,
      t0: performance.now(),
      dur: DURATIONS[type],
      dir,
    };
    setActiveReactionLabel(type);
    if (!silent) {
      playReactionSound(type);
    }
  };

  // Trigger playful wink on boot pop-in
  useEffect(() => {
    if (bootPhase === 'pop' && !bootWinkTriggeredRef.current) {
      bootWinkTriggeredRef.current = true;
      const timer = setTimeout(() => {
        triggerReaction('wink', undefined, true);
      }, 260);
      return () => clearTimeout(timer);
    }
  }, [bootPhase]);

  // Trigger external reaction signals (e.g. happy on submit, judge/perplexed on settings edit)
  useEffect(() => {
    if (reactionSignal) {
      triggerReaction(reactionSignal.type, undefined, false);
    }
  }, [reactionSignal]);

  // Holiday snow + hat check (Dec 1 – Jan 6 or #natale)
  useEffect(() => {
    const checkHoliday = () => {
      const now = new Date();
      const m = now.getMonth();
      const g = now.getDate();
      const isXmas =
        m === 11 || (m === 0 && g <= 6) || /natale/i.test(window.location.hash + window.location.search);
      document.documentElement.classList.toggle('xmas', isXmas);
      return isXmas;
    };
    checkHoliday();
    const id = setInterval(checkHoliday, 600000);
    window.addEventListener('hashchange', checkHoliday);
    return () => {
      clearInterval(id);
      window.removeEventListener('hashchange', checkHoliday);
    };
  }, []);

  // Main 60fps eye tracking, presence ("seriously?" -> sleep -> wake happy) & seamless expression springs
  useEffect(() => {
    let tx = 0;
    let ty = 0;
    let lastPtr = 0;
    let drag = false;
    let nextThink = performance.now() + 6500;
    let nextIdleAct = performance.now() + 2600;
    let idlePoolIdx = 0;
    let lastTime = performance.now();
    let thinkOn = false;
    let rafId = 0;
    const reducedMotionMq = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    // Away / Sleep presence tracking
    let currentPresence: OrbPresenceState = 'awake';
    let presenceEnteredAt = performance.now();
    let pointerOutside = false;
    let isTouchMode = window.matchMedia?.('(pointer: coarse) and (hover: none)')?.matches ?? false;
    let lastActivityAt = performance.now();
    let wasBootReady = false;

    const GX = { p: 0, v: 0 };
    const GY = { p: 0, v: 0 };
    const BX = { p: 0, v: 0 };
    const BY = { p: 0, v: 0 };
    const BOB_Y = { p: 0, v: 0 };
    const BL = { on: false, t0: 0, next: performance.now() + 2400, doubleLeft: 0 };

    // Continuous damped springs for every expression parameter so switches never snap
    const EROT = { p: 0, v: 0 };
    const ESCX = { p: 1, v: 0 };
    const ESCY = { p: 1, v: 0 };
    const ELW = { p: 1, v: 0 };
    const ELH = { p: 1, v: 0 };
    const ERW = { p: 1, v: 0 };
    const ERH = { p: 1, v: 0 };
    const ELY = { p: 0, v: 0 };
    const ERY = { p: 0, v: 0 };
    const ELT = { p: -4.2, v: 0 };
    const ERT = { p: 4.2, v: 0 };
    const EARC = { p: 0, v: 0 };
    const ELFLAT = { p: 0, v: 0 };
    const ERFLAT = { p: 0, v: 0 };

    const norm = () => Math.min(window.innerWidth, window.innerHeight) * 0.42;
    const pointAt = (x: number, y: number) => {
      if (!botRef.current) return;
      lastPtr = performance.now();
      const { horizontalPercent: hp, botCenterY: centerY, viewportWidth: vw } = propsRef.current;
      const centerX = (hp / 100) * (vw || window.innerWidth);
      const dx = (x - centerX) / norm();
      const dy = (y - centerY) / norm();
      const d = Math.hypot(dx, dy);
      if (d > 1e-4) {
        const e = Math.tanh(d * 0.9);
        tx = (dx / d) * e;
        ty = (dy / d) * e;
      } else {
        tx = 0;
        ty = 0;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      lastActivityAt = performance.now();
      if (e.pointerType === 'touch') {
        isTouchMode = true;
        pointerOutside = false;
      } else {
        isTouchMode = false;
        pointerOutside = false;
      }
      if (!propsRef.current.hasQuery || propsRef.current.menuOpen) {
        pointAt(e.clientX, e.clientY);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      drag = true;
      lastActivityAt = performance.now();
      unlockOrbitAudio();
      if (e.pointerType === 'touch') {
        isTouchMode = true;
        pointerOutside = false;
      } else {
        isTouchMode = false;
        pointerOutside = false;
      }
      if (
        !propsRef.current.hasQuery ||
        propsRef.current.menuOpen ||
        !(e.target as HTMLElement)?.closest('#search-ui')
      ) {
        pointAt(e.clientX, e.clientY);
      }
    };
    const onPointerUp = () => {
      drag = false;
      lastActivityAt = performance.now();
    };
    const onFrameLeave = () => {
      if (!isTouchMode) pointerOutside = true;
    };
    const onFrameEnter = (e: MouseEvent) => {
      if (!isTouchMode) {
        pointerOutside = false;
        lastActivityAt = performance.now();
        if (e.clientX !== 0 || e.clientY !== 0) {
          pointAt(e.clientX, e.clientY);
        }
      }
    };
    const onWindowMouseOut = (e: MouseEvent) => {
      const toEl = (e as MouseEvent & { toElement?: EventTarget | null }).toElement;
      if (!e.relatedTarget && !toEl && !isTouchMode) {
        pointerOutside = true;
      }
    };
    const onWindowBlur = () => {
      if (!isTouchMode && !propsRef.current.menuOpen) {
        pointerOutside = true;
      }
    };
    const onTouchActivity = () => {
      isTouchMode = true;
      pointerOutside = false;
      lastActivityAt = performance.now();
      unlockOrbitAudio();
    };
    const onKeyActivity = () => {
      lastActivityAt = performance.now();
      unlockOrbitAudio();
    };
    const onVisibilityChange = () => {
      if (document.hidden && !isTouchMode) {
        pointerOutside = true;
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    document.addEventListener('mouseleave', onFrameLeave);
    document.addEventListener('mouseenter', onFrameEnter);
    window.addEventListener('mouseout', onWindowMouseOut);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('touchstart', onTouchActivity, { passive: true });
    window.addEventListener('keydown', onKeyActivity, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Snow flakes if holiday mode active
    const snowCv = snowRef.current;
    const snowCx = snowCv?.getContext('2d') ?? null;
    interface Flake {
      x: number;
      y: number;
      r: number;
      v: number;
      ph: number;
      sw: number;
      a: number;
    }
    const makeFlake = (init: boolean): Flake => ({
      x: Math.random() * window.innerWidth,
      y: init ? Math.random() * window.innerHeight : -8,
      r: 1 + Math.random() * 2.2,
      v: 16 + Math.random() * 28,
      ph: Math.random() * 6.28,
      sw: 8 + Math.random() * 16,
      a: 0.35 + Math.random() * 0.45,
    });
    let flakes: Flake[] = [];
    const resizeSnow = () => {
      if (!snowCv || !snowCx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      snowCv.width = Math.round(window.innerWidth * dpr);
      snowCv.height = Math.round(window.innerHeight * dpr);
      snowCx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(36, Math.min(95, Math.round((window.innerWidth * window.innerHeight) / 14000)));
      flakes = Array.from({ length: count }, () => makeFlake(true));
    };
    resizeSnow();
    window.addEventListener('resize', resizeSnow);

    const sine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
    const bell = (t: number) => (t <= 0 || t >= 1 ? 0 : sine(Math.sin(t * Math.PI)));
    const sstep = (a: number, b: number, t: number) => {
      const k = Math.max(0, Math.min(1, (t - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };
    const hold = (t: number) => sstep(0, 0.16, t) * (1 - sstep(0.78, 1, t));
    const clampGaze = (v: number) => Math.max(-1.15, Math.min(1.15, v));

    const eyeCache = new WeakMap<
      HTMLDivElement,
      { w: string; h: string; br: string; tf: string }
    >();
    const setEye = (
      el: HTMLDivElement | null,
      w: number,
      h: number,
      x: number,
      y: number,
      tilt: number,
      arcBottom: number,
      flatTop: number
    ) => {
      if (!el) return;
      const r = Math.min(w, h) / 2;
      const rt = flatTop > 0.04 ? r * (1 - flatTop * 0.78) : r;
      const rb = arcBottom > 0.04 ? r * (1 - arcBottom * 0.7) : r;
      const wStr = `${w.toFixed(1)}px`;
      const hStr = `${h.toFixed(1)}px`;
      const brStr = `${rt.toFixed(1)}px ${rt.toFixed(1)}px ${rb.toFixed(1)}px ${rb.toFixed(1)}px`;
      const tfStr = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${tilt.toFixed(2)}deg)`;
      const prev = eyeCache.get(el);
      if (!prev) {
        el.style.width = wStr;
        el.style.height = hStr;
        el.style.borderRadius = brStr;
        el.style.transform = tfStr;
        eyeCache.set(el, { w: wStr, h: hStr, br: brStr, tf: tfStr });
        return;
      }
      if (prev.w !== wStr) {
        el.style.width = wStr;
        prev.w = wStr;
      }
      if (prev.h !== hStr) {
        el.style.height = hStr;
        prev.h = hStr;
      }
      if (prev.br !== brStr) {
        el.style.borderRadius = brStr;
        prev.br = brStr;
      }
      if (prev.tf !== tfStr) {
        el.style.transform = tfStr;
        prev.tf = tfStr;
      }
    };

    let lastBotTf = '';

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const {
        bootPhase: bPhase,
        botSize: Draw,
        isFocused: foc,
        hasQuery: hQuery,
        caretRatio: cRatio,
        menuOpen: mOpen,
      } = propsRef.current;

      if (!wasBootReady && bPhase === 'ready') {
        wasBootReady = true;
        lastActivityAt = now;
      }

      // Evaluate desktop pointer-leave / mobile touch-inactivity presence -> 'away-serious' -> 'sleeping' -> 'waking-happy'
      const presenceEval = evaluatePresenceState({
        currentState: currentPresence,
        stateEnteredAt: presenceEnteredAt,
        now,
        bootReady: bPhase === 'ready',
        menuOpen: mOpen,
        hasQuery: hQuery,
        isTouchMode,
        pointerOutside,
        lastActivityAt,
      });

      if (presenceEval.changed) {
        currentPresence = presenceEval.nextState;
        presenceEnteredAt = now;
        setPresenceState(presenceEval.nextState);
        if (presenceEval.nextState === 'away-serious') {
          setActiveReactionLabel('away-serious');
          playPresenceSound('away-serious');
        } else if (presenceEval.nextState === 'sleeping') {
          setActiveReactionLabel('sleeping');
          playPresenceSound('sleeping');
        } else if (presenceEval.nextState === 'waking-happy') {
          setActiveReactionLabel('waking-happy');
          playPresenceSound('waking-happy');
        } else if (!reactionRef.current.on) {
          setActiveReactionLabel('idle');
        }
      }

      const stopAnimations = presenceEval.stopAllAnimations;
      const isSleeping = currentPresence === 'sleeping';
      const isAwaySerious = currentPresence === 'away-serious';
      const isWakingHappy = currentPresence === 'waking-happy';

      // Holiday snow rendering (paused when sleeping so only Zzz animates)
      if (snowCx && !isSleeping && document.documentElement.classList.contains('xmas')) {
        snowCx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        snowCx.fillStyle = '#9AA1AF';
        for (const f of flakes) {
          f.y += f.v * dt * (0.6 + f.r * 0.2);
          f.x += Math.sin(now * 0.0006 + f.ph) * f.sw * dt;
          if (f.y > window.innerHeight + 8) Object.assign(f, makeFlake(false));
          if (f.x < -8) f.x = window.innerWidth + 8;
          else if (f.x > window.innerWidth + 8) f.x = -8;
          snowCx.globalAlpha = f.a;
          snowCx.beginPath();
          snowCx.arc(f.x, f.y, f.r, 0, 6.283);
          snowCx.fill();
        }
        snowCx.globalAlpha = 1;
      } else if (snowCx) {
        snowCx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }

      let dx = tx;
      let dy = ty;
      const reduceMotion = Boolean(reducedMotionMq?.matches);
      const R = reactionRef.current;

      // Stop active reactions / blinks when entering away-serious or sleeping
      if (stopAnimations) {
        if (R.on) {
          R.on = false;
        }
        if (BL.on) {
          BL.on = false;
        }
      }

      const awayMotion = isAwaySerious ? computeAwaySeriousMotion(now, presenceEnteredAt, Draw) : null;
      const sleepMotion = isSleeping ? computeSleepingMotion(now, Draw) : null;
      const wakeMotion = isWakingHappy
        ? computeWakingHappyMotion(now, presenceEnteredAt, WAKE_HAPPY_DURATION_MS, Draw)
        : null;

      // Gaze target routing
      if (awayMotion) {
        dx = awayMotion.dx;
        dy = awayMotion.dy;
      } else if (sleepMotion) {
        dx = sleepMotion.dx;
        dy = sleepMotion.dy;
      } else if (wakeMotion) {
        // Wakes up and looks right at the returning mouse pointer with lively shimmer
        dx = tx + wakeMotion.gazeJitterDx;
        dy = ty + wakeMotion.gazeJitterDy;
      } else {
        if (mOpen && now - lastPtr > 1600) {
          // Look curiously toward open Settings / Legal drawer
          dx = 0.72;
          dy = Math.sin(now * 0.0008) * 0.08;
        } else if (hQuery && foc && !mOpen) {
          dx = cRatio * 0.75;
          dy = 0.42;
        } else if (foc && !mOpen && now - lastPtr > 4500) {
          dx = cRatio * 0.75;
          dy = 0.42;
        } else if (!drag && !mOpen && !reduceMotion && now - lastPtr > 2400) {
          dx += Math.sin(now * 0.00037) * 0.09;
          dy += Math.sin(now * 0.00051 + 1) * 0.06;
        }
      }

      if (currentPresence === 'awake') {
        if (foc && !mOpen && !R.on && now > nextThink) {
          triggerReaction('think', undefined, true);
          nextThink = now + 8000 + Math.random() * 6000;
        } else if (
          bPhase === 'ready' &&
          !foc &&
          !mOpen &&
          !drag &&
          !R.on &&
          !reduceMotion &&
          now - lastPtr > 2200 &&
          now > nextIdleAct
        ) {
          const idleType = IDLE_POOL[idlePoolIdx % IDLE_POOL.length];
          idlePoolIdx = (idlePoolIdx + 1) % IDLE_POOL.length;
          const idleDir = idlePoolIdx % 2 === 0 ? 1 : -1;
          reactionRef.current = {
            on: true,
            type: idleType,
            t0: now,
            dur: DURATIONS[idleType],
            dir: idleDir,
          };
          setActiveReactionLabel(idleType);
          playReactionSound(idleType, true);
          nextIdleAct = now + DURATIONS[idleType] + 4800 + Math.random() * 4200;
        }
      }

      let rt = -1;
      let tRot =
        currentPresence === 'awake' && !mOpen && !reduceMotion && !R.on
          ? Math.sin(now * 0.00085) * 1.35
          : 0;

      if (R.on) {
        rt = (now - R.t0) / R.dur;
        if (rt >= 1) {
          R.on = false;
          rt = -1;
          if (currentPresence === 'awake') setActiveReactionLabel('idle');
        }
      }
      const b =
        rt < 0
          ? 0
          : R.type === 'think' ||
              R.type === 'happy' ||
              R.type === 'judge' ||
              R.type === 'perplexed' ||
              R.type === 'curious' ||
              R.type === 'content'
            ? hold(rt)
            : bell(rt);

      if (currentPresence === 'awake' && rt >= 0) {
        if (R.type === 'glance') {
          dx = dx * (1 - b) + R.dir * 0.84 * b;
          dy = dy * (1 - b) - 0.36 * b;
          tRot = R.dir * b * 7;
        } else if (R.type === 'think') {
          dx = dx * (1 - b) + (0.68 + Math.sin(rt * Math.PI * 3) * 0.08) * b;
          dy = dy * (1 - b) + (-0.62 + Math.cos(rt * Math.PI * 2) * 0.05) * b;
        } else if (R.type === 'sleepy') {
          dy = dy * (1 - b * 0.75) + 0.4 * b;
          tRot = R.dir * b * 3;
        } else if (R.type === 'judge') {
          dx = dx * (1 - b) + (0.78 + Math.sin(rt * Math.PI * 2.5) * 0.09) * b;
          dy = dy * (1 - b) - 0.05 * b;
          tRot = -b * (6 + Math.sin(rt * Math.PI * 2) * 1.5);
        } else if (R.type === 'perplexed') {
          dx = dx * (1 - b) + (0.72 + Math.cos(rt * Math.PI * 2.5) * 0.08) * b;
          dy = dy * (1 - b) + (-0.14 + Math.sin(rt * Math.PI * 2) * 0.04) * b;
          tRot = b * (8.5 + Math.sin(rt * Math.PI * 3) * 1.8);
        } else if (R.type === 'curious') {
          dx = dx * (1 - b) + R.dir * (0.48 + Math.sin(rt * Math.PI * 2) * 0.08) * b;
          dy = dy * (1 - b) - 0.18 * b;
          tRot = R.dir * b * (6.5 + Math.sin(rt * Math.PI * 2.5) * 1.4);
        } else if (R.type === 'peek') {
          dx = dx * (1 - b) + R.dir * 0.66 * b;
          dy = dy * (1 - b) - 0.34 * b;
          tRot = R.dir * b * 5.2;
        } else if (R.type === 'content') {
          dy = dy * (1 - b * 0.4) - 0.06 * b;
          tRot = Math.sin(rt * Math.PI * 2) * 2.2;
        }
      }

      const wt = currentPresence === 'awake' && R.on && R.type === 'think' && rt > 0.04 && rt < 0.9;
      if (wt !== thinkOn) {
        thinkOn = wt;
        thinkRef.current?.classList.toggle('on', wt);
      }

      const sx = damp(GX, dx, 0.17, dt);
      const sy = damp(GY, dy, 0.17, dt);
      const bx = damp(BX, dx, 0.36, dt);
      const by = damp(BY, dy, 0.36, dt);

      const D = Math.max(44, Draw);
      const eW = D * 0.188;
      const eH = D * 0.405;
      const baseGap = D * 0.278;
      // Keep gentle living breath in away-serious and sleeping; pause only on reduced motion
      const br = reduceMotion
        ? 0
        : sleepMotion
          ? sleepMotion.breath
          : awayMotion
            ? awayMotion.breath
            : Math.sin(now * 0.0021);
      let tScX = 1 + br * (sleepMotion ? 0.0095 : 0.006);
      let tScY = 1 - br * (sleepMotion ? 0.009 : 0.006);
      let tLW = 1;
      let tLH = 1;
      let tRW = 1;
      let tRH = 1;
      let tLY = 0;
      let tRY = 0;
      let tArcBottom = 0;
      let tLFlatTop = 0;
      let tRFlatTop = 0;
      let tLT = -4.2 - sx * 6.5;
      let tRT = 4.2 - sx * 6.5;

      if (awayMotion) {
        // Alive "seriously?" face with impatient glances, asymmetrical tension & occasional half-blinks
        tRot = awayMotion.rot;
        tLW = 1.12;
        tRW = 1.12;
        tLH = awayMotion.leftHeightMul;
        tRH = awayMotion.rightHeightMul;
        tLY = D * 0.012;
        tRY = D * 0.012;
        tLT = 2.5 - sx * 2.5;
        tRT = -2.5 - sx * 2.5;
        tLFlatTop = 0.94;
        tRFlatTop = 0.94;
        tArcBottom = 0;
      } else if (sleepMotion) {
        // Peaceful sleeping breath & subtle dreaming lid rise while Zzz floats above
        tRot = sleepMotion.rot;
        tLW = 1.18;
        tRW = 1.18;
        tLH = sleepMotion.lidHeightMul;
        tRH = sleepMotion.lidHeightMul;
        tLY = sleepMotion.lidY;
        tRY = sleepMotion.lidY;
        tLT = 5;
        tRT = -5;
        tLFlatTop = 0.85;
        tRFlatTop = 0.85;
        tArcBottom = 0;
      } else if (wakeMotion) {
        // Wakes up smiling with joyful bounce & happy crescent eyes tracking returning pointer
        tRot = sx * 4.5 + wakeMotion.rotOffset;
        tScX *= 1.028;
        tScY *= 1.028;
        tLH *= wakeMotion.heightMul;
        tRH *= wakeMotion.heightMul;
        tLW *= wakeMotion.widthMul;
        tRW *= wakeMotion.widthMul;
        tLY = -D * 0.024 + wakeMotion.eyeBounceY;
        tRY = -D * 0.024 + wakeMotion.eyeBounceY;
        tLT -= 7;
        tRT += 7;
        tArcBottom = 0.95;
      } else if (rt >= 0) {
        switch (R.type) {
          case 'wink':
            if (R.dir < 0) {
              tLH *= 1 - b * 0.88;
              tLW *= 1 + b * 0.2;
              tLT -= b * 7;
              tRH *= 1 + b * 0.06;
            } else {
              tRH *= 1 - b * 0.88;
              tRW *= 1 + b * 0.2;
              tRT += b * 7;
              tLH *= 1 + b * 0.06;
            }
            tRot += R.dir * b * 4;
            break;
          case 'surprise':
            tScX *= 1 + b * 0.03;
            tScY *= 1 + b * 0.03;
            tLW *= 1 + b * 0.22;
            tRW *= 1 + b * 0.22;
            tLH *= 1 + b * 0.16;
            tRH *= 1 + b * 0.16;
            break;
          case 'happy':
            tScX *= 1 + b * 0.025;
            tScY *= 1 + b * 0.025;
            tLH *= 1 - b * (0.58 - Math.sin(rt * Math.PI * 3) * 0.05);
            tRH *= 1 - b * (0.58 - Math.sin(rt * Math.PI * 3) * 0.05);
            tLW *= 1 + b * 0.26;
            tRW *= 1 + b * 0.26;
            tLY = tRY = -b * (D * 0.026 + Math.abs(Math.sin(rt * Math.PI * 3)) * D * 0.01);
            tLT -= b * 7;
            tRT += b * 7;
            tArcBottom = b;
            break;
          case 'glance':
            tLW *= 1 + b * 0.1;
            tRH *= 1 - b * 0.3;
            tRW *= 1 + b * 0.14;
            tLT -= b * 8;
            tRT += b * 5;
            break;
          case 'sleepy':
            tScY *= 1 - b * 0.02;
            tLH *= 1 - b * 0.7;
            tRH *= 1 - b * 0.7;
            tLW *= 1 + b * 0.16;
            tRW *= 1 + b * 0.16;
            tLY = tRY = b * D * 0.026;
            tLT += b * 5;
            tRT -= b * 5;
            break;
          case 'think':
            tLH *= 1 - b * 0.22;
            tRH *= 1 - b * 0.1;
            tLT -= b * 6;
            tRT += b * 2;
            break;
          case 'judge':
            tLH *= 1 - b * 0.52;
            tRH *= 1 - b * 0.52;
            tLW *= 1 + b * 0.14;
            tRW *= 1 + b * 0.14;
            tLY = tRY = b * D * 0.018;
            tLT += b * 4;
            tRT -= b * 4;
            tLFlatTop = b * 0.9;
            tRFlatTop = b * 0.9;
            break;
          case 'perplexed':
            tLH *= 1 - b * 0.44;
            tLW *= 1 + b * 0.08;
            tLY = b * D * 0.022;
            tLT += b * 11;
            tLFlatTop = b * 0.75;
            tRH *= 1 + b * 0.15;
            tRW *= 1 + b * 0.12;
            tRY = -b * D * 0.02;
            tRT -= b * 8;
            break;
          case 'curious':
            tLH *= 1 + b * 0.08;
            tRH *= 1 - b * 0.16;
            tLT -= b * 5;
            tRT += b * 6;
            break;
          case 'peek':
            tLW *= 1 + b * 0.14;
            tRW *= 1 + b * 0.14;
            tLH *= 1 + b * 0.12;
            tRH *= 1 + b * 0.12;
            break;
          case 'content':
            tScX *= 1 + b * 0.015;
            tScY *= 1 + b * 0.015;
            tLH *= 1 - b * 0.48;
            tRH *= 1 - b * 0.48;
            tLW *= 1 + b * 0.2;
            tRW *= 1 + b * 0.2;
            tLY = tRY = -b * D * 0.02;
            tLT -= b * 5;
            tRT += b * 5;
            tArcBottom = b * 0.85;
            break;
        }
      }

      // Smoothly damp all expression channels so transitions between ANY two animations are seamless
      const rot = damp(EROT, tRot, 0.14, dt);
      const scX = damp(ESCX, tScX, 0.14, dt);
      const scY = damp(ESCY, tScY, 0.14, dt);
      let lW = damp(ELW, tLW, 0.12, dt);
      let lH = damp(ELH, tLH, 0.12, dt);
      let rW = damp(ERW, tRW, 0.12, dt);
      let rH = damp(ERH, tRH, 0.12, dt);
      const lY = damp(ELY, tLY, 0.12, dt);
      const rY = damp(ERY, tRY, 0.12, dt);
      const lT = damp(ELT, tLT, 0.12, dt);
      const rT = damp(ERT, tRT, 0.12, dt);
      const arcBottom = Math.max(0, damp(EARC, tArcBottom, 0.12, dt));
      const lFlatTop = Math.max(0, damp(ELFLAT, tLFlatTop, 0.12, dt));
      const rFlatTop = Math.max(0, damp(ERFLAT, tRFlatTop, 0.12, dt));

      // Apply natural blinks only while awake and not running special states
      if (currentPresence === 'awake' && !BL.on && !R.on && now >= BL.next) {
        BL.on = true;
        BL.t0 = now;
        if (BL.doubleLeft === 0 && Math.random() < 0.28) {
          BL.doubleLeft = 1;
        }
      }
      if (BL.on) {
        const t = (now - BL.t0) / 210;
        if (t >= 1) {
          BL.on = false;
          if (BL.doubleLeft > 0) {
            BL.doubleLeft -= 1;
            BL.next = now + 150;
          } else {
            BL.next = now + 2400 + Math.random() * 2800;
          }
        } else {
          const c = bell(t);
          lH *= 1 - c * 0.88;
          rH *= 1 - c * 0.88;
          lW *= 1 + c * 0.14;
          rW *= 1 + c * 0.14;
        }
      }

      const thx = sx * 0.94;
      const thy = sy * 0.9;
      const offX = Math.sin(thx) * D * 0.192;
      const offY = Math.sin(thy) * D * 0.168;
      const lsx = clampGaze(sx - 0.17);
      const rsx = clampGaze(sx + 0.17);
      const lr = Math.min(1.1, Math.hypot(lsx, sy * 0.96));
      const rr = Math.min(1.1, Math.hypot(rsx, sy * 0.96));
      const les = Math.max(0.7, 1 - Math.pow(lr, 1.5) * 0.28);
      const res = Math.max(0.7, 1 - Math.pow(rr, 1.5) * 0.28);
      const lfx = Math.max(0.68, Math.cos(lsx * 0.74));
      const rfx = Math.max(0.68, Math.cos(rsx * 0.74));
      const vfy = Math.max(0.78, Math.cos(thy * 0.66));
      const gr = Math.min(1, Math.hypot(sx, sy));
      const ge = 1 - Math.pow(gr, 1.5) * 0.24;
      const gap = baseGap * Math.max(0.82, Math.cos(thx * 0.6)) * (0.87 + 0.13 * ge);
      const lw = Math.max(4, eW * lW * les * lfx);
      const lh = Math.max(4, eH * lH * les * vfy);
      const rw = Math.max(4, eW * rW * res * rfx);
      const rh = Math.max(4, eH * rH * res * vfy);
      const targetBobY =
        reduceMotion || mOpen
          ? 0
          : sleepMotion
            ? sleepMotion.bobY
            : awayMotion
              ? awayMotion.bobY
              : Math.sin(now * 0.00145) * D * 0.011;
      const idleBobY = damp(BOB_Y, targetBobY, 0.24, dt);

      if (botRef.current) {
        const botTf = `translate3d(${(bx * D * 0.038).toFixed(2)}px,${(by * D * 0.038 + idleBobY).toFixed(2)}px,0) rotate(${rot.toFixed(2)}deg) scale(${scX.toFixed(4)},${scY.toFixed(4)})`;
        if (botTf !== lastBotTf) {
          lastBotTf = botTf;
          botRef.current.style.transform = botTf;
        }
      }

      setEye(leftEyeRef.current, lw, lh, offX - gap / 2 - lw / 2, offY + lY - lh / 2, lT, arcBottom, lFlatTop);
      setEye(rightEyeRef.current, rw, rh, offX + gap / 2 - rw / 2, offY + rY - rh / 2, rT, arcBottom, rFlatTop);

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      document.removeEventListener('mouseleave', onFrameLeave);
      document.removeEventListener('mouseenter', onFrameEnter);
      window.removeEventListener('mouseout', onWindowMouseOut);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('touchstart', onTouchActivity);
      window.removeEventListener('keydown', onKeyActivity);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', resizeSnow);
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    unlockOrbitAudio();
    let idx = Math.floor(Math.random() * POOL.length);
    if (idx === lastIndexRef.current) idx = (idx + 1) % POOL.length;
    lastIndexRef.current = idx;
    triggerReaction(POOL[idx], e.clientX);
    onBotClick?.();
  };

  const isVisible = bootPhase === 'pop' || bootPhase === 'ready';
  const leftPx = (horizontalPercent / 100) * viewportWidth - botSize / 2;
  const topPx = botCenterY - botSize / 2;

  return (
    <>
      <canvas ref={snowRef} className="fixed inset-0 w-full h-full pointer-events-none z-0" aria-hidden="true" />

      <div
        ref={wrapRef}
        data-testid="orbit-bot-wrapper"
        className="absolute left-0 top-0 z-40"
        style={{
          width: `${botSize.toFixed(2)}px`,
          height: `${botSize.toFixed(2)}px`,
          transform: `translate3d(${leftPx.toFixed(2)}px, ${topPx.toFixed(2)}px, 0)`,
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
          willChange: 'transform',
          transition: animateStageTransition
            ? 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1), width 500ms cubic-bezier(0.22, 1, 0.36, 1), height 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease-out'
            : 'opacity 220ms ease-out',
        }}
      >
        <div
          ref={scaleWrapRef}
          className={`relative w-full h-full ${bootPhase === 'pop' ? 'animate-bot-pop' : ''}`}
          style={{ ['--k' as string]: scale.toFixed(4) }}
        >
          {/* Single crisp fixed orbital ring around the sphere (zero glow, no satellite dot) */}
          <div data-testid="orbit-single-ring" className="orbit-ring-track" />

          {/* Bot sphere */}
          <button
            ref={botRef}
            type="button"
            data-reaction={activeReactionLabel}
            data-presence={presenceState}
            onClick={handleClick}
            aria-label={ariaLabel}
            className="relative w-full h-full rounded-full border-0 p-0 flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--acc)]"
            style={{
              backgroundColor: 'var(--bot)',
              willChange: 'transform',
              transition: 'background-color 0.45s var(--soft)',
            }}
          >
            <div className="relative w-full h-full pointer-events-none">
              <div
                ref={leftEyeRef}
                className="absolute left-1/2 top-1/2 overflow-hidden"
                style={{ backgroundColor: 'var(--eye)', willChange: 'transform, width, height' }}
              />
              <div
                ref={rightEyeRef}
                className="absolute left-1/2 top-1/2 overflow-hidden"
                style={{ backgroundColor: 'var(--eye)', willChange: 'transform, width, height' }}
              />
            </div>

            {/* Seasonal Santa hat (shown Dec 1 – Jan 6 or #natale) */}
            <svg
              className="hidden [.xmas_&]:block absolute left-[19%] -top-[31%] w-[57%] overflow-visible origin-[50%_90%] -rotate-[13deg] pointer-events-none hat-sway"
              viewBox="0 0 100 80"
              aria-hidden="true"
            >
              <path d="M8 62C10 30 36 8 66 8c10 0 16 6 18 16 3 14 7 26 10 38z" fill="#E53935" />
              <rect x="2" y="56" width="96" height="20" rx="10" fill="#fff" />
              <circle cx="84" cy="14" r="10" fill="#fff" />
            </svg>
          </button>

          {/* Sleeping Zzz floating above Orb's head (only visible animation while asleep) */}
          {presenceState === 'sleeping' && (
            <div
              data-testid="orb-sleep-zzz"
              className="absolute left-[74%] -top-[10%] pointer-events-none z-30 select-none font-display font-bold"
              style={{
                color: 'var(--fg)',
                transform: 'scale(var(--k, 1))',
                transformOrigin: 'bottom left',
              }}
              aria-hidden="true"
            >
              <span className="orb-sleep-z-1 absolute left-0 bottom-0 text-[15px] leading-none">Z</span>
              <span className="orb-sleep-z-2 absolute left-1.5 bottom-0 text-[13px] leading-none opacity-0">z</span>
              <span className="orb-sleep-z-3 absolute left-2.5 bottom-0 text-[11px] leading-none opacity-0">z</span>
            </div>
          )}

          {/* Thinking bubble */}
          <div
            id="think-bubble"
            ref={thinkRef}
            className="absolute left-[calc(86%-10px)] top-[calc(17%-84px)] pointer-events-none z-20"
            aria-hidden="true"
          >
            <svg
              width="130"
              height="96"
              viewBox="0 0 130 96"
              className="block overflow-visible"
              style={{
                transform: 'scale(var(--k, 1))',
                transformOrigin: '10px 84px',
                fill: 'var(--fg)',
              }}
            >
              <circle className="p t2" cx="10" cy="84" r="4.5" />
              <circle className="p t1" cx="26" cy="68" r="7.5" />
              <g className="p cl">
                <ellipse cx="79" cy="31" rx="38" ry="16" />
                <circle cx="57" cy="25" r="15" />
                <circle cx="80" cy="18" r="19" />
                <circle cx="103" cy="25" r="15" />
                <circle cx="44" cy="33" r="12" />
                <circle cx="116" cy="33" r="12" />
                <circle cx="60" cy="41" r="12" />
                <circle cx="80" cy="44" r="12" />
                <circle cx="100" cy="41" r="12" />
                <circle className="d" cx="64" cy="32" r="4.2" />
                <circle className="d" cx="80" cy="32" r="4.2" />
                <circle className="d" cx="96" cy="32" r="4.2" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </>
  );
});
