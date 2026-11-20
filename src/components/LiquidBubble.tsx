import { useCallback, useEffect, useRef, useState } from 'react';

export type BubbleVariant = 'glass' | 'solid';

export interface UseLiquidBubbleOptions {
  variant?: BubbleVariant;
  scope?: 'self' | 'any';
  navDelay?: number;
  disabled?: boolean;
}

export function LiquidBubbleLayers() {
  return (
    <>
      <span className="bubble-interior-wave" aria-hidden="true" />
      <span className="bubble-flash" aria-hidden="true" />
      <span className="bubble-border-mask" aria-hidden="true">
        <span className="bubble-border-aura" />
        <span className="bubble-border-sweep" />
      </span>
    </>
  );
}

function isCoarsePointer(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

export function useLiquidBubble(options: UseLiquidBubbleOptions = {}) {
  const { variant = 'glass', scope = 'any', navDelay = 760, disabled = false } = options;
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [flashing, setFlashing] = useState(false);

  const timersRef = useRef<{ flash?: number; retract?: number; nav?: number }>({});

  const clearTimers = useCallback(() => {
    if (timersRef.current.flash !== undefined) window.clearTimeout(timersRef.current.flash);
    if (timersRef.current.retract !== undefined) window.clearTimeout(timersRef.current.retract);
    if (timersRef.current.nav !== undefined) window.clearTimeout(timersRef.current.nav);
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const triggerClickPulse = useCallback(
    (isNavigation = false, isTouch = false, onNavigate?: () => void) => {
      if (disabled) return;
      clearTimers();
      setClicked(false);
      setFlashing(false);

      requestAnimationFrame(() => {
        setClicked(true);
        timersRef.current.flash = window.setTimeout(() => {
          setFlashing(true);
        }, 90);

        if (isNavigation || isTouch) {
          timersRef.current.nav = window.setTimeout(() => {
            onNavigate?.();
            setClicked(false);
            setFlashing(false);
            if (isTouch) setHovered(false);
          }, navDelay);
        } else {
          timersRef.current.retract = window.setTimeout(() => {
            setClicked(false);
            setFlashing(false);
          }, 900);
        }
      });
    },
    [clearTimers, disabled, navDelay]
  );

  const onPointerEnter = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (disabled) return;
      if (isCoarsePointer() || e.pointerType === 'touch') return;
      if (scope === 'self') {
        const nearest = (e.target as HTMLElement | null)?.closest('[data-bubble]');
        if (nearest && nearest !== e.currentTarget) return;
      }
      setHovered(true);
    },
    [disabled, scope]
  );

  const onPointerLeave = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (isCoarsePointer() || e.pointerType === 'touch') return;
      const active = document.activeElement;
      if (active && e.currentTarget.contains(active) && active.tagName === 'INPUT') {
        return;
      }
      setHovered(false);
      setClicked(false);
      setFlashing(false);
    },
    []
  );

  const onBlur = useCallback((e: React.FocusEvent<HTMLElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setHovered(false);
    setClicked(false);
    setFlashing(false);
  }, []);

  const handleClick = useCallback(
    (
      e: React.MouseEvent<HTMLElement>,
      opts?: { href?: string; onAfterDelay?: () => void }
    ) => {
      if (disabled) return;
      if (scope === 'self') {
        const nearest = (e.target as HTMLElement | null)?.closest('[data-bubble]');
        if (nearest && nearest !== e.currentTarget) return;
      }

      const isModifiedClick = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
      const href = opts?.href;
      const hasDelayedNav = Boolean((href && href !== '#' && !isModifiedClick) || opts?.onAfterDelay);

      if (hasDelayedNav && !isModifiedClick) {
        e.preventDefault();
      }

      const isTouch = isCoarsePointer();
      triggerClickPulse(hasDelayedNav && !isModifiedClick, isTouch, () => {
        if (opts?.onAfterDelay) {
          opts.onAfterDelay();
        } else if (href && href !== '#') {
          try {
            window.location.assign(href);
          } catch {
            // Ignore sandboxed navigation error
          }
        }
      });
    },
    [disabled, scope, triggerClickPulse]
  );

  const stateClass = [
    'bubble-interactive',
    hovered ? 'is-hovered' : '',
    clicked ? 'is-clicked' : '',
    flashing ? 'is-flashing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    stateClass,
    dataProps: {
      'data-bubble': '',
      'data-bubble-variant': variant,
      ...(scope === 'self' ? { 'data-bubble-scope': 'self' } : {}),
    },
    onPointerEnter,
    onPointerLeave,
    onBlur,
    handleClick,
  };
}

export interface BubbleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BubbleVariant;
  navDelay?: number;
  contentClassName?: string;
}

export function BubbleButton({
  variant = 'glass',
  navDelay = 760,
  contentClassName = 'flex items-center justify-center gap-2 w-full h-full',
  className = '',
  disabled,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onBlur,
  children,
  type = 'button',
  ...rest
}: BubbleButtonProps) {
  const bubble = useLiquidBubble({ variant, navDelay, disabled });

  return (
    <button
      type={type}
      disabled={disabled}
      {...bubble.dataProps}
      className={`${bubble.stateClass} ${className}`}
      onPointerEnter={(e) => {
        bubble.onPointerEnter(e);
        onPointerEnter?.(e);
      }}
      onPointerLeave={(e) => {
        bubble.onPointerLeave(e);
        onPointerLeave?.(e);
      }}
      onBlur={(e) => {
        bubble.onBlur(e);
        onBlur?.(e);
      }}
      onClick={(e) => {
        bubble.handleClick(e);
        onClick?.(e);
      }}
      {...rest}
    >
      <LiquidBubbleLayers />
      <span className={`bubble-content ${contentClassName}`}>{children}</span>
    </button>
  );
}

export interface BubbleAnchorProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: BubbleVariant;
  navDelay?: number;
  contentClassName?: string;
}

export function BubbleAnchor({
  variant = 'solid',
  navDelay = 760,
  contentClassName = 'flex items-center justify-center gap-2 w-full h-full',
  className = '',
  href,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onBlur,
  children,
  ...rest
}: BubbleAnchorProps) {
  const bubble = useLiquidBubble({ variant, navDelay });

  return (
    <a
      href={href}
      {...bubble.dataProps}
      className={`inline-flex ${bubble.stateClass} ${className}`}
      onPointerEnter={(e) => {
        bubble.onPointerEnter(e);
        onPointerEnter?.(e);
      }}
      onPointerLeave={(e) => {
        bubble.onPointerLeave(e);
        onPointerLeave?.(e);
      }}
      onBlur={(e) => {
        bubble.onBlur(e);
        onBlur?.(e);
      }}
      onClick={(e) => {
        const shouldDelay = !rest.target || rest.target === '_self';
        bubble.handleClick(e, shouldDelay ? { href } : undefined);
        onClick?.(e);
      }}
      {...rest}
    >
      <LiquidBubbleLayers />
      <span className={`bubble-content ${contentClassName}`}>{children}</span>
    </a>
  );
}
