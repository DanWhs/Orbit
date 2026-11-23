import { memo, useEffect, useRef, useState } from 'react';
import type {
  BootPhase,
  BotReactionType,
  OrbPoseTarget,
  OrbPresenceState,
  OrbStepEvent,
  OrbStepResponse,
} from '../types/orbit';
import { damp, ORB_RING_RADIUS_VB, ORB_RING_STROKE_VB } from '../utils/layoutMath';
import { playPresenceSound, playReactionSound, unlockOrbitAudio } from '../utils/orbSounds';

interface OrbitBotProps {
  bootPhase: BootPhase;
  botSize: number;
  baseBotSize?: number;
  botCenterY: number;
  horizontalPercent: number; // 50 normally, ~24 on desktop when side menu is open, ~27 in standby
  viewportWidth: number;
  scale: number;
  animateStageTransition: boolean;
  menuOpen: boolean;
  paused?: boolean;
  hidden?: boolean;
  standbyMode?: boolean;
  supportMode?: boolean;
  isFocused: boolean;
  hasQuery?: boolean;
  caretRatio: number;
  lastTypedTimestamp?: number;
  reduceMotion?: boolean;
  reactionSignal: { type: BotReactionType; nonce: number } | null;
  ariaLabel: string;
  onBotClick?: () => void;
}

const DEFAULT_POSE: OrbPoseTarget = {
  dx: 0,
  dy: 0,
  tRot: 0,
  tScX: 1,
  tScY: 1,
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
  tBobY: 0,
  followPointerLive: true,
  allowNaturalBlink: true,
};

export const OrbitBot = memo(function OrbitBot({
  bootPhase,
  botSize,
  baseBotSize,
  botCenterY,
  horizontalPercent,
  viewportWidth,
  scale,
  animateStageTransition,
  menuOpen,
  paused = false,
  hidden = false,
  standbyMode = false,
  supportMode = false,
  isFocused,
  hasQuery = false,
  caretRatio,
  lastTypedTimestamp = 0,
  reduceMotion,
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

  const safeBaseSize = Math.max(44, baseBotSize || Math.round(botSize / Math.max(0.1, scale)));
  const renderSize = viewportWidth >= 768 ? Math.max(520, Math.round(botSize)) : safeBaseSize;
  const visualScale = (botSize / Math.max(1, renderSize)) * (hidden ? 0.94 : 1);
  const innerBubbleScale = renderSize / safeBaseSize;

  const propsRef = useRef({
    bootPhase,
    renderSize,
    botCenterY,
    horizontalPercent,
    viewportWidth,
    isFocused,
    hasQuery,
    caretRatio,
    lastTypedTimestamp,
    reduceMotion,
    menuOpen,
    paused,
    standbyMode,
    supportMode,
  });
  propsRef.current = {
    bootPhase,
    renderSize,
    botCenterY,
    horizontalPercent,
    viewportWidth,
    isFocused,
    hasQuery,
    caretRatio,
    lastTypedTimestamp,
    reduceMotion,
    menuOpen,
    paused,
    standbyMode,
    supportMode,
  };

  const sessionIdRef = useRef<string>(
    `main-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
  );
  const pendingEventRef = useRef<OrbStepEvent | null>(null);
  const urgentSyncRef = useRef<() => void>(() => {});
  const resumeLoopRef = useRef<() => void>(() => {});
  const bootWinkTriggeredRef = useRef(false);

  // Trigger boot wink via backend step engine
  useEffect(() => {
    if (bootPhase === 'pop' && !bootWinkTriggeredRef.current) {
      bootWinkTriggeredRef.current = true;
      const timer = setTimeout(() => {
        pendingEventRef.current = {
          kind: 'signal',
          reactionType: 'wink',
          dir: 1,
          silent: true,
          nonce: Date.now() + Math.random(),
        };
        urgentSyncRef.current();
      }, 240);
      return () => clearTimeout(timer);
    }
  }, [bootPhase]);

  // Trigger external reaction signals (e.g. happy on submit, judge/perplexed on settings edit)
  useEffect(() => {
    if (reactionSignal) {
      pendingEventRef.current = {
        kind: 'signal',
        reactionType: reactionSignal.type,
        dir: 1,
        silent: false,
        nonce: reactionSignal.nonce,
      };
      urgentSyncRef.current();
    }
  }, [reactionSignal]);

  // Immediate backend sync on structural mode transitions (Standby / Menu / BootReady)
  useEffect(() => {
    if (!paused) {
      resumeLoopRef.current();
      urgentSyncRef.current();
    }
  }, [standbyMode, supportMode, menuOpen, paused, bootPhase, hasQuery]);

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

  // Main 60fps generic spring renderer + pointer listener synced with backend mascot engine
  useEffect(() => {
    let tx = 0;
    let ty = 0;
    let lastPtr = -10000;
    let drag = false;
    let lastTime = performance.now();
    let thinkOn = false;
    let rafId = 0;
    let isDisposed = false;
    const reducedMotionMq = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    let pointerOutside = false;
    let isTouchMode = window.matchMedia?.('(pointer: coarse) and (hover: none)')?.matches ?? false;
    let lastActivityAt = performance.now();
    let lastTypedAt = -10000;
    let prevTypedTs = propsRef.current.lastTypedTimestamp;

    let serverPose: OrbPoseTarget = { ...DEFAULT_POSE };
    let serverPresence: OrbPresenceState = 'awake';
    let serverReactionLabel = 'idle';
    let inFlight = false;
    let lastSyncSentAt = 0;

    const GX = { p: 0, v: 0 };
    const GY = { p: 0, v: 0 };
    const BX = { p: 0, v: 0 };
    const BY = { p: 0, v: 0 };
    const BOB_Y = { p: 0, v: 0 };
    const BL = { on: false, t0: 0, next: performance.now() + 2400, doubleLeft: 0 };

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

    const syncWithBackend = async () => {
      if (isDisposed || inFlight || propsRef.current.paused) return;
      inFlight = true;
      lastSyncSentAt = performance.now();

      const eventToSend = pendingEventRef.current;
      pendingEventRef.current = null;

      const cur = propsRef.current;
      const now = performance.now();
      if (cur.lastTypedTimestamp > prevTypedTs) {
        prevTypedTs = cur.lastTypedTimestamp;
        lastTypedAt = now;
        lastActivityAt = now;
      }
      const effectiveReduceMotion = cur.reduceMotion ?? Boolean(reducedMotionMq?.matches);
      try {
        const res = await fetch('/api/orb/step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            variant: 'main',
            nowMs: now,
            botSize: cur.renderSize,
            bootReady: cur.bootPhase === 'ready',
            menuOpen: cur.menuOpen,
            standbyMode: cur.standbyMode,
            supportMode: cur.supportMode,
            hasQuery: cur.hasQuery,
            isFocused: cur.isFocused,
            caretRatio: cur.caretRatio,
            drag,
            reduceMotion: effectiveReduceMotion,
            isTouchMode,
            pointerOutside,
            pointerDx: tx,
            pointerDy: ty,
            lastActivityAgoMs: Math.max(0, now - lastActivityAt),
            lastPtrAgoMs: Math.max(0, now - lastPtr),
            lastTypedAgoMs: lastTypedAt > 0 ? Math.max(0, now - lastTypedAt) : 999999,
            event: eventToSend,
          }),
        });
        if (!res.ok || isDisposed) return;
        const data = (await res.json()) as OrbStepResponse;
        serverPose = data.poseTarget;

        if (data.presenceState !== serverPresence) {
          serverPresence = data.presenceState;
          setPresenceState(data.presenceState);
        }
        if (data.activeReaction !== serverReactionLabel) {
          serverReactionLabel = data.activeReaction;
          setActiveReactionLabel(data.activeReaction);
        }
        if (data.thinkActive !== thinkOn) {
          thinkOn = data.thinkActive;
          thinkRef.current?.classList.toggle('on', thinkOn);
        }
        if (data.stopAllAnimations && BL.on) {
          BL.on = false;
        }
        if (data.soundCue) {
          if (data.soundCue.channel === 'presence') {
            playPresenceSound(data.soundCue.id as OrbPresenceState);
          } else if (data.soundCue.channel === 'reaction') {
            playReactionSound(data.soundCue.id as BotReactionType, data.soundCue.ambient);
          }
        }
      } catch {
        // Ignore transient offline errors gracefully
      } finally {
        inFlight = false;
        if (pendingEventRef.current && !isDisposed) {
          void syncWithBackend();
        }
      }
    };

    urgentSyncRef.current = () => {
      void syncWithBackend();
    };

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
        if (pointerOutside) {
          pointerOutside = false;
          void syncWithBackend();
        }
      }
      if (!propsRef.current.standbyMode && (!propsRef.current.hasQuery || propsRef.current.menuOpen)) {
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
        !propsRef.current.standbyMode &&
        (!propsRef.current.hasQuery ||
          propsRef.current.menuOpen ||
          !(e.target as HTMLElement)?.closest('#search-ui'))
      ) {
        pointAt(e.clientX, e.clientY);
      }
    };
    const onPointerUp = () => {
      drag = false;
      lastActivityAt = performance.now();
    };
    const onFrameLeave = () => {
      if (!isTouchMode && !pointerOutside) {
        pointerOutside = true;
        void syncWithBackend();
      }
    };
    const onFrameEnter = (e: MouseEvent) => {
      if (!isTouchMode) {
        const wasOut = pointerOutside;
        pointerOutside = false;
        lastActivityAt = performance.now();
        if (!propsRef.current.standbyMode && (e.clientX !== 0 || e.clientY !== 0)) {
          pointAt(e.clientX, e.clientY);
        }
        if (wasOut) void syncWithBackend();
      }
    };
    const onWindowMouseOut = (e: MouseEvent) => {
      const toEl = (e as MouseEvent & { toElement?: EventTarget | null }).toElement;
      if (!e.relatedTarget && !toEl && !isTouchMode && !pointerOutside) {
        pointerOutside = true;
        void syncWithBackend();
      }
    };
    const onWindowBlur = () => {
      if (!isTouchMode && !propsRef.current.menuOpen && !propsRef.current.standbyMode && !pointerOutside) {
        pointerOutside = true;
        void syncWithBackend();
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
      if (document.hidden && !isTouchMode && !propsRef.current.standbyMode) {
        pointerOutside = true;
        void syncWithBackend();
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
    void syncWithBackend();

    const tick = (now: number) => {
      if (isDisposed || propsRef.current.paused) {
        rafId = 0;
        return;
      }
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Sync authoritative pose & presence periodically (~20Hz) without piling requests
      if (!inFlight && now - lastSyncSentAt >= 48) {
        void syncWithBackend();
      }

      const { renderSize: Draw } = propsRef.current;

      // Holiday snow rendering (paused while sleeping)
      if (snowCx && serverPresence !== 'sleeping' && document.documentElement.classList.contains('xmas')) {
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

      const targetDx = serverPose.followPointerLive ? tx : serverPose.dx;
      const targetDy = serverPose.followPointerLive ? ty : serverPose.dy;

      const sx = damp(GX, targetDx, 0.17, dt);
      const sy = damp(GY, targetDy, 0.17, dt);
      const bx = damp(BX, targetDx, 0.36, dt);
      const by = damp(BY, targetDy, 0.36, dt);

      const D = Math.max(44, Draw);
      const eW = D * 0.188;
      const eH = D * 0.405;
      const baseGap = D * 0.278;

      const tLT = -4.2 - sx * 6.5 + serverPose.tLTBias;
      const tRT = 4.2 - sx * 6.5 + serverPose.tRTBias;

      const rot = damp(EROT, serverPose.tRot, 0.14, dt);
      const scX = damp(ESCX, serverPose.tScX, 0.14, dt);
      const scY = damp(ESCY, serverPose.tScY, 0.14, dt);
      let lW = damp(ELW, serverPose.tLW, 0.12, dt);
      let lH = damp(ELH, serverPose.tLH, 0.12, dt);
      let rW = damp(ERW, serverPose.tRW, 0.12, dt);
      let rH = damp(ERH, serverPose.tRH, 0.12, dt);
      const lY = damp(ELY, serverPose.tLY, 0.12, dt);
      const rY = damp(ERY, serverPose.tRY, 0.12, dt);
      const lT = damp(ELT, tLT, 0.12, dt);
      const rT = damp(ERT, tRT, 0.12, dt);
      const arcBottom = Math.max(0, damp(EARC, serverPose.tArcBottom, 0.12, dt));
      const lFlatTop = Math.max(0, damp(ELFLAT, serverPose.tLFlatTop, 0.12, dt));
      const rFlatTop = Math.max(0, damp(ERFLAT, serverPose.tRFlatTop, 0.12, dt));

      if (serverPose.allowNaturalBlink && !BL.on && now >= BL.next) {
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
      const idleBobY = damp(BOB_Y, serverPose.tBobY, 0.24, dt);

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

    resumeLoopRef.current = () => {
      if (!isDisposed && !propsRef.current.paused && rafId === 0) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };

    if (!propsRef.current.paused) {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      isDisposed = true;
      if (rafId) cancelAnimationFrame(rafId);
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
    const botCenterX =
      (propsRef.current.horizontalPercent / 100) * (propsRef.current.viewportWidth || window.innerWidth);
    const dir = e.clientX < botCenterX ? -1 : 1;
    pendingEventRef.current = {
      kind: 'click',
      dir,
      nonce: Date.now() + Math.random(),
    };
    urgentSyncRef.current();
    onBotClick?.();
  };

  const isVisible = bootPhase === 'pop' || bootPhase === 'ready';
  const leftPx = (horizontalPercent / 100) * viewportWidth - renderSize / 2;
  const topPx = botCenterY - renderSize / 2;

  return (
    <>
      <canvas ref={snowRef} className="fixed inset-0 w-full h-full pointer-events-none z-0" aria-hidden="true" />

      <div
        ref={wrapRef}
        data-testid="orbit-bot-wrapper"
        className="absolute left-0 top-0 z-40"
        style={{
          width: `${renderSize.toFixed(2)}px`,
          height: `${renderSize.toFixed(2)}px`,
          transformOrigin: 'center center',
          transform: `translate3d(${leftPx.toFixed(2)}px, ${topPx.toFixed(2)}px, 0) scale(${visualScale.toFixed(4)})`,
          opacity: isVisible && !hidden ? 1 : 0,
          pointerEvents: isVisible && !hidden ? 'auto' : 'none',
          willChange: 'transform, opacity',
          transition: animateStageTransition
            ? 'transform 720ms cubic-bezier(0.16, 1, 0.3, 1), opacity 280ms cubic-bezier(0.16, 1, 0.3, 1)'
            : 'opacity 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          ref={scaleWrapRef}
          className={`relative w-full h-full ${bootPhase === 'pop' ? 'animate-bot-pop' : ''}`}
          style={{ ['--k' as string]: innerBubbleScale.toFixed(4) }}
        >
          {/* Single crisp proportional orbital ring */}
          <svg
            data-testid="orbit-single-ring"
            viewBox="0 0 100 100"
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 w-[126%] h-[126%] -translate-x-1/2 -translate-y-1/2 pointer-events-none overflow-visible"
          >
            <circle
              cx="50"
              cy="50"
              r={ORB_RING_RADIUS_VB}
              fill="none"
              strokeWidth={ORB_RING_STROKE_VB}
              style={{
                stroke: 'color-mix(in srgb, var(--acc) 82%, transparent)',
                transition: 'stroke 0.45s var(--soft)',
              }}
            />
          </svg>

          {/* Bot sphere */}
          <button
            ref={botRef}
            type="button"
            tabIndex={hidden ? -1 : 0}
            aria-hidden={hidden || undefined}
            data-reaction={activeReactionLabel}
            data-presence={presenceState}
            data-standby={standbyMode ? 'true' : 'false'}
            data-support={supportMode ? 'true' : 'false'}
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

          {/* Sleeping Zzz floating above Orb's head */}
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
            className="absolute left-[86%] top-[17%] w-0 h-0 pointer-events-none z-20"
            aria-hidden="true"
          >
            <svg
              width="130"
              height="96"
              viewBox="0 0 130 96"
              className="block overflow-visible absolute -left-[10px] -top-[84px]"
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
