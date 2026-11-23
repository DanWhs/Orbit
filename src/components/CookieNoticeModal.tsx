import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { UiDictionary } from '../i18n/translations';
import { ConsentState } from '../types/orbit';
import { BubbleButton } from './LiquidBubble';

interface CookieNoticeModalProps {
  open: boolean;
  dict: UiDictionary;
  consent: ConsentState;
  onAcceptConsent: (next: ConsentState) => void;
  onOpenLegal: () => void;
  onUserModify?: () => void;
}

export const CookieNoticeModal = memo(function CookieNoticeModal({
  open,
  dict,
  consent,
  onAcceptConsent,
  onOpenLegal,
  onUserModify,
}: CookieNoticeModalProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [draftFunctional, setDraftFunctional] = useState(true);
  const [draftAnalytics, setDraftAnalytics] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowCustom(false);
    }
  }, [open]);

  const commitConsent = (functionalExternal: boolean, analytics: boolean, doNotSellOrShare: boolean) => {
    onAcceptConsent({
      decided: true,
      necessary: true,
      functionalExternal: consent.gpcDetected ? false : functionalExternal,
      analytics: consent.gpcDetected ? false : analytics,
      doNotSellOrShare: consent.gpcDetected ? true : doNotSellOrShare,
      gpcDetected: consent.gpcDetected,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:justify-end p-3 sm:p-4 pb-[max(16px,var(--sb))] md:pr-10 lg:pr-14 pointer-events-none"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-notice-title"
            data-testid="cookie-notice-modal"
            initial={{ opacity: 0, x: 16, y: 12 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 14, y: 10 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 pointer-events-auto w-full max-w-[460px] max-h-[68vh] md:max-h-[82vh] flex flex-col rounded-[28px] overflow-hidden backdrop-blur-xl"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--bg) 74%, var(--menu-glass))',
              color: 'var(--fg)',
              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
              willChange: 'transform, opacity',
              contain: 'layout style paint',
            }}
          >
            <div className="p-4 sm:p-6 overflow-y-auto orbit-scroll space-y-3.5 sm:space-y-4">
              <div className="space-y-1.5">
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: 'var(--acc-text)' }}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{dict.cookieNoticeBadge}</span>
                </div>
                <h2 id="cookie-notice-title" className="text-base sm:text-lg font-semibold tracking-tight leading-snug">
                  {dict.cookieNoticeTitle}
                </h2>
                <p className="text-xs sm:text-[13px] leading-relaxed" style={{ color: 'var(--mut)' }}>
                  {dict.cookieNoticeBody}
                </p>
              </div>

              {consent.gpcDetected && (
                <div
                  className="px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed"
                  style={{
                    backgroundColor: 'var(--glass)',
                    boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                    color: 'var(--mut)',
                  }}
                >
                  {dict.usGpcDetected}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <BubbleButton
                  variant="solid"
                  tabIndex={0}
                  data-testid="cookie-notice-accept-all"
                  onClick={() => commitConsent(true, true, false)}
                  className="h-11 px-4 rounded-full text-[13px] font-semibold cursor-pointer active:scale-[0.98]"
                  style={{
                    backgroundColor: 'var(--acc)',
                    color: 'var(--acc-fg)',
                  }}
                >
                  <span>{dict.cookieAcceptAll}</span>
                </BubbleButton>

                <BubbleButton
                  variant="glass"
                  tabIndex={0}
                  data-testid="cookie-notice-reject-all"
                  onClick={() => commitConsent(false, false, true)}
                  className="h-11 px-4 rounded-full text-[13px] font-semibold cursor-pointer hover:bg-[var(--glass2)] active:scale-[0.98]"
                  style={{
                    backgroundColor: 'var(--glass)',
                    boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                    color: 'var(--fg)',
                  }}
                >
                  <span>{dict.cookieRejectAll}</span>
                </BubbleButton>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <BubbleButton
                  variant="glass"
                  tabIndex={0}
                  data-testid="cookie-notice-customize-btn"
                  onClick={() => {
                    setShowCustom((v) => !v);
                    onUserModify?.();
                  }}
                  className="h-9 px-3.5 rounded-full text-[13px] font-semibold cursor-pointer hover:bg-[var(--glass2)]"
                  style={{
                    backgroundColor: 'var(--glass)',
                    boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                    color: 'var(--fg)',
                  }}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                  <span>{dict.cookieCustomize}</span>
                </BubbleButton>

                <button
                  type="button"
                  tabIndex={0}
                  data-testid="cookie-notice-read-policy"
                  onClick={onOpenLegal}
                  className="text-xs font-semibold underline underline-offset-4 cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
                  style={{ color: 'var(--acc-text)' }}
                >
                  {dict.cookieNoticeOpenPolicy}
                </button>
              </div>

              <AnimatePresence>
                {showCustom && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden pt-3 border-t space-y-2.5"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <label className="flex items-center justify-between gap-3 text-xs cursor-pointer py-1">
                      <span>{dict.cookieFunctionalToggle}</span>
                      <input
                        type="checkbox"
                        tabIndex={0}
                        data-testid="cookie-notice-functional-toggle"
                        checked={consent.gpcDetected ? false : draftFunctional}
                        disabled={consent.gpcDetected}
                        onChange={(e) => {
                          setDraftFunctional(e.target.checked);
                          onUserModify?.();
                        }}
                        className="w-4 h-4 accent-[var(--acc)]"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 text-xs cursor-pointer py-1">
                      <span>{dict.cookieAnalyticsToggle}</span>
                      <input
                        type="checkbox"
                        tabIndex={0}
                        data-testid="cookie-notice-analytics-toggle"
                        checked={consent.gpcDetected ? false : draftAnalytics}
                        disabled={consent.gpcDetected}
                        onChange={(e) => {
                          setDraftAnalytics(e.target.checked);
                          onUserModify?.();
                        }}
                        className="w-4 h-4 accent-[var(--acc)]"
                      />
                    </label>
                    <BubbleButton
                      variant="solid"
                      tabIndex={0}
                      data-testid="cookie-notice-save-custom"
                      onClick={() => commitConsent(draftFunctional, draftAnalytics, false)}
                      className="h-10 px-4 rounded-full text-xs font-semibold cursor-pointer active:scale-[0.98]"
                      style={{
                        backgroundColor: 'var(--acc)',
                        color: 'var(--acc-fg)',
                      }}
                    >
                      <span>{dict.cookieSaveCustom}</span>
                    </BubbleButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
