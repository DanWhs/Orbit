import { memo, useEffect, useRef, useState } from 'react';
import type { BotReactionType, OrbStepEvent } from '../types/orbit';
import { damp, ORB_RING_RADIUS_VB, ORB_RING_STROKE_VB } from '../utils/layoutMath';
import { OrbPollController } from '../utils/orbClientSync';
import {
  computeLocalOrbPose,
  getReactionDuration,
  type LocalReactionState,
} from '../utils/orbPoseFallback';
import { playReactionSound, unlockOrbitAudio } from '../utils/orbSounds';

interface LiveOrbMarkProps {
  size?: number;
  reduceMotion?: boolean;
  reactionSignal?: { type: BotReactionType; nonce: number } | null;
  forceReaction?: BotReactionType | null;
  ariaLabel?: string;
}

const MINI_CLICK_POOL: BotReactionType[] = ['wink', 'happy', 'surprise', 'glance'];

export const LiveOrbMark = memo(function LiveOrbMark({
  size = 40,
  reduceMotion,
  reactionSignal = null,
  forceReaction = null,
  ariaLabel = 'Orbit',
}: LiveOrbMarkProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLButtonElement>(null);
  const leftEyeRef = useRef<HTMLDivElement>(null);
  const rightEyeRef = useRef<HTMLDivElement>(null);

  const [reactionLabel, setReactionLabel] = useState<string>(forceReaction || 'idle');
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  const forceReactionRef = useRef(forceReaction);
  forceReactionRef.current = forceReaction;

  const sessionIdRef = useRef<string>(
    `mini-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
  );
  const triggerLocalReactionRef = useRef<(event: OrbStepEvent) => void>(() => {});

  useEffect(() => {
    if (reactionSignal) {
      triggerLocalReactionRef.current({
        kind: 'signal',
        reactionType: reactionSignal.type,
        dir: 1,
        silent: true,
        nonce: reactionSignal.nonce,
      });
    }
  }, [reactionSignal]);

  useEffect(() => {
    let tx = 0;
    let ty = 0;
    let lastTime = performance.now();
    let rafId = 0;
    let isDisposed = false;
    let serverReactionLabel = 'idle';
    let lastClickIdx = -1;
    const reducedMotionMq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const forcedType = forceReactionRef.current;
    const forcedDur = getReactionDuration(forcedType || 'wink', 'mini');
    const localReaction: LocalReactionState = {
      on: Boolean(forcedType),
      type: forcedType || 'wink',
      t0: forcedType ? performance.now() - forcedDur * 0.42 : performance.now(),
      dur: forcedDur,
      dir: 1,
    };

    const pollController = new OrbPollController({
      endpoint: '/api/orb/step',
      baseIntervalMs: 2800,
      maxBackoffMs: 30000,
    });

    const GX = { p: 0, v: 0 };
    const GY = { p: 0, v: 0 };
    const BX = { p: 0, v: 0 };
    const BY = { p: 0, v: 0 };
    const EROT = { p: 0, v: 0 };
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
    const BL = { on: false, t0: 0, next: performance.now() + 2100 };

    const startLocalReaction = (ev: OrbStepEvent) => {
      const now = performance.now();
      let chosen: BotReactionType = 'wink';
      if (ev.kind === 'click') {
        let idx = Math.floor(Math.random() * MINI_CLICK_POOL.length);
        if (idx === lastClickIdx) idx = (idx + 1) % MINI_CLICK_POOL.length;
        lastClickIdx = idx;
        chosen = MINI_CLICK_POOL[idx];
      } else if (ev.kind === 'signal' && ev.reactionType) {
        chosen = ev.reactionType;
      }
      localReaction.on = true;
      localReaction.type = chosen;
      localReaction.t0 = now;
      localReaction.dur = getReactionDuration(chosen, 'mini');
      localReaction.dir = ev.dir && ev.dir < 0 ? -1 : 1;
      setReactionLabel(chosen);
      if (!ev.silent) {
        playReactionSound(chosen, false);
      }
    };

    const syncWithBackend = async (urgent = false) => {
      if (isDisposed || forceReactionRef.current) return;
      if (urgent) pollController.markUrgent();
      const data = await pollController.step(
        (eventToSend) => ({
          sessionId: sessionIdRef.current,
          variant: 'mini',
          nowMs: performance.now(),
          botSize: Math.max(30, sizeRef.current),
          bootReady: true,
          menuOpen: true,
          standbyMode: false,
          hasQuery: false,
          isFocused: false,
          caretRatio: 0,
          drag: false,
          reduceMotion: reduceMotionRef.current ?? Boolean(reducedMotionMq?.matches),
          isTouchMode: false,
          pointerOutside: false,
          pointerDx: tx,
          pointerDy: ty,
          lastActivityAgoMs: 0,
          lastPtrAgoMs: 0,
          event: eventToSend,
        }),
        { urgent }
      );
      if (!data || isDisposed) return;
      if (data.activeReaction !== serverReactionLabel) {
        serverReactionLabel = data.activeReaction;
        setReactionLabel(data.activeReaction);
      }
    };

    triggerLocalReactionRef.current = (ev: OrbStepEvent) => {
      startLocalReaction(ev);
      if (!forceReactionRef.current) {
        pollController.queueEvent({
          ...ev,
          reactionType: localReaction.type,
        });
        void syncWithBackend(true);
      }
    };

    const pointAt = (clientX: number, clientY: number) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const norm = Math.max(180, Math.min(window.innerWidth, window.innerHeight) * 0.45);
      const dx = (clientX - cx) / norm;
      const dy = (clientY - cy) / norm;
      const d = Math.hypot(dx, dy);
      if (d > 1e-4) {
        const e = Math.tanh(d * 1.05);
        tx = (dx / d) * e;
        ty = (dy / d) * e;
      } else {
        tx = 0;
        ty = 0;
      }
    };

    const onPointerMove = (e: PointerEvent) => pointAt(e.clientX, e.clientY);
    const onPointerDown = (e: PointerEvent) => pointAt(e.clientX, e.clientY);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });

    const sine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
    const bell = (t: number) => (t <= 0 || t >= 1 ? 0 : sine(Math.sin(t * Math.PI)));
    const clampGaze = (v: number) => Math.max(-1.15, Math.min(1.15, v));

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
      el.style.width = `${w.toFixed(1)}px`;
      el.style.height = `${h.toFixed(1)}px`;
      el.style.borderRadius = `${rt.toFixed(1)}px ${rt.toFixed(1)}px ${rb.toFixed(1)}px ${rb.toFixed(1)}px`;
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${tilt.toFixed(2)}deg)`;
    };

    if (!forceReactionRef.current) {
      void syncWithBackend(true);
    }

    const tick = (now: number) => {
      if (isDisposed) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (!forceReactionRef.current && pollController.shouldPollHeartbeat(Date.now())) {
        void syncWithBackend(false);
      }

      const D = Math.max(30, sizeRef.current);
      const isReduced = reduceMotionRef.current ?? Boolean(reducedMotionMq?.matches);

      // Keep sustained expressive look (e.g. confused Orb on 404 screen)
      if (forceReactionRef.current) {
        localReaction.on = true;
        localReaction.type = forceReactionRef.current;
        localReaction.dur = 2600;
        localReaction.t0 = now - 1100;
        localReaction.dir = 1;
      }

      const { pose: activePose } = computeLocalOrbPose({
        now,
        renderSize: D,
        tx,
        ty,
        variant: 'mini',
        standbyMode: false,
        supportMode: false,
        menuOpen: true,
        hasQuery: false,
        isFocused: false,
        caretRatio: 0,
        drag: false,
        reduceMotion: isReduced,
        lastTypedAgoMs: 999999,
        lastPtrAgoMs: 0,
        presence: 'awake',
        reaction: localReaction,
      });

      const targetDx = activePose.followPointerLive ? tx : activePose.dx;
      const targetDy = activePose.followPointerLive ? ty : activePose.dy;

      const sx = damp(GX, targetDx, 0.18, dt);
      const sy = damp(GY, targetDy, 0.18, dt);
      const bx = damp(BX, targetDx, 0.34, dt);
      const by = damp(BY, targetDy, 0.34, dt);

      const tLT = -4.2 - sx * 6.5 + activePose.tLTBias;
      const tRT = 4.2 - sx * 6.5 + activePose.tRTBias;

      const rot = damp(EROT, activePose.tRot, 0.14, dt);
      let lW = damp(ELW, activePose.tLW, 0.12, dt);
      let lH = damp(ELH, activePose.tLH, 0.12, dt);
      let rW = damp(ERW, activePose.tRW, 0.12, dt);
      let rH = damp(ERH, activePose.tRH, 0.12, dt);
      const lY = damp(ELY, activePose.tLY, 0.12, dt);
      const rY = damp(ERY, activePose.tRY, 0.12, dt);
      const lT = damp(ELT, tLT, 0.12, dt);
      const rT = damp(ERT, tRT, 0.12, dt);
      const arcBottom = Math.max(0, damp(EARC, activePose.tArcBottom, 0.12, dt));
      const lFlatTop = Math.max(0, damp(ELFLAT, activePose.tLFlatTop, 0.12, dt));
      const rFlatTop = Math.max(0, damp(ERFLAT, activePose.tRFlatTop, 0.12, dt));

      if (activePose.allowNaturalBlink && !BL.on && now >= BL.next) {
        BL.on = true;
        BL.t0 = now;
      }
      if (BL.on) {
        const bt = (now - BL.t0) / 200;
        if (bt >= 1) {
          BL.on = false;
          BL.next = now + 2300 + Math.random() * 2600;
        } else {
          const c = bell(bt);
          lH *= 1 - c * 0.88;
          rH *= 1 - c * 0.88;
          lW *= 1 + c * 0.14;
          rW *= 1 + c * 0.14;
        }
      }

      const eW = D * 0.188;
      const eH = D * 0.405;
      const baseGap = D * 0.278;
      const thx = sx * 0.94;
      const thy = sy * 0.9;
      const offX = Math.sin(thx) * D * 0.19;
      const offY = Math.sin(thy) * D * 0.165;
      const lsx = clampGaze(sx - 0.17);
      const rsx = clampGaze(sx + 0.17);
      const lfx = Math.max(0.68, Math.cos(lsx * 0.74));
      const rfx = Math.max(0.68, Math.cos(rsx * 0.74));
      const vfy = Math.max(0.78, Math.cos(thy * 0.66));
      const gap = baseGap * Math.max(0.82, Math.cos(thx * 0.6));
      const lw = Math.max(2.6, eW * lW * lfx);
      const lh = Math.max(2.6, eH * lH * vfy);
      const rw = Math.max(2.6, eW * rW * rfx);
      const rh = Math.max(2.6, eH * rH * vfy);

      if (botRef.current) {
        const bobY = isReduced ? 0 : Math.sin(now * 0.0018) * D * 0.018;
        botRef.current.style.transform = `translate3d(${(bx * D * 0.04).toFixed(2)}px,${(by * D * 0.04 + bobY).toFixed(2)}px,0) rotate(${rot.toFixed(2)}deg)`;
      }

      setEye(leftEyeRef.current, lw, lh, offX - gap / 2 - lw / 2, offY + lY - lh / 2, lT, arcBottom, lFlatTop);
      setEye(rightEyeRef.current, rw, rh, offX + gap / 2 - rw / 2, offY + rY - rh / 2, rT, arcBottom, rFlatTop);

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      pollController.dispose();
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  const handleClick = () => {
    unlockOrbitAudio();
    triggerLocalReactionRef.current({
      kind: 'click',
      dir: 1,
      nonce: Date.now() + Math.random(),
    });
  };

  return (
    <div
      ref={wrapRef}
      data-testid="settings-orb-logo"
      className="relative shrink-0"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg
        data-testid="settings-orb-ring"
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
      <button
        ref={botRef}
        type="button"
        tabIndex={0}
        data-reaction={reactionLabel}
        onClick={handleClick}
        aria-label={ariaLabel}
        className="relative w-full h-full rounded-full border-0 p-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--acc)]"
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
      </button>
    </div>
  );
});
