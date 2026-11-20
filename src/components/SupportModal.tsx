import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Coffee, ExternalLink, Heart, X } from 'lucide-react';
import { buildBuyMeACoffeeUrl } from '../constants/support';
import { UiDictionary } from '../i18n/translations';
import { BubbleAnchor, BubbleButton } from './LiquidBubble';

interface SupportModalProps {
  open: boolean;
  dict: UiDictionary;
  onClose: () => void;
  onCelebrate?: () => void;
}

export function SupportModal({
  open,
  dict,
  onClose,
  onCelebrate,
}: SupportModalProps) {
  const [thanked, setThanked] = useState(false);

  useEffect(() => {
    if (!open) {
      setThanked(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const donationUrl = buildBuyMeACoffeeUrl();

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center md:justify-end p-4 md:pr-10 lg:pr-14 pointer-events-none"
        >
          {/* Click-outside capture layer (blur sits behind Orb at z-30) */}
          <div
            className="fixed inset-0 pointer-events-auto"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-modal-title"
            data-testid="support-modal"
            initial={{ opacity: 0, x: 28, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.98 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 pointer-events-auto w-full max-w-[440px] max-h-[86vh] flex flex-col rounded-[28px] overflow-hidden backdrop-blur-2xl"
            style={{
              backgroundColor: 'var(--menu-glass)',
              color: 'var(--fg)',
              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between gap-4 px-6 py-4 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="min-w-0">
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-semibold mb-1"
                  style={{ color: 'var(--acc-text)' }}
                >
                  <Coffee className="w-3.5 h-3.5 shrink-0" />
                  <span>{dict.supportModalBadge}</span>
                </div>
                <h2 id="support-modal-title" className="text-lg font-semibold tracking-tight">
                  {dict.supportModalTitle}
                </h2>
              </div>
              <BubbleButton
                variant="glass"
                data-testid="support-close-btn"
                onClick={onClose}
                aria-label={dict.closeModal}
                contentClassName="grid place-items-center w-full h-full"
                className="w-10 h-10 rounded-full shrink-0 cursor-pointer hover:bg-[var(--glass2)]"
                style={{
                  backgroundColor: 'var(--glass)',
                  boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                }}
              >
                <X className="w-4 h-4" />
              </BubbleButton>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto orbit-scroll space-y-5">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--mut)' }}>
                {dict.supportModalBody}
              </p>

              {/* Thank-you confirmation state */}
              <AnimatePresence>
                {thanked && (
                  <motion.div
                    data-testid="support-thank-you"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22 }}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-medium leading-relaxed"
                    style={{
                      backgroundColor: 'var(--glass)',
                      boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                      color: 'var(--fg)',
                    }}
                  >
                    <Heart className="w-4 h-4 shrink-0" style={{ color: 'var(--acc-text)' }} />
                    <span>{dict.supportThankYouNote}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Single redirect button to Buy Me a Coffee form */}
              <BubbleAnchor
                variant="solid"
                data-testid="support-donate-link"
                href={donationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setThanked(true);
                  onCelebrate?.();
                }}
                className="flex w-full h-11 px-5 rounded-full text-[13.5px] font-semibold whitespace-nowrap cursor-pointer active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--acc)',
                  color: 'var(--acc-fg)',
                }}
              >
                <Coffee className="w-4 h-4 shrink-0" />
                <span>{dict.supportDonateCta}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-85" />
              </BubbleAnchor>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
