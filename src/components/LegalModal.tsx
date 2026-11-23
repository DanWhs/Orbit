import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Search, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { UiDictionary } from '../i18n/translations';
import { BotReactionType, ConsentState, JurisdictionCode, LanguageCode, LegalSection } from '../types/orbit';
import { BubbleButton, LiquidBubbleLayers, useLiquidBubble } from './LiquidBubble';
import { LiveOrbMark } from './LiveOrbMark';

interface LegalModalProps {
  open: boolean;
  initialSectionId?: string | null;
  lang: LanguageCode;
  jurisdiction: JurisdictionCode;
  jurisdictionLabel: string;
  dict: UiDictionary;
  consent: ConsentState;
  reduceMotion?: boolean;
  reactionSignal?: { type: BotReactionType; nonce: number } | null;
  onClose: () => void;
  onUpdateConsent: (next: ConsentState) => void;
  onUserModify?: () => void;
}

const legalClientCache = new Map<string, LegalSection[]>();

function filterSections(sections: LegalSection[], query: string): LegalSection[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return sections;
  return sections.filter(
    (s) =>
      s.title.toLowerCase().includes(trimmed) ||
      s.body.toLowerCase().includes(trimmed) ||
      s.number.toLowerCase().includes(trimmed)
  );
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
  initialSectionId = null,
  lang,
  jurisdiction,
  jurisdictionLabel,
  dict,
  consent,
  reduceMotion = false,
  reactionSignal = null,
  onClose,
  onUpdateConsent,
  onUserModify,
}: LegalModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomPanel, setShowCustomPanel] = useState(false);
  const [allSections, setAllSections] = useState<LegalSection[]>(
    () => legalClientCache.get(`${lang}:${jurisdiction}`) ?? []
  );
  const [activeSectionId, setActiveSectionId] = useState<string>(
    () => legalClientCache.get(`${lang}:${jurisdiction}`)?.[0]?.id ?? '0'
  );
  const [draftFunctional, setDraftFunctional] = useState(consent.functionalExternal);
  const [draftAnalytics, setDraftAnalytics] = useState(consent.analytics);
  const bodyRef = useRef<HTMLDivElement>(null);
  const legalSearchBubble = useLiquidBubble({ variant: 'glass', scope: 'self' });

  useEffect(() => {
    setDraftFunctional(consent.functionalExternal);
    setDraftAnalytics(consent.analytics);
  }, [consent.functionalExternal, consent.analytics]);

  // Load localized 2026 legal corpus from backend API when modal opens or locale changes
  useEffect(() => {
    if (!open) return;
    const key = `${lang}:${jurisdiction}`;
    const hit = legalClientCache.get(key);
    if (hit) {
      setAllSections(hit);
      if (hit[0]) setActiveSectionId(hit[0].id);
      return;
    }
    let cancelled = false;
    fetch(`/api/legal?lang=${encodeURIComponent(lang)}&jurisdiction=${encodeURIComponent(jurisdiction)}`)
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { sections?: LegalSection[] };
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data?.sections)) {
          legalClientCache.set(key, data.sections);
          setAllSections(data.sections);
          if (data.sections[0]) setActiveSectionId(data.sections[0].id);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, lang, jurisdiction]);

  useEffect(() => {
    if (!open || !initialSectionId || allSections.length === 0) return;
    if (!allSections.some((sec) => sec.id === initialSectionId)) return;
    setSearchQuery('');
    setActiveSectionId(initialSectionId);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = bodyRef.current?.querySelector(`#legal-sec-${initialSectionId}`);
        el?.scrollIntoView({ behavior: 'auto', block: 'start' });
        setActiveSectionId(initialSectionId);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [open, initialSectionId, allSections]);

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

  const visibleSections = useMemo(
    () => filterSections(allSections, searchQuery),
    [allSections, searchQuery]
  );

  const handleBodyScroll = useCallback(() => {
    const container = bodyRef.current;
    if (!container || visibleSections.length === 0) return;
    const containerTop = container.getBoundingClientRect().top;
    let currentId = visibleSections[0].id;
    for (const sec of visibleSections) {
      const el = container.querySelector(`#legal-sec-${sec.id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top - containerTop <= 110) {
          currentId = sec.id;
        } else {
          break;
        }
      }
    }
    setActiveSectionId((prev) => (prev === currentId ? prev : currentId));
  }, [visibleSections]);

  const jumpToSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
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
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-modal-title"
          data-testid="legal-modal"
          initial={{ opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            y: 10,
            scale: 0.988,
            transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
          }}
          transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 flex flex-col md:flex-row overflow-hidden"
          style={{
            backgroundColor: 'var(--bg)',
            color: 'var(--fg)',
            willChange: 'transform, opacity',
            contain: 'layout style paint',
          }}
        >
          {/* Left Sidebar (Desktop) / Compact Top Header (Mobile) — mirrors SettingsModal */}
          <aside
            className="shrink-0 md:w-[276px] lg:w-[304px] md:h-full border-b md:border-b-0 md:border-r flex flex-col"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {/* Brand Row: Live Interactive Orbit Mascot + Legal Title */}
            <div className="flex items-center justify-between gap-3 px-5 sm:px-7 pt-[calc(var(--st)+18px)] md:pt-[calc(var(--st)+26px)] pb-4 md:pb-6">
              <div className="flex items-center gap-4 min-w-0">
                <LiveOrbMark
                  size={38}
                  reduceMotion={reduceMotion}
                  reactionSignal={reactionSignal}
                  ariaLabel={dict.botAriaLabel}
                />
                <h2
                  id="legal-modal-title"
                  data-testid="legal-brand-title"
                  className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.025em] leading-none truncate"
                  style={{ color: 'var(--acc-text)' }}
                >
                  {dict.legalBreadcrumbLabel}
                </h2>
              </div>

              {/* Mobile Close Button */}
              <BubbleButton
                variant="glass"
                tabIndex={0}
                data-testid="legal-close-btn-mobile"
                onClick={onClose}
                aria-label={dict.closeModal}
                contentClassName="grid place-items-center w-full h-full"
                className="md:hidden w-9 h-9 rounded-full shrink-0 cursor-pointer hover:bg-[var(--glass2)]"
                style={{
                  backgroundColor: 'var(--glass)',
                  boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                }}
              >
                <X className="w-4 h-4" />
              </BubbleButton>
            </div>

            {/* Chapter Navigation (vertical sidebar on desktop, horizontal strip on mobile) */}
            <nav
              data-testid="legal-toc"
              aria-label={dict.legalTocTitle}
              className="flex md:flex-col gap-1 px-4 pb-3 md:pb-6 overflow-x-auto md:overflow-y-auto orbit-scroll"
            >
              {allSections.map((sec) => {
                const isActive = activeSectionId === sec.id && !searchQuery.trim();
                return (
                  <button
                    key={sec.id}
                    type="button"
                    tabIndex={0}
                    data-testid={`legal-toc-${sec.id}`}
                    onClick={() => jumpToSection(sec.id)}
                    aria-current={isActive ? 'location' : undefined}
                    className="h-9 md:min-h-[38px] md:h-auto px-3.5 py-1.5 rounded-xl flex items-center gap-2.5 text-[13px] cursor-pointer shrink-0 md:shrink text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
                    style={{
                      backgroundColor: isActive ? 'rgba(var(--acc-rgb), 0.11)' : 'transparent',
                      color: isActive ? 'var(--acc-text)' : 'var(--mut)',
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    <span
                      className="text-[11px] font-bold tabular-nums shrink-0 w-4"
                      style={{ color: isActive ? 'var(--acc-text)' : 'var(--mut)' }}
                    >
                      {sec.number}.
                    </span>
                    <span className="whitespace-nowrap md:whitespace-normal md:line-clamp-1">
                      {sec.title}
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Right Main Stage */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {/* Top Search Bar + Desktop Close Button */}
            <div className="flex items-center justify-between gap-4 px-5 sm:px-10 md:px-14 pt-4 md:pt-[calc(var(--st)+22px)] pb-3 shrink-0">
              <div
                {...legalSearchBubble.dataProps}
                onPointerEnter={legalSearchBubble.onPointerEnter}
                onPointerLeave={legalSearchBubble.onPointerLeave}
                onBlur={legalSearchBubble.onBlur}
                onClick={(e) => legalSearchBubble.handleClick(e)}
                className={`${legalSearchBubble.stateClass} flex-1 max-w-[460px] h-11 px-4 rounded-full transition-all duration-200`}
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
                    tabIndex={0}
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
                        tabIndex={0}
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

              <BubbleButton
                variant="glass"
                tabIndex={0}
                data-testid="legal-close-btn"
                onClick={onClose}
                aria-label={dict.closeModal}
                contentClassName="grid place-items-center w-full h-full"
                className="hidden md:grid w-10 h-10 rounded-full shrink-0 cursor-pointer hover:bg-[var(--glass2)]"
                style={{
                  backgroundColor: 'var(--glass)',
                  boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                }}
              >
                <X className="w-4 h-4" />
              </BubbleButton>
            </div>

            {/* Scrollable Document Body */}
            <div
              ref={bodyRef}
              onScroll={handleBodyScroll}
              className="flex-1 overflow-y-auto orbit-scroll px-5 sm:px-10 md:px-14 pt-3 pb-[max(40px,var(--sb))]"
            >
              <div className="max-w-[680px] space-y-7">
                {/* Jurisdiction & Full Title Header */}
                <header
                  className="pb-5 border-b space-y-2"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-[0.04em] uppercase">
                    <span
                      className="inline-flex items-center gap-1.5"
                      style={{ color: 'var(--acc-text)' }}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{dict.legalJurisdictionBadge}</span>
                    </span>
                    <span style={{ color: 'var(--mut)' }} aria-hidden="true">
                      /
                    </span>
                    <span style={{ color: 'var(--mut)' }}>{jurisdictionLabel}</span>
                  </div>
                  <h3
                    className="text-[19px] sm:text-[22px] font-semibold tracking-[-0.02em] leading-snug"
                    style={{ textWrap: 'balance' }}
                  >
                    {dict.legalModalTitle}
                  </h3>
                </header>

                {/* Legal Chapters (0..9) */}
                {visibleSections.length === 0 ? (
                  <p className="text-sm py-12 text-center" style={{ color: 'var(--mut)' }}>
                    {allSections.length > 0 ? dict.legalNoMatches : '...'}
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
                        <h4 className="text-[15px] sm:text-base font-semibold tracking-[-0.01em] mb-2.5 flex items-baseline gap-2.5">
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
                        </h4>
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
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
