import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Settings } from 'lucide-react';
import { BootSplash } from './components/BootSplash';
import { CookieNoticeModal } from './components/CookieNoticeModal';
import { FooterBar } from './components/FooterBar';
import { LegalModal } from './components/LegalModal';
import { BubbleButton } from './components/LiquidBubble';
import { BotReactionType, OrbitBot } from './components/OrbitBot';
import { SearchBlock } from './components/SearchBlock';
import { SettingsModal } from './components/SettingsModal';
import { SupportModal } from './components/SupportModal';
import { getAccentPreset, hexToRgb } from './constants/accents';
import {
  getCachedDictionary,
  getInitialLocaleOption,
  LOCALE_REGION_OPTIONS,
  prewarmTranslationCache,
} from './i18n/translations';
import {
  AccentId,
  BootPhase,
  ConsentState,
  LocaleRegionOption,
  QuickLink,
  SearchSuggestion,
  ThemeMode,
} from './types/orbit';
import { computeStageLayout, damp, StageLayoutResult } from './utils/layoutMath';
import {
  buildSuggestions,
  clearSearchHistory,
  detectSearchEngine,
  fetchExternalSuggestions,
  getHistorySuggestions,
  resolveDestinationUrl,
  saveSearchHistory,
} from './utils/searchEngine';
import {
  DEFAULT_QUICK_LINKS,
  getInitialAccent,
  getInitialConsent,
  getInitialTheme,
  readStorage,
  sanitizeQuickLinks,
  STORAGE_KEYS,
  writeStorage,
} from './utils/storage';

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [accentId, setAccentId] = useState<AccentId>(getInitialAccent);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(() =>
    sanitizeQuickLinks(readStorage(STORAGE_KEYS.quickLinks, DEFAULT_QUICK_LINKS))
  );
  const [localeOption, setLocaleOption] = useState<LocaleRegionOption>(getInitialLocaleOption);
  const [consent, setConsent] = useState<ConsentState>(getInitialConsent);

  const [bootPhase, setBootPhase] = useState<BootPhase>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'ready';
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'ready';
    }
    return 'word';
  });

  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>(() => getHistorySuggestions());
  const [caretRatio, setCaretRatio] = useState(0);
  const [reactionSignal, setReactionSignal] = useState<{ type: BotReactionType; nonce: number } | null>(
    null
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const [vvTopOffset, setVvTopOffset] = useState(0);
  const [vvHeight, setVvHeight] = useState(() =>
    typeof window !== 'undefined' ? Math.round(window.visualViewport?.height ?? window.innerHeight) : 900
  );
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const rulerRef = useRef<HTMLSpanElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const modifyParityRef = useRef(0);
  const searchEngine = useMemo(() => detectSearchEngine(), []);

  const cookieNoticeOpen =
    bootPhase === 'ready' && !consent.decided && !settingsOpen && !legalOpen && !supportOpen;
  const isMenuOpen = settingsOpen || legalOpen || supportOpen || cookieNoticeOpen;
  const isDesktop = viewportWidth >= 768;

  // Trigger judging or perplexed face whenever user modifies settings or preferences
  const triggerModifyReaction = useCallback(() => {
    modifyParityRef.current = (modifyParityRef.current + 1) % 2;
    const type: BotReactionType = modifyParityRef.current === 1 ? 'perplexed' : 'judge';
    setReactionSignal({ type, nonce: Date.now() + Math.random() });
  }, []);

  // Prewarm local translation cache synchronously
  useEffect(() => {
    prewarmTranslationCache();
  }, []);

  // Resolve active translation dictionary synchronously (zero flicker)
  const dict = useMemo(
    () => getCachedDictionary(localeOption.lang, localeOption.jurisdiction),
    [localeOption.lang, localeOption.jurisdiction]
  );

  // Sync <html lang> and theme / accent CSS tokens (zero glow)
  const activeAccent = useMemo(() => getAccentPreset(accentId), [accentId]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = localeOption.lang;
    root.classList.toggle('dark', theme === 'dark');
    root.style.setProperty('--bot', activeAccent.hex);
    root.style.setProperty('--acc', activeAccent.hex);
    root.style.setProperty('--acc-rgb', hexToRgb(activeAccent.hex));
    root.style.setProperty(
      '--acc-text',
      theme === 'dark' ? activeAccent.hex : activeAccent.lightTextHex
    );
    root.style.setProperty('--acc-fg', activeAccent.fgOnAccent);
    writeStorage(STORAGE_KEYS.theme, theme);
    writeStorage(STORAGE_KEYS.accent, accentId);
  }, [theme, activeAccent, accentId, localeOption.lang]);

  // Boot splash sequence: ORBIT -> keyboard Backspace erase -> bot pops in + winks -> ready
  useEffect(() => {
    if (bootPhase === 'ready') return;

    const t1 = setTimeout(() => setBootPhase('collapsing'), 420);
    const t2 = setTimeout(() => setBootPhase('pop'), 940);
    const t3 = setTimeout(() => setBootPhase('ready'), 1560);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Make search bar immediately active as soon as ready
  useEffect(() => {
    if (bootPhase === 'ready' && !isMenuOpen) {
      const raf = requestAnimationFrame(() => {
        inputRef.current?.focus({ preventScroll: true });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [bootPhase, isMenuOpen]);

  // Track visualViewport & window dimensions for responsive centering and virtual keyboard adaptation
  const viewportStateRef = useRef({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? Math.round(window.visualViewport?.height ?? window.innerHeight) : 900,
    fullHeight: typeof window !== 'undefined' ? Math.round(window.visualViewport?.height ?? window.innerHeight) : 900,
    safeTop: 0,
    safeBottom: 0,
    isMobile: false,
    isFocused: false,
    hasQuickLinks: quickLinks.length > 0,
    suggestionCount: suggestions.length,
    isMenuOpen: false,
    cookieNoticeOpen: false,
    blurAt: 0,
  });

  viewportStateRef.current.isFocused = isFocused && !isMenuOpen;
  viewportStateRef.current.hasQuickLinks = quickLinks.length > 0;
  viewportStateRef.current.suggestionCount = suggestions.length;
  viewportStateRef.current.isMenuOpen = isMenuOpen;
  viewportStateRef.current.cookieNoticeOpen = cookieNoticeOpen;

  const [animatedLayout, setAnimatedLayout] = useState<StageLayoutResult>(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const h = typeof window !== 'undefined' ? Math.round(window.visualViewport?.height ?? window.innerHeight) : 900;
    const mob = typeof window !== 'undefined' ? window.matchMedia('(max-width:700px),(pointer:coarse)').matches : false;
    return computeStageLayout({
      viewportWidth: w,
      viewportHeight: h,
      fullHeight: h,
      safeTop: 0,
      safeBottom: 0,
      isMobile: mob,
      isFocused: false,
      hasQuickLinks: quickLinks.length > 0,
      suggestionCount: 0,
    });
  });

  useEffect(() => {
    const syncViewport = () => {
      const vv = window.visualViewport;
      const h = Math.round(vv ? vv.height : window.innerHeight);
      const top = Math.round(vv ? vv.offsetTop : 0);
      const w = window.innerWidth;
      const mob = window.matchMedia('(max-width:700px),(pointer:coarse)').matches;

      const probeEl = probeRef.current;
      let st = 0;
      let sb = 0;
      if (probeEl) {
        const cs = getComputedStyle(probeEl);
        st = parseFloat(cs.paddingTop) || 0;
        sb = parseFloat(cs.paddingBottom) || 0;
      }
      document.documentElement.style.setProperty('--st', `${st}px`);
      document.documentElement.style.setProperty('--sb', `${sb}px`);

      const vs = viewportStateRef.current;
      vs.width = w;
      vs.height = h;
      vs.safeTop = st;
      vs.safeBottom = sb;
      vs.isMobile = mob;

      if (h >= vs.fullHeight || (!vs.isFocused && performance.now() - vs.blurAt > 450)) {
        vs.fullHeight = h;
      }

      setViewportWidth(w);
      setVvHeight(h);
      setVvTopOffset(top);
    };

    syncViewport();
    const onOrientation = () => {
      viewportStateRef.current.fullHeight = 0;
      setTimeout(syncViewport, 250);
    };

    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', onOrientation);
    window.visualViewport?.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('scroll', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', onOrientation);
      window.visualViewport?.removeEventListener('resize', syncViewport);
      window.visualViewport?.removeEventListener('scroll', syncViewport);
    };
  }, []);

  // Damped smooth layout spring animation loop
  useEffect(() => {
    let rafId = 0;
    let last = performance.now();
    const initialTarget = computeStageLayout({
      viewportWidth: viewportStateRef.current.width,
      viewportHeight: viewportStateRef.current.height,
      fullHeight: viewportStateRef.current.fullHeight,
      safeTop: viewportStateRef.current.safeTop,
      safeBottom: viewportStateRef.current.safeBottom,
      isMobile: viewportStateRef.current.isMobile,
      isFocused: viewportStateRef.current.isFocused,
      hasQuickLinks: viewportStateRef.current.hasQuickLinks,
      suggestionCount: viewportStateRef.current.suggestionCount,
    });

    const botSizeState = { p: initialTarget.botSize, v: 0 };
    const botCenterState = { p: initialTarget.botCenterY, v: 0 };
    const uiTopState = { p: initialTarget.uiTopY, v: 0 };
    let lastSig = '';

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const vs = viewportStateRef.current;
      const target = computeStageLayout({
        viewportWidth: vs.width,
        viewportHeight: vs.height,
        fullHeight: vs.fullHeight,
        safeTop: vs.safeTop,
        safeBottom: vs.safeBottom,
        isMobile: vs.isMobile,
        isFocused: vs.isFocused,
        hasQuickLinks: vs.hasQuickLinks,
        suggestionCount: vs.suggestionCount,
      });

      // On desktop when side menu or cookie notice is open, center Orb vertically on the left stage.
      // On mobile when cookie notice is open, sit Orb cleanly in the upper stage above the bottom card.
      const desiredBotSize =
        vs.cookieNoticeOpen && vs.width < 768
          ? Math.min(target.botSize, Math.max(82, vs.height * 0.15))
          : target.botSize;
      const desiredBotCenterY =
        vs.isMenuOpen && vs.width >= 768
          ? vs.height * 0.5
          : vs.cookieNoticeOpen && vs.width < 768
            ? Math.max(90, vs.safeTop + Math.min(132, vs.height * 0.175))
            : target.botCenterY;

      const bSize = damp(botSizeState, desiredBotSize, 0.28, dt);
      const bCenter = damp(botCenterState, desiredBotCenterY, 0.28, dt);
      const uTop = damp(uiTopState, target.uiTopY, 0.28, dt);

      const sig = `${bSize.toFixed(1)}|${bCenter.toFixed(1)}|${uTop.toFixed(1)}|${target.visibleSuggestions}|${target.keyboardActive}`;
      if (sig !== lastSig) {
        lastSig = sig;
        setAnimatedLayout({
          botSize: bSize,
          botCenterY: bCenter,
          uiTopY: uTop,
          scale: bSize / Math.max(1, target.baseBotSize),
          baseBotSize: target.baseBotSize,
          visibleSuggestions: target.visibleSuggestions,
          keyboardActive: target.keyboardActive,
        });
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Live privacy-compliant search suggestions
  const reqIdRef = useRef(0);
  useEffect(() => {
    const trimmed = query.trim();
    const reqId = ++reqIdRef.current;

    if (!trimmed) {
      setSuggestions(getHistorySuggestions());
      return;
    }

    setSuggestions(buildSuggestions(trimmed, [], localeOption.lang));

    if (!consent.functionalExternal) return;

    const timer = setTimeout(async () => {
      const ext = await fetchExternalSuggestions(trimmed, localeOption.lang, true);
      if (reqId !== reqIdRef.current || !ext) return;
      setSuggestions(buildSuggestions(trimmed, ext, localeOption.lang));
    }, 120);

    return () => clearTimeout(timer);
  }, [query, localeOption.lang, consent.functionalExternal]);

  const measureCaret = useCallback(() => {
    const input = inputRef.current;
    const ruler = rulerRef.current;
    if (!input || !ruler) return;
    const cs = getComputedStyle(input);
    ruler.style.font = cs.font;
    ruler.style.letterSpacing = cs.letterSpacing;
    const pos = input.selectionStart ?? input.value.length;
    ruler.textContent = input.value.slice(0, pos);
    const width = ruler.offsetWidth;
    const inputW = Math.max(120, input.clientWidth || 300);
    const ratio = Math.max(-1, Math.min(1, ((width - input.scrollLeft) / inputW) * 2 - 0.85));
    setCaretRatio(ratio);
  }, []);

  const handleSubmit = (overrideVal?: string) => {
    const finalQuery = (overrideVal ?? query).trim();
    if (!finalQuery) return;
    saveSearchHistory(finalQuery);
    setQuery(finalQuery);
    setReactionSignal({ type: 'happy', nonce: Date.now() });
    inputRef.current?.blur();

    const dest = resolveDestinationUrl(finalQuery, searchEngine);
    setTimeout(() => {
      try {
        window.location.assign(dest);
      } catch {
        // Fallback if navigation is restricted in sandboxed preview
      }
    }, 420);
  };

  const handleQuickLinksChange = (next: QuickLink[]) => {
    const clean = sanitizeQuickLinks(next);
    setQuickLinks(clean);
    writeStorage(STORAGE_KEYS.quickLinks, clean);
  };

  const handleLocaleChange = (optionId: string) => {
    const found = LOCALE_REGION_OPTIONS.find((opt) => opt.id === optionId);
    if (!found) return;
    setLocaleOption(found);
    writeStorage(STORAGE_KEYS.localeRegion, found.id);
    if (isMenuOpen) triggerModifyReaction();
  };

  const handleUpdateConsent = (next: ConsentState) => {
    setConsent(next);
    writeStorage(STORAGE_KEYS.consent, next);
  };

  const handleAcceptCookieNotice = (next: ConsentState) => {
    handleUpdateConsent(next);
    setReactionSignal({ type: 'happy', nonce: Date.now() + Math.random() });
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    const trimmed = query.trim();
    setSuggestions(trimmed ? buildSuggestions(trimmed, [], localeOption.lang) : []);
  };

  const isUiReady = bootPhase === 'ready';
  const botHorizontalPercent = isMenuOpen && isDesktop ? 24 : 50;

  return (
    <div
      data-testid="orbit-app"
      data-boot-phase={bootPhase}
      data-theme={theme}
      data-keyboard-active={animatedLayout.keyboardActive ? 'true' : 'false'}
      data-menu-open={isMenuOpen ? 'true' : 'false'}
      data-cookie-notice-open={cookieNoticeOpen ? 'true' : 'false'}
      className="fixed left-0 top-0 w-full overflow-hidden select-none"
      style={{
        height: `${vvHeight}px`,
        transform: `translate3d(0, ${vvTopOffset}px, 0)`,
      }}
      onPointerDown={(e) => {
        if (isFocused && !isMenuOpen && !(e.target as HTMLElement).closest('#search-ui')) {
          inputRef.current?.blur();
        }
      }}
    >
      {/* Subtle atmospheric glow + micro-dot background pattern */}
      <div className="orbit-ambient-bg" aria-hidden="true" />

      {/* Safe area probe */}
      <div
        ref={probeRef}
        className="fixed invisible pointer-events-none"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        aria-hidden="true"
      />

      {/* Offscreen caret ruler */}
      <span
        ref={rulerRef}
        className="fixed -left-[9999px] top-0 whitespace-pre invisible pointer-events-none"
        aria-hidden="true"
      />

      {/* Top-Right Settings Gear Button (hidden cleanly when menu or mobile keyboard active) */}
      <header
        className="fixed left-0 right-0 top-0 z-30 flex justify-end px-4 pt-[calc(var(--st)+14px)] pointer-events-none transition-opacity duration-300"
        style={{
          opacity: isUiReady && !animatedLayout.keyboardActive && !isMenuOpen ? 1 : 0,
        }}
      >
        <BubbleButton
          variant="glass"
          data-testid="settings-btn"
          aria-label={dict.settingsAria}
          onClick={() => {
            inputRef.current?.blur();
            setSettingsOpen(true);
          }}
          contentClassName="grid place-items-center w-full h-full"
          className="pointer-events-auto w-11 h-11 rounded-full backdrop-blur-2xl cursor-pointer hover:bg-[var(--glass2)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
          style={{
            backgroundColor: 'var(--glass)',
            color: 'var(--fg)',
            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
          }}
        >
          <Settings className="w-5 h-5" />
        </BubbleButton>
      </header>

      {/* Smooth blurred background layer behind Orb when Settings or Legal menu is open */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            data-testid="menu-blur-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-30 backdrop-blur-md pointer-events-none"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(5, 7, 12, 0.36)' : 'rgba(244, 246, 250, 0.42)',
            }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Boot Splash Sequence */}
      <BootSplash phase={bootPhase} centerY={animatedLayout.botCenterY} />

      {/* Central Mascot with Single Crisp Orbital Ring (stays z-40 above backdrop blur on PC) */}
      <main>
        <OrbitBot
          bootPhase={bootPhase}
          botSize={animatedLayout.botSize}
          botCenterY={animatedLayout.botCenterY}
          horizontalPercent={botHorizontalPercent}
          menuOpen={isMenuOpen}
          scale={animatedLayout.scale}
          isFocused={isFocused && !isMenuOpen}
          caretRatio={caretRatio}
          reactionSignal={reactionSignal}
          ariaLabel={dict.botAriaLabel}
        />

        {/* Search Bar + Width-Matched Quick Links + Suggestions */}
        <SearchBlock
          visible={isUiReady}
          uiTopY={animatedLayout.uiTopY}
          query={query}
          isFocused={isFocused && !isMenuOpen}
          quickLinks={quickLinks}
          suggestions={suggestions}
          visibleSuggestions={animatedLayout.visibleSuggestions}
          dict={dict}
          inputRef={inputRef}
          onQueryChange={setQuery}
          onFocus={() => {
            setIsFocused(true);
            measureCaret();
          }}
          onBlur={() => {
            viewportStateRef.current.blurAt = performance.now();
            setIsFocused(false);
          }}
          onSubmit={handleSubmit}
          onCaretMove={measureCaret}
          onClearHistory={handleClearHistory}
        />
      </main>

      {/* Minimal Discreet Footer with Accent Legal Link + Language/Region Selector */}
      <FooterBar
        visible={isUiReady && !animatedLayout.keyboardActive}
        localeOption={localeOption}
        dict={dict}
        onOpenLegal={() => {
          inputRef.current?.blur();
          setLegalOpen(true);
        }}
        onSelectLocaleRegion={handleLocaleChange}
      />

      {/* First-Open Cookie Notice presented alongside Orb */}
      <CookieNoticeModal
        open={cookieNoticeOpen}
        dict={dict}
        consent={consent}
        onAcceptConsent={handleAcceptCookieNotice}
        onOpenLegal={() => setLegalOpen(true)}
        onUserModify={triggerModifyReaction}
      />

      {/* Settings Drawer / Modal */}
      <SettingsModal
        open={settingsOpen}
        theme={theme}
        accentId={accentId}
        quickLinks={quickLinks}
        lang={localeOption.lang}
        dict={dict}
        consent={consent}
        onClose={() => setSettingsOpen(false)}
        onThemeChange={setTheme}
        onAccentChange={setAccentId}
        onQuickLinksChange={handleQuickLinksChange}
        onUpdateConsent={handleUpdateConsent}
        onOpenLegal={() => {
          setSettingsOpen(false);
          setLegalOpen(true);
        }}
        onOpenSupport={() => {
          setSettingsOpen(false);
          setSupportOpen(true);
        }}
        onUserModify={triggerModifyReaction}
      />

      {/* Buy Me a Coffee Support / Donation Popup */}
      <SupportModal
        open={supportOpen}
        dict={dict}
        onClose={() => setSupportOpen(false)}
        onCelebrate={() => {
          setReactionSignal({ type: 'happy', nonce: Date.now() + Math.random() });
        }}
      />

      {/* Legal & Privacy 2026 Interactive Drawer / Modal */}
      <LegalModal
        open={legalOpen}
        lang={localeOption.lang}
        jurisdiction={localeOption.jurisdiction}
        jurisdictionLabel={localeOption.fullLabel}
        dict={dict}
        consent={consent}
        onClose={() => setLegalOpen(false)}
        onUpdateConsent={handleUpdateConsent}
        onUserModify={triggerModifyReaction}
      />
    </div>
  );
}
