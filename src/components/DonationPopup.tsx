import { memo, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HeartHandshake, X } from 'lucide-react';
import { UiDictionary } from '../i18n/translations';
import { BuyMeCoffeeButton } from './BuyMeCoffeeButton';
import { BubbleButton } from './LiquidBubble';

interface DonationPopupProps {
  open: boolean;
  dict: UiDictionary;
  onLater: () => void;
  onNever: () => void;
  onDonateClick: () => void;
  onOpenSupportSection: () => void;
  onOpenDonationsLegal: () => void;
}

export const DonationPopup = memo(function DonationPopup({
  open,
  dict,
  onLater,
  onNever,
  onDonateClick,
  onOpenSupportSection,
  onOpenDonationsLegal,
}: DonationPopupProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onLater();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onLater]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:justify-end p-3 sm:p-4 pb-[max(16px,var(--sb))] md:pr-10 lg:pr-14 pointer-events-none"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="donation-popup-title"
            data-testid="donation-popup"
            initial={{ opacity: 0, x: 16, y: 12 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 14, y: 10 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="donation-vfx-halo relative z-10 pointer-events-auto w-full max-w-[460px] max-h-[68vh] md:max-h-[82vh] flex flex-col rounded-[28px] overflow-hidden backdrop-blur-xl"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--bg) 74%, var(--menu-glass))',
              color: 'var(--fg)',
              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
              willChange: 'transform, opacity',
              contain: 'layout style paint',
            }}
          >
            <div className="p-4 sm:p-6 overflow-y-auto orbit-scroll space-y-3.5 sm:space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <div
                    className="inline-flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: 'var(--acc-text)' }}
                  >
                    <HeartHandshake className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{dict.donationPopupBadge}</span>
                  </div>
                  <h2
                    id="donation-popup-title"
                    className="text-base sm:text-lg font-semibold tracking-tight leading-snug"
                  >
                    {dict.donationPopupTitle}
                  </h2>
                </div>

                <button
                  type="button"
                  tabIndex={0}
                  data-testid="donation-popup-close"
                  onClick={onLater}
                  aria-label={dict.closeModal}
                  className="w-8 h-8 rounded-full grid place-items-center shrink-0 cursor-pointer hover:bg-[var(--glass2)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
                  style={{
                    backgroundColor: 'var(--glass)',
                    boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs sm:text-[13px] leading-relaxed" style={{ color: 'var(--mut)' }}>
                {dict.donationPopupBody}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <BuyMeCoffeeButton
                  variant="accent"
                  className="w-full"
                  testId="donation-popup-coffee-btn"
                  onClick={onDonateClick}
                />

                <BubbleButton
                  variant="glass"
                  tabIndex={0}
                  data-testid="donation-popup-open-support-btn"
                  onClick={onOpenSupportSection}
                  className="h-11 px-4 rounded-full text-[13px] font-semibold cursor-pointer hover:bg-[var(--glass2)] active:scale-[0.98]"
                  style={{
                    backgroundColor: 'var(--glass)',
                    boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                    color: 'var(--fg)',
                  }}
                >
                  <span>{dict.donationPopupCtaOpenSection}</span>
                </BubbleButton>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-2">
                  <BubbleButton
                    variant="glass"
                    tabIndex={0}
                    data-testid="donation-popup-later-btn"
                    onClick={onLater}
                    className="h-9 px-3.5 rounded-full text-[12.5px] font-medium cursor-pointer hover:bg-[var(--glass2)]"
                    style={{
                      backgroundColor: 'var(--glass)',
                      boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                      color: 'var(--fg)',
                    }}
                  >
                    <span>{dict.donationPopupLater}</span>
                  </BubbleButton>

                  <button
                    type="button"
                    tabIndex={0}
                    data-testid="donation-popup-never-btn"
                    onClick={onNever}
                    className="px-2 py-1 text-xs font-medium cursor-pointer opacity-75 hover:opacity-100 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
                    style={{ color: 'var(--mut)' }}
                  >
                    {dict.donationPopupNever}
                  </button>
                </div>

                <button
                  type="button"
                  tabIndex={0}
                  data-testid="donation-popup-legal-link"
                  onClick={onOpenDonationsLegal}
                  className="text-xs font-semibold underline underline-offset-4 cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
                  style={{ color: 'var(--acc-text)' }}
                >
                  {dict.donationPopupLegalLink}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
