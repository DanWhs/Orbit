import { memo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { UiDictionary } from '../i18n/translations';
import { BubbleButton } from './LiquidBubble';
import { LiveOrbMark } from './LiveOrbMark';

interface ErrorScreenProps {
  variant: '404' | 'runtime';
  dict: UiDictionary;
  reduceMotion?: boolean;
  onReset: () => void;
}

export const ErrorScreen = memo(function ErrorScreen({
  variant,
  dict,
  reduceMotion = false,
  onReset,
}: ErrorScreenProps) {
  const code = variant === '404' ? dict.error404Code : dict.errorRuntimeCode;
  const title = variant === '404' ? dict.error404Title : dict.errorRuntimeTitle;
  const desc = variant === '404' ? dict.error404Desc : dict.errorRuntimeDesc;

  return (
    <section
      role="main"
      aria-labelledby="orbit-error-title"
      data-testid={`orbit-error-screen-${variant}`}
      className="fixed inset-0 z-50 flex items-center justify-center px-6 py-10 overflow-y-auto orbit-scroll"
      style={{
        backgroundColor: 'var(--bg)',
        color: 'var(--fg)',
      }}
    >
      <div className="orbit-ambient-bg" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-[820px] flex flex-col-reverse md:flex-row items-center justify-between gap-8 md:gap-12">
        {/* Left Copy + Action */}
        <div className="flex-1 min-w-0 text-center md:text-left space-y-4">
          <div
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold tracking-[0.12em]"
            style={{
              backgroundColor: 'rgba(var(--acc-rgb), 0.14)',
              color: 'var(--acc-text)',
              boxShadow: 'inset 0 0 0 1px rgba(var(--acc-rgb), 0.34)',
            }}
          >
            {code}
          </div>

          <h1
            id="orbit-error-title"
            className="m-0 text-2xl sm:text-4xl font-bold tracking-[-0.03em] leading-[1.12]"
          >
            {title}
          </h1>

          <p
            className="m-0 text-sm sm:text-base leading-relaxed max-w-lg mx-auto md:mx-0"
            style={{ color: 'var(--mut)' }}
          >
            {desc}
          </p>

          <div className="pt-2 flex justify-center md:justify-start">
            <BubbleButton
              variant="solid"
              tabIndex={0}
              data-testid="error-back-home-btn"
              onClick={onReset}
              contentClassName="inline-flex items-center gap-2"
              className="h-11 px-6 rounded-full text-xs sm:text-[13px] font-semibold cursor-pointer active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
              style={{
                backgroundColor: 'var(--acc)',
                color: 'var(--acc-fg)',
              }}
            >
              <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{dict.errorBackHomeBtn}</span>
            </BubbleButton>
          </div>
        </div>

        {/* Right Confused Orb */}
        <div className="shrink-0 flex flex-col items-center justify-center" data-testid="error-confused-orb">
          <LiveOrbMark
            size={164}
            reduceMotion={reduceMotion}
            forceReaction="perplexed"
            ariaLabel={dict.botAriaLabel}
          />
        </div>
      </div>
    </section>
  );
});
