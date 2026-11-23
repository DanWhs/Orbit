import { memo, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Coffee, X } from 'lucide-react';
import { UiDictionary } from '../i18n/translations';
import { BuyMeCoffeeButton } from './BuyMeCoffeeButton';
import { BubbleButton } from './LiquidBubble';

interface SupportShowcaseOverlayProps {
  open: boolean;
  dict: UiDictionary;
  onClose: () => void;
  onDonateClick: () => void;
  onOpenDonationsLegal: () => void;
}

export const SupportShowcaseOverlay = memo(function SupportShowcaseOverlay({
  open,
  dict,
  onClose,
  onDonateClick,
  onOpenDonationsLegal,
}: SupportShowcaseOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-labelledby="support-showcase-title"
          data-testid="support-showcase-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } }}
          transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between px-5 sm:px-10 md:px-14 lg:px-20 pt-[calc(var(--st)+18px)] pb-[max(24px,var(--sb))]"
        >
          {/* Ambient floating VFX over live animated background — never dims or covers Orb on the right */}
          <span
            className="support-vfx-halo-sweep opacity-65"
            aria-hidden="true"
          />
          <span
            className="support-vfx-particle w-5 h-5 top-[14%] left-[7%]"
            style={{ animationDelay: '0s' }}
            aria-hidden="true"
          />
          <span
            className="support-vfx-particle w-3.5 h-3.5 bottom-[20%] left-[44%]"
            style={{ animationDelay: '1.7s' }}
            aria-hidden="true"
          />
          <span
            className="support-vfx-particle w-4 h-4 top-[32%] left-[52%]"
            style={{ animationDelay: '3.2s' }}
            aria-hidden="true"
          />

          {/* Top Navigation Bar */}
          <div className="relative z-10 flex items-center justify-between gap-4 pointer-events-auto">
            <BubbleButton
              variant="glass"
              tabIndex={0}
              data-testid="support-showcase-back-btn"
              onClick={onClose}
              aria-label={dict.supportBackLabel}
              contentClassName="inline-flex items-center gap-2"
              className="h-10 px-4 rounded-full text-xs font-medium backdrop-blur-lg cursor-pointer hover:bg-[var(--glass2)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
              style={{
                backgroundColor: 'var(--glass)',
                color: 'var(--fg)',
                boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
              }}
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{dict.supportBackLabel}</span>
            </BubbleButton>

            <BubbleButton
              variant="glass"
              tabIndex={0}
              data-testid="support-showcase-close-btn"
              onClick={onClose}
              aria-label={dict.closeModal}
              contentClassName="grid place-items-center w-full h-full"
              className="w-10 h-10 rounded-full backdrop-blur-lg cursor-pointer hover:bg-[var(--glass2)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
              style={{
                backgroundColor: 'var(--glass)',
                color: 'var(--fg)',
                boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
              }}
            >
              <X className="w-4 h-4" />
            </BubbleButton>
          </div>

          {/* Huge Editorial Left Showcase (leaves right side clear for happy OrbitBot) */}
          <div className="relative z-10 flex-1 flex items-end md:items-center min-h-0 py-4 md:py-0 overflow-y-auto orbit-scroll">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto w-full md:w-[56%] lg:w-[54%] max-w-[660px] space-y-5 pt-[186px] sm:pt-[196px] md:pt-0"
            >
              <div
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em]"
                style={{ color: 'var(--acc-text)' }}
              >
                <Coffee className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{dict.settingsTabSupport}</span>
              </div>

              <h1
                id="support-showcase-title"
                className="m-0 text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-[-0.03em] leading-[1.08]"
                style={{ color: 'var(--fg)' }}
              >
                {dict.supportLetterTitle}
              </h1>

              <div
                data-testid="support-showcase-letter"
                className="space-y-3 text-[15px] sm:text-[17px] lg:text-[18px] leading-[1.68]"
                style={{ color: 'var(--fg)' }}
              >
                {dict.supportLetterParagraphs.map((paragraph, idx) => (
                  <p
                    key={idx}
                    className={`m-0 ${
                      idx === 0 || idx === dict.supportLetterParagraphs.length - 1
                        ? 'font-semibold'
                        : 'font-normal'
                    }`}
                    style={{
                      color:
                        idx === dict.supportLetterParagraphs.length - 1
                          ? 'var(--acc-text)'
                          : 'var(--fg)',
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Italic Voluntary Donation Summary with Inline Legal Hyperlink */}
              <p
                data-testid="support-voluntary-italic"
                className="m-0 pt-2 text-xs sm:text-[13.5px] italic leading-relaxed"
                style={{ color: 'var(--mut)' }}
              >
                {dict.supportVoluntaryItalicPrefix}{' '}
                <button
                  type="button"
                  tabIndex={0}
                  data-testid="support-showcase-legal-link"
                  onClick={onOpenDonationsLegal}
                  className="inline underline underline-offset-4 italic font-semibold cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
                  style={{ color: 'var(--acc-text)' }}
                >
                  {dict.supportVoluntaryLegalLink}
                </button>
                {dict.supportVoluntaryItalicSuffix}
              </p>

              {/* Buy Me a Coffee Action */}
              <div className="pt-1 flex flex-wrap items-center gap-3">
                <BuyMeCoffeeButton
                  variant="accent"
                  testId="support-showcase-coffee-btn"
                  onClick={onDonateClick}
                />
              </div>
            </motion.div>
          </div>

          <div className="h-2 shrink-0" aria-hidden="true" />
        </motion.section>
      )}
    </AnimatePresence>
  );
});
