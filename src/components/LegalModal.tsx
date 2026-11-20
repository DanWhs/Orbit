import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Search, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { filterLegalSections, getLegalSections } from '../i18n/legalContent';
import { UiDictionary } from '../i18n/translations';
import { ConsentState, JurisdictionCode, LanguageCode } from '../types/orbit';
import { BubbleButton, LiquidBubbleLayers, useLiquidBubble } from './LiquidBubble';

interface LegalModalProps {
  open: boolean;
  lang: LanguageCode;
  jurisdiction: JurisdictionCode;
  jurisdictionLabel: string;
  dict: UiDictionary;
  consent: ConsentState;
  onClose: () => void;
  onUpdateConsent: (next: ConsentState) => void;
  onUserModify?: () => void;
}

function renderHighlightedText(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <mark key={idx} className="legal-hit">
        {part}
      </mark>
    ) : (
      <Fragment key={idx}>{part}</Fragment>
    )
  );
}

export function LegalModal({
  open,
  lang,
  jurisdiction,
  jurisdictionLabel,
  dict,
  consent,
  onClose,
  onUpdateConsent,
  onUserModify,
}: LegalModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomPanel, setShowCustomPanel] = useState(false);
  const [draftFunctional, setDraftFunctional] = useState(consent.functionalExternal);
  const [draftAnalytics, setDraftAnalytics] = useState(consent.analytics);
  const bodyRef = useRef<HTMLDivElement>(null);
  const legalSearchBubble = useLiquidBubble({ variant: 'glass', scope: 'self' });

  useEffect(() => {
    setDraftFunctional(consent.functionalExternal);
    setDraftAnalytics(consent.analytics);
  }, [consent.functionalExternal, consent.analytics]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setShowCustomPanel(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const allSections = useMemo(() => getLegalSections(lang, jurisdiction), [lang, jurisdiction]);
  const visibleSections = useMemo(
    () => filterLegalSections(allSections, searchQuery),
    [allSections, searchQuery]
  );

  const jumpToSection = (sectionId: string) => {
    if (searchQuery.trim()) {
      setSearchQuery('');
      requestAnimationFrame(() => {
        const el = bodyRef.current?.querySelector(`#legal-sec-${sectionId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }
    const el = bodyRef.current?.querySelector(`#legal-sec-${sectionId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const applyConsent = (functionalExternal: boolean, analytics: boolean, doNotSellOrShare: boolean) => {
    onUpdateConsent({
      decided: true,
      necessary: true,
      functionalExternal: consent.gpcDetected ? false : functionalExternal,
      analytics: consent.gpcDetected ? false : analytics,
      doNotSellOrShare: consent.gpcDetected ? true : doNotSellOrShare,
      gpcDetected: consent.gpcDetected,
      updatedAt: new Date().toISOString(),
    });
    setShowCustomPanel(false);
    onUserModify?.();
  };

  const consentStatusSummary =
    !consent.decided || (!consent.functionalExternal && !consent.analytics)
      ? dict.cookieStatusEssentialOnly
      : consent.functionalExternal && consent.analytics
        ? dict.cookieStatusAllAccepted
        : dict.cookieStatusCustom;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center md:justify-end p-3 sm:p-4 md:pr-10 lg:pr-14 pointer-events-none">
          {/* Click-outside capture layer (blur sits behind Orb at z-30) */}
          <div className="fixed inset-0 pointer-events-auto" onClick={onClose} aria-hidden="true" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-modal-title"
            data-testid="legal-modal"
            initial={{ opacity: 0, x: 32, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 26, scale: 0.98 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 pointer-events-auto w-full max-w-[640px] h-[88vh] flex flex-col rounded-[28px] overflow-hidden backdrop-blur-2xl"
            style={{
              backgroundColor: 'var(--menu-glass)',
              color: 'var(--fg)',
              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
            }}
          >
            {/* Top Bar with Title + Internal Search */}
            <div
              className="px-5 sm:px-6 pt-5 pb-4 border-b space-y-3 shrink-0"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div
                    className="flex flex-wrap items-center gap-1.5 text-xs font-medium mb-1"
                    style={{ color: 'var(--mut)' }}
                  >
                    <span className="inline-flex items-center gap-1" style={{ color: 'var(--acc-text)' }}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{dict.legalJurisdictionBadge}:</span>
                    </span>
                    <span>{jurisdictionLabel}</span>
                  </div>
                  <h2 id="legal-modal-title" className="text-base sm:text-lg font-semibold tracking-tight">
                    {dict.legalModalTitle}
                  </h2>
                </div>
                <BubbleButton
                  variant="glass"
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

              {/* Internal Keyword Search Bar (exact search-bar pill style + perimeter glow) */}
              <div
                {...legalSearchBubble.dataProps}
                onPointerEnter={legalSearchBubble.onPointerEnter}
                onPointerLeave={legalSearchBubble.onPointerLeave}
                onBlur={legalSearchBubble.onBlur}
                onClick={(e) => legalSearchBubble.handleClick(e)}
                className={`${legalSearchBubble.stateClass} h-11 px-4 rounded-full transition-all duration-200`}
                style={{
                  backgroundColor: searchQuery ? 'var(--glass2)' : 'var(--glass)',
                  boxShadow: searchQuery
                    ? 'inset 0 0 0 1.5px var(--acc)'
                    : 'inset 0 0 0 1px var(--border-subtle)',
                }}
              >
                <LiquidBubbleLayers />
                <div className="bubble-content flex items-center gap-2.5 w-full h-full">
                  <Search className="w-4 h-4 shrink-0 opacity-60" aria-hidden="true" />
                  <input
                    type="search"
                    data-testid="legal-search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={dict.legalSearchPlaceholder}
                    aria-label={dict.legalSearchPlaceholder}
                    className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm font-medium placeholder:text-[var(--mut)]"
                    style={{ color: 'var(--fg)', caretColor: 'var(--acc)' }}
                  />
                  {searchQuery && (
                    <>
                      <span className="text-xs tabular-nums whitespace-nowrap shrink-0" style={{ color: 'var(--mut)' }}>
                        {visibleSections.length} {dict.legalSearchResultsCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label={dict.legalSearchClear}
                        className="w-7 h-7 rounded-full grid place-items-center cursor-pointer hover:bg-[var(--glass2)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Legal Body */}
            <div ref={bodyRef} className="flex-1 overflow-y-auto orbit-scroll px-5 sm:px-6 py-5 space-y-6">
              {/* Clickable Table of Contents (Index) */}
              <nav
                data-testid="legal-toc"
                aria-label={dict.legalTocTitle}
                className="p-4 rounded-2xl"
                style={{
                  backgroundColor: 'var(--glass)',
                  boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                }}
              >
                <h3 className="text-xs font-semibold mb-2.5" style={{ color: 'var(--mut)' }}>
                  {dict.legalTocTitle}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {allSections.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => jumpToSection(sec.id)}
                      className="text-left text-xs font-medium px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors hover:bg-[var(--glass2)] flex items-baseline gap-2"
                    >
                      <span className="font-bold tabular-nums shrink-0" style={{ color: 'var(--acc-text)' }}>
                        {sec.number}.
                      </span>
                      <span className="truncate">{sec.title}</span>
                    </button>
                  ))}
                </div>
              </nav>

              {/* Sections */}
              {visibleSections.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: 'var(--mut)' }}>
                  {dict.legalNoMatches}
                </p>
              ) : (
                <div className="space-y-5">
                  {visibleSections.map((sec) => (
                    <article
                      key={sec.id}
                      id={`legal-sec-${sec.id}`}
                      data-testid={`legal-section-${sec.id}`}
                      className="scroll-mt-4 pb-5 border-b last:border-b-0"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <h3 className="text-sm sm:text-base font-semibold mb-2 flex items-baseline gap-2">
                        <span className="tabular-nums" style={{ color: 'var(--acc-text)' }}>
                          {sec.number})
                        </span>
                        <span>{renderHighlightedText(sec.title, searchQuery)}</span>
                      </h3>
                      <p className="text-[13px] sm:text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>
                        {renderHighlightedText(sec.body, searchQuery)}
                      </p>

                      {/* Section 3 Interactive 2026 Cookie Preferences */}
                      {sec.hasCookieControls && (
                        <div
                          data-testid="cookie-controls-box"
                          className="mt-4 p-4 rounded-2xl space-y-3"
                          style={{
                            backgroundColor: 'var(--glass)',
                            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                          }}
                        >
                          <div className="text-xs font-medium flex items-center gap-2" style={{ color: 'var(--mut)' }}>
                            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--acc-text)' }} />
                            <span>
                              {dict.cookieStatusLabel}:{' '}
                              <strong style={{ color: 'var(--fg)' }}>{consentStatusSummary}</strong>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <BubbleButton
                              variant="solid"
                              data-testid="cookie-accept-all"
                              onClick={() => applyConsent(true, true, false)}
                              className="h-10 px-4 rounded-full text-xs font-semibold cursor-pointer hover:bg-[var(--glass2)]"
                              style={{
                                backgroundColor: 'var(--glass)',
                                boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                                color: 'var(--fg)',
                              }}
                            >
                              {dict.cookieAcceptAll}
                            </BubbleButton>
                            <BubbleButton
                              variant="glass"
                              data-testid="cookie-reject-all"
                              onClick={() => applyConsent(false, false, true)}
                              className="h-10 px-4 rounded-full text-xs font-semibold cursor-pointer hover:bg-[var(--glass2)]"
                              style={{
                                backgroundColor: 'var(--glass)',
                                boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                                color: 'var(--fg)',
                              }}
                            >
                              {dict.cookieRejectAll}
                            </BubbleButton>
                            <BubbleButton
                              variant="glass"
                              data-testid="cookie-customize-btn"
                              onClick={() => setShowCustomPanel((v) => !v)}
                              contentClassName="inline-flex items-center justify-center gap-1.5 w-full h-full"
                              className="h-10 px-4 rounded-full text-xs font-semibold cursor-pointer hover:bg-[var(--glass2)]"
                              style={{
                                backgroundColor: 'var(--glass)',
                                boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                                color: 'var(--fg)',
                              }}
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                              <span>{dict.cookieCustomize}</span>
                            </BubbleButton>
                          </div>

                          <AnimatePresence>
                            {showCustomPanel && (
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
                                    checked={draftFunctional}
                                    onChange={(e) => setDraftFunctional(e.target.checked)}
                                    className="w-4 h-4 accent-[var(--acc)]"
                                  />
                                </label>
                                <label className="flex items-center justify-between gap-3 text-xs cursor-pointer py-1">
                                  <span>{dict.cookieAnalyticsToggle}</span>
                                  <input
                                    type="checkbox"
                                    checked={draftAnalytics}
                                    onChange={(e) => setDraftAnalytics(e.target.checked)}
                                    className="w-4 h-4 accent-[var(--acc)]"
                                  />
                                </label>
                                <BubbleButton
                                  variant="solid"
                                  onClick={() => applyConsent(draftFunctional, draftAnalytics, consent.doNotSellOrShare)}
                                  className="h-9 px-4 rounded-full text-xs font-semibold cursor-pointer"
                                  style={{
                                    backgroundColor: 'var(--acc)',
                                    color: 'var(--acc-fg)',
                                  }}
                                >
                                  {dict.cookieSaveCustom}
                                </BubbleButton>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <p className="text-[11px]" style={{ color: 'var(--mut)' }}>
                            {dict.cookieRevisitHint}
                          </p>
                        </div>
                      )}

                      {/* Section 8 Interactive USA CCPA/CPRA & GPC Controls */}
                      {sec.hasUsPrivacyControls && (
                        <div
                          data-testid="us-privacy-controls-box"
                          className="mt-4 p-4 rounded-2xl space-y-2.5"
                          style={{
                            backgroundColor: 'var(--glass)',
                            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                          }}
                        >
                          <div className="text-xs" style={{ color: 'var(--mut)' }}>
                            {consent.gpcDetected ? dict.usGpcDetected : dict.usGpcNotDetected}
                          </div>
                          <BubbleButton
                            variant="solid"
                            data-testid="us-do-not-sell-btn"
                            onClick={() => {
                              onUpdateConsent({
                                ...consent,
                                decided: true,
                                doNotSellOrShare: !consent.doNotSellOrShare,
                                functionalExternal: !consent.doNotSellOrShare ? false : consent.functionalExternal,
                                updatedAt: new Date().toISOString(),
                              });
                              onUserModify?.();
                            }}
                            contentClassName="flex items-center justify-start w-full h-full"
                            className="min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold text-left cursor-pointer"
                            style={{
                              backgroundColor: consent.doNotSellOrShare ? 'var(--acc)' : 'var(--glass2)',
                              color: consent.doNotSellOrShare ? 'var(--acc-fg)' : 'var(--fg)',
                              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                            }}
                          >
                            {dict.usDoNotSellLabel}:{' '}
                            {consent.doNotSellOrShare ? dict.usDoNotSellActive : dict.usDoNotSellInactive}
                          </BubbleButton>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
