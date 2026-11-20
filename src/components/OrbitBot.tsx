import { useEffect, useRef, useState } from 'react';
import { BootPhase } from '../types/orbit';
import { damp } from '../utils/layoutMath';

export type BotReactionType =
  | 'wink'
  | 'surprise'
  | 'glance'
  | 'sleepy'
  | 'think'
  | 'happy'
  | 'judge'
  | 'perplexed';

interface OrbitBotProps {
  bootPhase: BootPhase;
  botSize: number;
  botCenterY: number;
  horizontalPercent: number; // 50 normally, ~25 on desktop when side menu is open
  menuOpen: boolean;
  scale: number;
  isFocused: boolean;
  caretRatio: number;
  reactionSignal: { type: BotReactionType; nonce: number } | null;
  ariaLabel: string;
  onBotClick?: () => void;
}

const POOL: BotReactionType[] = ['wink', 'surprise', 'glance', 'sleepy'];
const DURATIONS: Record<BotReactionType, number> = {
  wink: 680,
  surprise: 700,
  glance: 900,
  sleepy: 1100,
  think: 3200,
  happy: 850,
  judge: 1800,
  perplexed: 1850,
};

const SOUNDS: Record<BotReactionType, [number, number, number]> = {
  wink: [510, 0.13, 660],
  surprise: [370, 0.16, 650],
  glance: [430, 0.15, 560],
  sleepy: [460, 0.24, 290],
  think: [440, 0.1, 480],
  happy: [520, 0.14, 760],
  judge: [340, 0.18, 290],
  perplexed: [410, 0.18, 510],
};

let sharedAudioCtx: AudioContext | null = null;

function playTone(freq: number, dur = 0.13, freqEnd?: number): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    sharedAudioCtx = sharedAudioCtx || new Ctx();
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume();
    }
    const t = sharedAudioCtx.currentTime;
    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur * 0.85);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.028, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {
    // Ignore browser audio restrictions
  }
}

export function OrbitBot({
  bootPhase,
  botSize,
  botCenterY,
  horizontalPercent,
  menuOpen,
  scale,
  isFocused,
  caretRatio,
  reactionSignal,
  ariaLabel,
  onBotClick,
}: OrbitBotProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLButtonElement>(null);
  const leftEyeRef = useRef<HTMLDivElement>(null);
  const rightEyeRef = useRef<HTMLDivElement>(null);
  const thinkRef = useRef<HTMLDivElement>(null);
  const snowRef = useRef<HTMLCanvasElement>(null);

  const [activeReactionLabel, setActiveReactionLabel] = useState<string>('idle');

  const propsRef = useRef({ botSize, isFocused, caretRatio, horizontalPercent, menuOpen, botCenterY });
  propsRef.current = { botSize, isFocused, caretRatio, horizontalPercent, menuOpen, botCenterY };

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
    const botEl = botRef.current;
    const rect = botEl?.getBoundingClientRect();
    const dir = clientX !== undefined && rect && clientX < rect.left + rect.width / 2 ? -1 : 1;
    reactionRef.current = {
      on: true,
      type,
      t0: performance.now(),
      dur: DURATIONS[type],
      dir,
    };
    setActiveReactionLabel(type);
    if (!silent) {
      const snd = SOUNDS[type];
      if (snd) playTone(...snd);
      if (type === 'happy') {
        setTimeout(() => playTone(700, 0.14, 940), 90);
      }
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

  // Main 60fps eye tracking, breathing, blinking, horizontal drawer shift, and expressions
  useEffect(() => {
    let tx = 0;
    let ty = 0;
    let lastPtr = 0;
    let drag = false;
    let nextThink = performance.now() + 6500;
    let lastTime = performance.now();
    let thinkOn = false;
    let rafId = 0;

    const GX = { p: 0, v: 0 };
    const GY = { p: 0, v: 0 };
    const BX = { p: 0, v: 0 };
    const BY = { p: 0, v: 0 };
    const HX = { p: propsRef.current.horizontalPercent, v: 0 };
    const BL = { on: false, t0: 0, next: performance.now() + 2400 };

    const norm = () => Math.min(window.innerWidth, window.innerHeight) * 0.42;
    const pointAt = (x: number, y: number) => {
      const el = botRef.current;
      if (!el) return;
      lastPtr = performance.now();
      const r = el.getBoundingClientRect();
      const dx = (x - r.left - r.width / 2) / norm();
      const dy = (y - r.top - r.height / 2) / norm();
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
      // Track cursor both when idle AND when watching user interact with Settings/Legal menus
      if (!propsRef.current.isFocused || propsRef.current.menuOpen) {
        pointAt(e.clientX, e.clientY);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      drag = true;
      if (propsRef.current.menuOpen || !(e.target as HTMLElement)?.closest('#search-ui')) {
        pointAt(e.clientX, e.clientY);
      }
    };
    const onPointerUp = () => {
      drag = false;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

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

      const {
        botSize: Draw,
        isFocused: foc,
        caretRatio: cRatio,
        horizontalPercent: hTarget,
        menuOpen: mOpen,
        botCenterY: cY,
      } = propsRef.current;

      // Smoothly damp wrapper horizontal position between center (50%) and left stage (26%)
      const hx = damp(HX, hTarget, 0.28, dt);
      if (wrapRef.current) {
        wrapRef.current.style.left = `${hx.toFixed(2)}%`;
        wrapRef.current.style.transform = `translate3d(-50%, ${(cY - Draw / 2).toFixed(2)}px, 0)`;
      }

      // Holiday snow rendering
      if (snowCx && document.documentElement.classList.contains('xmas')) {
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

      if (mOpen && now - lastPtr > 1600) {
        // When side menu is open and user isn't moving mouse, look curiously toward the right menu
        dx = 0.72;
        dy = Math.sin(now * 0.0008) * 0.08;
      } else if (foc && !mOpen) {
        dx = cRatio * 0.75;
        dy = 0.42;
      } else if (!drag && !mOpen && now - lastPtr > 1800) {
        dx += Math.sin(now * 0.00037) * 0.07;
        dy += Math.sin(now * 0.00051 + 1) * 0.05;
      }

      const R = reactionRef.current;
      if (foc && !mOpen && !R.on && now > nextThink) {
        triggerReaction('think', undefined, true);
        nextThink = now + 8000 + Math.random() * 6000;
      }

      let rt = -1;
      let rot = 0;
      if (R.on) {
        rt = (now - R.t0) / R.dur;
        if (rt >= 1) {
          R.on = false;
          rt = -1;
          setActiveReactionLabel('idle');
        }
      }
      const b =
        rt < 0
          ? 0
          : R.type === 'think' || R.type === 'happy' || R.type === 'judge' || R.type === 'perplexed'
            ? hold(rt)
            : bell(rt);

      if (rt >= 0) {
        if (R.type === 'glance') {
          dx = dx * (1 - b) + R.dir * 0.84 * b;
          dy = dy * (1 - b) - 0.36 * b;
          rot = R.dir * b * 7;
        } else if (R.type === 'think') {
          dx = dx * (1 - b) + 0.68 * b;
          dy = dy * (1 - b) - 0.62 * b;
        } else if (R.type === 'sleepy') {
          dy = dy * (1 - b * 0.75) + 0.4 * b;
          rot = R.dir * b * 3;
        } else if (R.type === 'judge') {
          dx = dx * (1 - b) + 0.78 * b;
          dy = dy * (1 - b) - 0.05 * b;
          rot = -b * 6;
        } else if (R.type === 'perplexed') {
          dx = dx * (1 - b) + 0.72 * b;
          dy = dy * (1 - b) - 0.14 * b;
          rot = b * 8.5;
        }
      }

      const wt = R.on && R.type === 'think' && rt > 0.04 && rt < 0.9;
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
      const br = Math.sin(now * 0.0021);
      let scX = 1 + br * 0.006;
      let scY = 1 - br * 0.006;
      let lW = 1;
      let lH = 1;
      let rW = 1;
      let rH = 1;
      let lY = 0;
      let rY = 0;
      let arcBottom = 0;
      let lFlatTop = 0;
      let rFlatTop = 0;
      let lT = -4.2 - sx * 6.5;
      let rT = 4.2 - sx * 6.5;

      if (!BL.on && !R.on && now >= BL.next) {
        BL.on = true;
        BL.t0 = now;
      }
      if (BL.on) {
        const t = (now - BL.t0) / 220;
        if (t >= 1) {
          BL.on = false;
          BL.next = now + 2400 + Math.random() * 2800;
        } else {
          const c = bell(t);
          lH *= 1 - c * 0.88;
          rH *= 1 - c * 0.88;
          lW *= 1 + c * 0.14;
          rW *= 1 + c * 0.14;
        }
      }

      if (rt >= 0) {
        switch (R.type) {
          case 'wink':
            if (R.dir < 0) {
              lH *= 1 - b * 0.88;
              lW *= 1 + b * 0.2;
              lT -= b * 7;
              rH *= 1 + b * 0.06;
            } else {
              rH *= 1 - b * 0.88;
              rW *= 1 + b * 0.2;
              rT += b * 7;
              lH *= 1 + b * 0.06;
            }
            rot += R.dir * b * 4;
            break;
          case 'surprise':
            scX *= 1 + b * 0.03;
            scY *= 1 + b * 0.03;
            lW *= 1 + b * 0.22;
            rW *= 1 + b * 0.22;
            lH *= 1 + b * 0.16;
            rH *= 1 + b * 0.16;
            break;
          case 'happy':
            scX *= 1 + b * 0.025;
            scY *= 1 + b * 0.025;
            lH *= 1 - b * 0.58;
            rH *= 1 - b * 0.58;
            lW *= 1 + b * 0.26;
            rW *= 1 + b * 0.26;
            lY = rY = -b * D * 0.03;
            lT -= b * 7;
            rT += b * 7;
            arcBottom = b;
            break;
          case 'glance':
            lW *= 1 + b * 0.1;
            rH *= 1 - b * 0.3;
            rW *= 1 + b * 0.14;
            lT -= b * 8;
            rT += b * 5;
            break;
          case 'sleepy':
            scY *= 1 - b * 0.02;
            lH *= 1 - b * 0.7;
            rH *= 1 - b * 0.7;
            lW *= 1 + b * 0.16;
            rW *= 1 + b * 0.16;
            lY = rY = b * D * 0.026;
            lT += b * 5;
            rT -= b * 5;
            break;
          case 'think':
            lH *= 1 - b * 0.22;
            rH *= 1 - b * 0.1;
            lT -= b * 6;
            rT += b * 2;
            break;
          case 'judge':
            // Skeptical / judging narrow squint with flat upper lids
            lH *= 1 - b * 0.52;
            rH *= 1 - b * 0.52;
            lW *= 1 + b * 0.14;
            rW *= 1 + b * 0.14;
            lY = rY = b * D * 0.018;
            lT += b * 4;
            rT -= b * 4;
            lFlatTop = b * 0.9;
            rFlatTop = b * 0.9;
            break;
          case 'perplexed':
            // Perplexed asymmetrical stare: one eye squinted, one wide & raised
            lH *= 1 - b * 0.44;
            lW *= 1 + b * 0.08;
            lY = b * D * 0.022;
            lT += b * 11;
            lFlatTop = b * 0.75;
            rH *= 1 + b * 0.15;
            rW *= 1 + b * 0.12;
            rY = -b * D * 0.02;
            rT -= b * 8;
            break;
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

      if (botRef.current) {
        botRef.current.style.transform = `translate3d(${(bx * D * 0.038).toFixed(2)}px,${(by * D * 0.038).toFixed(2)}px,0) rotate(${rot.toFixed(2)}deg) scale(${scX.toFixed(4)},${scY.toFixed(4)})`;
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
      window.removeEventListener('resize', resizeSnow);
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    let idx = Math.floor(Math.random() * POOL.length);
    if (idx === lastIndexRef.current) idx = (idx + 1) % POOL.length;
    lastIndexRef.current = idx;
    triggerReaction(POOL[idx], e.clientX);
    onBotClick?.();
  };

  const isVisible = bootPhase === 'pop' || bootPhase === 'ready';

  return (
    <>
      <canvas ref={snowRef} className="fixed inset-0 w-full h-full pointer-events-none z-0" aria-hidden="true" />
      <div
        ref={wrapRef}
        data-testid="orbit-bot-wrapper"
        className="absolute top-0 z-40"
        style={{
          left: `${horizontalPercent.toFixed(2)}%`,
          width: `${botSize.toFixed(2)}px`,
          height: `${botSize.toFixed(2)}px`,
          transform: `translate3d(-50%, ${(botCenterY - botSize / 2).toFixed(2)}px, 0)`,
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
          transition: 'opacity 220ms ease-out',
        }}
      >
        <div
          className={`relative w-full h-full ${bootPhase === 'pop' ? 'animate-bot-pop' : ''}`}
          style={{ ['--k' as string]: scale.toFixed(4) }}
        >
          {/* Single crisp fixed orbital ring around the sphere (zero glow) */}
          <div data-testid="orbit-single-ring" className="orbit-ring-track" />
          <div className="orbit-satellite-spinner" />

          {/* Bot sphere */}
          <button
            ref={botRef}
            type="button"
            data-reaction={activeReactionLabel}
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
                className="absolute left-1/2 top-1/2"
                style={{ backgroundColor: 'var(--eye)', willChange: 'transform, width, height' }}
              />
              <div
                ref={rightEyeRef}
                className="absolute left-1/2 top-1/2"
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
}
