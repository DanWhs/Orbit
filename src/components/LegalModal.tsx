import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react';
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

export const LegalModal = memo(function LegalModal({
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

  const applyConsent = (
    functionalExternal: boolean,
    analytics: boolean,
    doNotSellOrShare: boolean
  ) => {
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

  const isAllAccepted = consent.decided && consent.functionalExternal && consent.analytics;
  const isAllRejected = consent.decided && !consent.functionalExternal && !consent.analytics;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center md:justify-end p-3 sm:p-5 md:pr-10 lg:pr-14 pointer-events-none">
          {/* Click-outside capture layer (blur sits behind Orb at z-30) */}
          <div className="fixed inset-0 pointer-events-auto" onClick={onClose} aria-hidden="true" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-modal-title"
            data-testid="legal-modal"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 14 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 pointer-events-auto w-full max-w-[700px] h-[88vh] flex flex-col rounded-[32px] overflow-hidden"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--bg) 74%, var(--menu-glass))',
              backgroundImage:
                'radial-gradient(100% 45% at 88% 0%, rgba(var(--acc-rgb), 0.08), transparent 62%)',
              color: 'var(--fg)',
              willChange: 'transform, opacity',
              contain: 'layout style paint',
              boxShadow:
                'inset 0 1px 0 0 rgba(255, 255, 255, 0.16), inset 0 0 0 1px var(--border-subtle), 0 32px 84px -24px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Editorial Top Header + Signature Orbit Search Bar */}
            <header
              className="px-6 sm:px-7 pt-6 pb-5 border-b space-y-4 shrink-0"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-[0.04em] uppercase mb-1.5">
                    <span
                      className="inline-flex items-center gap-1.5"
                      style={{ color: 'var(--acc-text)' }}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{dict.legalJurisdictionBadge}</span>
                    </span>
                    <span style={{ color: 'var(--mut)' }} aria-hidden="true">
                      /
                    </span>
                    <span style={{ color: 'var(--mut)' }}>{jurisdictionLabel}</span>
                  </div>
                  <h2
                    id="legal-modal-title"
                    className="text-[19px] sm:text-[21px] font-semibold tracking-[-0.02em] leading-snug"
                    style={{ textWrap: 'balance' }}
                  >
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

              {/* Internal Keyword Search Bar (signature Orbit pill + LiquidBubble perimeter) */}
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
                      <span
                        className="text-xs font-medium tabular-nums whitespace-nowrap shrink-0"
                        style={{ color: 'var(--mut)' }}
                      >
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
            </header>

            {/* Scrollable Editorial Legal Body */}
            <div
              ref={bodyRef}
              className="flex-1 overflow-y-auto orbit-scroll px-6 sm:px-7 py-6 space-y-7"
            >
              {/* Clean Architectural Index (no boxed card clutter) */}
              <nav
                data-testid="legal-toc"
                aria-label={dict.legalTocTitle}
                className="pb-6 border-b"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <h3
                  className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-3"
                  style={{ color: 'var(--mut)' }}
                >
                  {dict.legalTocTitle}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
                  {allSections.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => jumpToSection(sec.id)}
                      className="text-left text-xs font-medium px-2 py-1.5 rounded-xl cursor-pointer transition-colors hover:bg-[var(--glass)] flex items-baseline gap-2"
                    >
                      <span
                        className="font-bold tabular-nums shrink-0 w-4"
                        style={{ color: 'var(--acc-text)' }}
                      >
                        {sec.number}.
                      </span>
                      <span className="truncate">{sec.title}</span>
                    </button>
                  ))}
                </div>
              </nav>

              {/* Legal Chapters (0..9) */}
              {visibleSections.length === 0 ? (
                <p className="text-sm py-10 text-center" style={{ color: 'var(--mut)' }}>
                  {dict.legalNoMatches}
                </p>
              ) : (
                <div className="space-y-6">
                  {visibleSections.map((sec) => (
                    <article
                      key={sec.id}
                      id={`legal-sec-${sec.id}`}
                      data-testid={`legal-section-${sec.id}`}
                      className="scroll-mt-5 pb-6 border-b last:border-b-0"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <h3 className="text-[15px] sm:text-base font-semibold tracking-[-0.01em] mb-2.5 flex items-baseline gap-2.5">
                        <span
                          className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-md shrink-0"
                          style={{
                            backgroundColor: 'rgba(var(--acc-rgb), 0.14)',
                            color: 'var(--acc-text)',
                          }}
                        >
                          {sec.number}
                        </span>
                        <span>{renderHighlightedText(sec.title, searchQuery)}</span>
                      </h3>
                      <p
                        className="text-[13.5px] sm:text-[14px] leading-[1.72]"
                        style={{ color: 'var(--fg)', opacity: 0.9 }}
                      >
                        {renderHighlightedText(sec.body, searchQuery)}
                      </p>

                      {/* Section 3 Interactive Cookie Preferences */}
                      {sec.hasCookieControls && (
                        <div
                          data-testid="cookie-controls-box"
                          className="mt-5 rounded-2xl overflow-hidden"
                          style={{
                            backgroundColor: 'var(--glass)',
                            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                          }}
                        >
                          <div
                            className="px-4 py-3 border-b flex items-center gap-2.5 text-xs"
                            style={{ borderColor: 'var(--border-subtle)', color: 'var(--mut)' }}
                          >
                            <CheckCircle2
                              className="w-4 h-4 shrink-0"
                              style={{ color: 'var(--acc-text)' }}
                            />
                            <span>
                              {dict.cookieStatusLabel}:{' '}
                              <strong className="font-semibold" style={{ color: 'var(--fg)' }}>
                                {consentStatusSummary}
                              </strong>
                            </span>
                          </div>

                          <div className="p-4 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <BubbleButton
                                variant="glass"
                                data-testid="cookie-accept-all"
                                onClick={() => applyConsent(true, true, false)}
                                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer hover:bg-[var(--glass2)]"
                                style={{
                                  backgroundColor: isAllAccepted ? 'var(--glass2)' : 'var(--glass)',
                                  boxShadow: isAllAccepted
                                    ? 'inset 0 0 0 1.5px var(--acc)'
                                    : 'inset 0 0 0 1px var(--border-subtle)',
                                  color: 'var(--fg)',
                                }}
                              >
                                {dict.cookieAcceptAll}
                              </BubbleButton>
                              <BubbleButton
                                variant="glass"
                                data-testid="cookie-reject-all"
                                onClick={() => applyConsent(false, false, true)}
                                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer hover:bg-[var(--glass2)]"
                                style={{
                                  backgroundColor: isAllRejected ? 'var(--glass2)' : 'var(--glass)',
                                  boxShadow: isAllRejected
                                    ? 'inset 0 0 0 1.5px var(--acc)'
                                    : 'inset 0 0 0 1px var(--border-subtle)',
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
                                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer hover:bg-[var(--glass2)]"
                                style={{
                                  backgroundColor: showCustomPanel ? 'var(--glass2)' : 'var(--glass)',
                                  boxShadow: showCustomPanel
                                    ? 'inset 0 0 0 1.5px var(--acc)'
                                    : 'inset 0 0 0 1px var(--border-subtle)',
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
                                  className="overflow-hidden pt-3 border-t space-y-2"
                                  style={{ borderColor: 'var(--border-subtle)' }}
                                >
                                  <label className="flex items-center justify-between gap-3 text-xs font-medium cursor-pointer py-1.5">
                                    <span>{dict.cookieFunctionalToggle}</span>
                                    <span className="relative inline-flex items-center shrink-0">
                                      <input
                                        type="checkbox"
                                        checked={draftFunctional}
                                        onChange={(e) => setDraftFunctional(e.target.checked)}
                                        className="sr-only peer"
                                      />
                                      <span
                                        aria-hidden="true"
                                        className="w-10 h-5.5 rounded-full transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--acc)] relative block"
                                        style={{
                                          backgroundColor: draftFunctional
                                            ? 'var(--acc)'
                                            : 'var(--glass2)',
                                          boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                                        }}
                                      >
                                        <span
                                          className="block w-4 h-4 rounded-full transition-transform duration-200 mt-[3px]"
                                          style={{
                                            backgroundColor: draftFunctional
                                              ? 'var(--acc-fg)'
                                              : 'var(--fg)',
                                            transform: draftFunctional
                                              ? 'translateX(21px)'
                                              : 'translateX(3px)',
                                          }}
                                        />
                                      </span>
                                    </span>
                                  </label>

                                  <label className="flex items-center justify-between gap-3 text-xs font-medium cursor-pointer py-1.5">
                                    <span>{dict.cookieAnalyticsToggle}</span>
                                    <span className="relative inline-flex items-center shrink-0">
                                      <input
                                        type="checkbox"
                                        checked={draftAnalytics}
                                        onChange={(e) => setDraftAnalytics(e.target.checked)}
                                        className="sr-only peer"
                                      />
                                      <span
                                        aria-hidden="true"
                                        className="w-10 h-5.5 rounded-full transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--acc)] relative block"
                                        style={{
                                          backgroundColor: draftAnalytics
                                            ? 'var(--acc)'
                                            : 'var(--glass2)',
                                          boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                                        }}
                                      >
                                        <span
                                          className="block w-4 h-4 rounded-full transition-transform duration-200 mt-[3px]"
                                          style={{
                                            backgroundColor: draftAnalytics
                                              ? 'var(--acc-fg)'
                                              : 'var(--fg)',
                                            transform: draftAnalytics
                                              ? 'translateX(21px)'
                                              : 'translateX(3px)',
                                          }}
                                        />
                                      </span>
                                    </span>
                                  </label>

                                  <div className="pt-1">
                                    <BubbleButton
                                      variant="solid"
                                      onClick={() =>
                                        applyConsent(
                                          draftFunctional,
                                          draftAnalytics,
                                          consent.doNotSellOrShare
                                        )
                                      }
                                      className="h-9 px-4 rounded-full text-xs font-semibold cursor-pointer"
                                      style={{
                                        backgroundColor: 'var(--acc)',
                                        color: 'var(--acc-fg)',
                                      }}
                                    >
                                      {dict.cookieSaveCustom}
                                    </BubbleButton>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--mut)' }}>
                              {dict.cookieRevisitHint}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Section 8 Interactive USA CCPA/CPRA & GPC Controls */}
                      {sec.hasUsPrivacyControls && (
                        <div
                          data-testid="us-privacy-controls-box"
                          className="mt-5 p-4 rounded-2xl space-y-3"
                          style={{
                            backgroundColor: 'var(--glass)',
                            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                          }}
                        >
                          <div className="text-xs leading-relaxed" style={{ color: 'var(--mut)' }}>
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
                                functionalExternal: !consent.doNotSellOrShare
                                  ? false
                                  : consent.functionalExternal,
                                updatedAt: new Date().toISOString(),
                              });
                              onUserModify?.();
                            }}
                            contentClassName="flex items-center justify-start w-full h-full"
                            className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold text-left cursor-pointer"
                            style={{
                              backgroundColor: consent.doNotSellOrShare
                                ? 'var(--acc)'
                                : 'var(--glass2)',
                              color: consent.doNotSellOrShare ? 'var(--acc-fg)' : 'var(--fg)',
                              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                            }}
                          >
                            {dict.usDoNotSellLabel}:{' '}
                            {consent.doNotSellOrShare
                              ? dict.usDoNotSellActive
                              : dict.usDoNotSellInactive}
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
});
