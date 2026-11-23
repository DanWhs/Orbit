import { memo, useEffect, useRef, useState } from 'react';
import { damp } from '../utils/layoutMath';
import { playReactionSound, unlockOrbitAudio } from '../utils/orbSounds';
import { BotReactionType } from './OrbitBot';

interface LiveOrbMarkProps {
  size?: number;
  reactionSignal?: { type: BotReactionType; nonce: number } | null;
  ariaLabel?: string;
}

const CLICK_POOL: BotReactionType[] = ['wink', 'happy', 'surprise', 'glance'];
const MARK_DURATIONS: Record<BotReactionType, number> = {
  wink: 680,
  surprise: 700,
  glance: 900,
  sleepy: 1100,
  think: 1800,
  happy: 850,
  judge: 1700,
  perplexed: 1750,
  curious: 1300,
  peek: 1150,
  content: 1050,
};

export const LiveOrbMark = memo(function LiveOrbMark({
  size = 40,
  reactionSignal = null,
  ariaLabel = 'Orbit',
}: LiveOrbMarkProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLButtonElement>(null);
  const leftEyeRef = useRef<HTMLDivElement>(null);
  const rightEyeRef = useRef<HTMLDivElement>(null);

  const [reactionLabel, setReactionLabel] = useState<string>('idle');
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const reactionRef = useRef<{ on: boolean; type: BotReactionType; t0: number; dur: number; dir: number }>({
    on: false,
    type: 'judge',
    t0: 0,
    dur: 1700,
    dir: 1,
  });
  const lastClickIdxRef = useRef(-1);

  const triggerReaction = (type: BotReactionType, silent = false) => {
    reactionRef.current = {
      on: true,
      type,
      t0: performance.now(),
      dur: MARK_DURATIONS[type] ?? 900,
      dir: 1,
    };
    setReactionLabel(type);
    if (!silent) {
      playReactionSound(type);
    }
  };

  useEffect(() => {
    if (reactionSignal) {
      triggerReaction(reactionSignal.type, true);
    }
  }, [reactionSignal]);

  useEffect(() => {
    let tx = 0;
    let ty = 0;
    let lastTime = performance.now();
    let rafId = 0;
    const reducedMotionMq = window.matchMedia?.('(prefers-reduced-motion: reduce)');

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

    const onPointerMove = (e: PointerEvent) => {
      pointAt(e.clientX, e.clientY);
    };
    const onPointerDown = (e: PointerEvent) => {
      pointAt(e.clientX, e.clientY);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });

    const sine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
    const bell = (t: number) => (t <= 0 || t >= 1 ? 0 : sine(Math.sin(t * Math.PI)));
    const sstep = (a: number, b: number, t: number) => {
      const k = Math.max(0, Math.min(1, (t - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };
    const hold = (t: number) => sstep(0, 0.16, t) * (1 - sstep(0.78, 1, t));
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

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const D = Math.max(30, sizeRef.current);
      const reduceMotion = Boolean(reducedMotionMq?.matches);

      let dx = tx;
      let dy = ty;
      let tRot = reduceMotion ? 0 : Math.sin(now * 0.001) * 1.1;
      let tLW = 1;
      let tLH = 1;
      let tRW = 1;
      let tRH = 1;
      let tLY = 0;
      let tRY = 0;
      let tArcBottom = 0;
      let tLFlatTop = 0;
      let tRFlatTop = 0;

      const R = reactionRef.current;
      let rt = -1;
      if (R.on) {
        rt = (now - R.t0) / R.dur;
        if (rt >= 1) {
          R.on = false;
          rt = -1;
          setReactionLabel('idle');
        }
      }

      const b =
        rt < 0
          ? 0
          : R.type === 'judge' || R.type === 'perplexed' || R.type === 'happy' || R.type === 'content'
            ? hold(rt)
            : bell(rt);

      if (rt >= 0) {
        if (R.type === 'judge') {
          dx = dx * (1 - b * 0.45) + 0.72 * b;
          dy = dy * (1 - b * 0.45) + 0.06 * b;
          tRot = -b * (6.2 + Math.sin(rt * Math.PI * 2) * 1.4);
          tLH *= 1 - b * 0.52;
          tRH *= 1 - b * 0.52;
          tLW *= 1 + b * 0.14;
          tRW *= 1 + b * 0.14;
          tLY = tRY = b * D * 0.02;
          tLFlatTop = b * 0.9;
          tRFlatTop = b * 0.9;
        } else if (R.type === 'perplexed') {
          dx = dx * (1 - b * 0.45) + 0.66 * b;
          dy = dy * (1 - b * 0.45) - 0.08 * b;
          tRot = b * (8.0 + Math.sin(rt * Math.PI * 3) * 1.6);
          tLH *= 1 - b * 0.44;
          tLW *= 1 + b * 0.08;
          tLY = b * D * 0.022;
          tLFlatTop = b * 0.75;
          tRH *= 1 + b * 0.15;
          tRW *= 1 + b * 0.12;
          tRY = -b * D * 0.02;
        } else if (R.type === 'happy') {
          tLH *= 1 - b * 0.56;
          tRH *= 1 - b * 0.56;
          tLW *= 1 + b * 0.24;
          tRW *= 1 + b * 0.24;
          tLY = tRY = -b * D * 0.025;
          tArcBottom = b;
        } else if (R.type === 'wink') {
          tRH *= 1 - b * 0.88;
          tRW *= 1 + b * 0.2;
          tRot += b * 4.5;
        } else if (R.type === 'surprise') {
          tLW *= 1 + b * 0.22;
          tRW *= 1 + b * 0.22;
          tLH *= 1 + b * 0.16;
          tRH *= 1 + b * 0.16;
        } else if (R.type === 'glance') {
          dx = dx * (1 - b) + 0.8 * b;
          dy = dy * (1 - b) - 0.25 * b;
          tRot = b * 6.5;
        }
      }

      const sx = damp(GX, dx, 0.18, dt);
      const sy = damp(GY, dy, 0.18, dt);
      const bx = damp(BX, dx, 0.34, dt);
      const by = damp(BY, dy, 0.34, dt);

      let tLT = -4.2 - sx * 6.5;
      let tRT = 4.2 - sx * 6.5;
      if (rt >= 0 && R.type === 'judge') {
        tLT += b * 4;
        tRT -= b * 4;
      } else if (rt >= 0 && R.type === 'perplexed') {
        tLT += b * 10;
        tRT -= b * 7;
      } else if (rt >= 0 && R.type === 'happy') {
        tLT -= b * 7;
        tRT += b * 7;
      }

      const rot = damp(EROT, tRot, 0.14, dt);
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

      if (!BL.on && !R.on && now >= BL.next) {
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

      const eW = D * 0.19;
      const eH = D * 0.41;
      const baseGap = D * 0.28;
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
        const bobY = reduceMotion ? 0 : Math.sin(now * 0.0018) * D * 0.018;
        botRef.current.style.transform = `translate3d(${(bx * D * 0.04).toFixed(2)}px,${(by * D * 0.04 + bobY).toFixed(2)}px,0) rotate(${rot.toFixed(2)}deg)`;
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
    };
  }, []);

  const handleClick = () => {
    unlockOrbitAudio();
    let idx = Math.floor(Math.random() * CLICK_POOL.length);
    if (idx === lastClickIdxRef.current) idx = (idx + 1) % CLICK_POOL.length;
    lastClickIdxRef.current = idx;
    triggerReaction(CLICK_POOL[idx], false);
  };

  return (
    <div
      ref={wrapRef}
      data-testid="settings-orb-logo"
      className="relative shrink-0"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <div className="orbit-ring-track" aria-hidden="true" />
      <button
        ref={botRef}
        type="button"
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
