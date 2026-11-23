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
import { resolveAccentTokens, hexToRgb } from './constants/accents';
import {
  getCachedDictionary,
  getInitialLocaleOption,
  LOCALE_REGION_OPTIONS,
  prewarmTranslationCache,
} from './i18n/translations';
import {
  AccentValue,
  BootPhase,
  ConsentState,
  LocaleRegionOption,
  QuickLink,
  ResolvedTheme,
  SearchSuggestion,
  ThemeMode,
} from './types/orbit';
import { computeStageLayout } from './utils/layoutMath';
import { playUiSound, unlockOrbitAudio } from './utils/orbSounds';
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
  getInitialIntroPreferences,
  getInitialTheme,
  IntroPreferences,
  readStorage,
  resolveThemeMode,
  sanitizeQuickLinks,
  shouldShowBootIntro,
  STORAGE_KEYS,
  writeStorage,
} from './utils/storage';

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [prefersDark, setPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
      : true
  );
  const [accentId, setAccentId] = useState<AccentValue>(getInitialAccent);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(() =>
    sanitizeQuickLinks(readStorage(STORAGE_KEYS.quickLinks, DEFAULT_QUICK_LINKS))
  );
  const [localeOption, setLocaleOption] = useState<LocaleRegionOption>(getInitialLocaleOption);
  const [consent, setConsent] = useState<ConsentState>(getInitialConsent);
  const [introPrefs, setIntroPrefs] = useState<IntroPreferences>(getInitialIntroPreferences);

  const [bootPhase, setBootPhase] = useState<BootPhase>(() => {
    const autostart =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('autostart') === '1';
    const reducedMotion =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const shouldPlay = shouldShowBootIntro({
      introSeen: introPrefs.introSeen,
      alwaysShowIntro: introPrefs.alwaysShowIntro,
      consentDecided: consent.decided,
      autostart,
      reducedMotion,
    });
    return shouldPlay ? 'word' : 'ready';
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

  const [viewportMetrics, setViewportMetrics] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const h = typeof window !== 'undefined' ? Math.round(window.visualViewport?.height ?? window.innerHeight) : 900;
    const top = typeof window !== 'undefined' ? Math.round(window.visualViewport?.offsetTop ?? 0) : 0;
    const mob =
      typeof window !== 'undefined'
        ? window.matchMedia('(max-width:700px),(pointer:coarse)').matches
        : false;
    return {
      width: w,
      height: h,
      topOffset: top,
      fullHeight: h,
      safeTop: 0,
      safeBottom: 0,
      isMobile: mob,
    };
  });
  const [animateStageTransition, setAnimateStageTransition] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const rulerRef = useRef<HTMLSpanElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const modifyParityRef = useRef(0);
  const pointerInSearchRef = useRef(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurAtRef = useRef(0);
  const fullHeightRef = useRef(viewportMetrics.fullHeight);
  const isFocusedRef = useRef(isFocused);
  isFocusedRef.current = isFocused;
  const searchEngine = useMemo(() => detectSearchEngine(), []);

  const cookieNoticeOpen =
    bootPhase === 'ready' && !consent.decided && !settingsOpen && !legalOpen;
  const overlayBackdropOpen = legalOpen || cookieNoticeOpen;
  const isMenuOpen = settingsOpen || overlayBackdropOpen;
  const isDesktop = viewportMetrics.width >= 768;

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

  // Follow OS prefers-color-scheme live when theme is set to 'system'
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setPrefersDark(mq.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handleChange);
      return () => mq.removeEventListener('change', handleChange);
    }
    mq.addListener(handleChange);
    return () => mq.removeListener(handleChange);
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(
    () => resolveThemeMode(theme, prefersDark),
    [theme, prefersDark]
  );

  // Sync <html lang> and theme / accent CSS tokens (zero glow)
  const activeAccent = useMemo(() => resolveAccentTokens(accentId), [accentId]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = localeOption.lang;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.style.setProperty('--bot', activeAccent.hex);
    root.style.setProperty('--acc', activeAccent.hex);
    root.style.setProperty('--acc-rgb', hexToRgb(activeAccent.hex));
    root.style.setProperty(
      '--acc-text',
      resolvedTheme === 'dark' ? activeAccent.hex : activeAccent.lightTextHex
    );
    root.style.setProperty('--acc-fg', activeAccent.fgOnAccent);
    writeStorage(STORAGE_KEYS.theme, theme);
    writeStorage(STORAGE_KEYS.accent, accentId);

    const faviconEl = document.getElementById('orbit-favicon') as HTMLLinkElement | null;
    if (faviconEl) {
      const botColor = encodeURIComponent(activeAccent.hex);
      const eyeColor = encodeURIComponent(resolvedTheme === 'dark' ? '#05070C' : '#FFFFFF');
      faviconEl.href = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='28' fill='none' stroke='${botColor}' stroke-width='3' opacity='0.82'/%3E%3Ccircle cx='32' cy='32' r='22' fill='${botColor}'/%3E%3Crect x='22.5' y='23' width='6.5' height='15.5' rx='3.25' fill='${eyeColor}' transform='rotate(-4 25.75 30.75)'/%3E%3Crect x='35' y='23' width='6.5' height='15.5' rx='3.25' fill='${eyeColor}' transform='rotate(4 38.25 30.75)'/%3E%3C/svg%3E`;
    }
  }, [theme, resolvedTheme, activeAccent, accentId, localeOption.lang]);

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

  // Enable smooth CSS GPU compositor stage transitions right after initial paint
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimateStageTransition(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Make search bar active once after initial boot on desktop only (avoid mobile/menu-close jumps)
  const initialFocusDoneRef = useRef(false);
  useEffect(() => {
    if (bootPhase === 'ready' && !isMenuOpen && !initialFocusDoneRef.current) {
      initialFocusDoneRef.current = true;
      if (!viewportMetrics.isMobile) {
        const raf = requestAnimationFrame(() => {
          inputRef.current?.focus({ preventScroll: true });
        });
        return () => cancelAnimationFrame(raf);
      }
    }
  }, [bootPhase, isMenuOpen, viewportMetrics.isMobile]);

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

      if (h >= fullHeightRef.current || (!isFocusedRef.current && performance.now() - blurAtRef.current > 450)) {
        fullHeightRef.current = h;
      }
      const nextFullH = fullHeightRef.current;

      setViewportMetrics((prev) => {
        if (
          prev.width === w &&
          prev.height === h &&
          prev.topOffset === top &&
          prev.fullHeight === nextFullH &&
          prev.safeTop === st &&
          prev.safeBottom === sb &&
          prev.isMobile === mob
        ) {
          return prev;
        }
        return {
          width: w,
          height: h,
          topOffset: top,
          fullHeight: nextFullH,
          safeTop: st,
          safeBottom: sb,
          isMobile: mob,
        };
      });
    };

    syncViewport();
    const onOrientation = () => {
      fullHeightRef.current = 0;
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

  const stageLayout = useMemo(() => {
    const layout = computeStageLayout({
      viewportWidth: viewportMetrics.width,
      viewportHeight: viewportMetrics.height,
      fullHeight: viewportMetrics.fullHeight,
      safeTop: viewportMetrics.safeTop,
      safeBottom: viewportMetrics.safeBottom,
      isMobile: viewportMetrics.isMobile,
      isFocused: isFocused && !isMenuOpen,
      hasQuickLinks: quickLinks.length > 0,
      suggestionCount: suggestions.length,
    });

    // On desktop when side menu or cookie notice is open, center Orb vertically on the left stage.
    // On mobile when cookie notice is open, sit Orb cleanly in the upper stage above the bottom card.
    const desiredBotSize =
      cookieNoticeOpen && viewportMetrics.width < 768
        ? Math.min(layout.botSize, Math.max(82, viewportMetrics.height * 0.15))
        : layout.botSize;
    const desiredBotCenterY =
      overlayBackdropOpen && viewportMetrics.width >= 768
        ? viewportMetrics.height * 0.5
        : cookieNoticeOpen && viewportMetrics.width < 768
          ? Math.max(90, viewportMetrics.safeTop + Math.min(132, viewportMetrics.height * 0.175))
          : layout.botCenterY;

    return {
      ...layout,
      botSize: desiredBotSize,
      botCenterY: desiredBotCenterY,
      scale: desiredBotSize / Math.max(1, layout.baseBotSize),
    };
  }, [
    viewportMetrics,
    isFocused,
    isMenuOpen,
    overlayBackdropOpen,
    cookieNoticeOpen,
    quickLinks.length,
    suggestions.length,
  ]);

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

  // Keep history suggestions synced across tabs, new sessions, and iOS/Safari bfcache restores
  useEffect(() => {
    const syncHistoryFromStorage = () => {
      const trimmed = query.trim();
      setSuggestions(trimmed ? buildSuggestions(trimmed, [], localeOption.lang) : getHistorySuggestions());
    };
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === STORAGE_KEYS.history) {
        syncHistoryFromStorage();
      }
    };
    const onPageShow = () => {
      syncHistoryFromStorage();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [query, localeOption.lang]);

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

  const handleSubmit = useCallback(
    (overrideVal?: string) => {
      const finalQuery = (overrideVal ?? query).trim();
      if (!finalQuery) return;
      saveSearchHistory(finalQuery);
      setQuery(finalQuery);
      setReactionSignal({ type: 'happy', nonce: Date.now() });
      inputRef.current?.blur();

      // Navigate synchronously inside the user submit/tap gesture so iOS Safari does not trigger app/redirect popups
      const dest = resolveDestinationUrl(finalQuery, searchEngine);
      try {
        window.location.assign(dest);
      } catch {
        // Fallback if navigation is restricted in sandboxed preview
      }
    },
    [query, searchEngine]
  );

  const handleQuickLinksChange = useCallback((next: QuickLink[]) => {
    const clean = sanitizeQuickLinks(next);
    setQuickLinks(clean);
    writeStorage(STORAGE_KEYS.quickLinks, clean);
  }, []);

  const handleLocaleChange = useCallback(
    (optionId: string) => {
      const found = LOCALE_REGION_OPTIONS.find((opt) => opt.id === optionId);
      if (!found) return;
      setLocaleOption(found);
      writeStorage(STORAGE_KEYS.localeRegion, found.id);
      if (isMenuOpen) triggerModifyReaction();
    },
    [isMenuOpen, triggerModifyReaction]
  );

  const handleUpdateConsent = useCallback((next: ConsentState) => {
    setConsent(next);
    writeStorage(STORAGE_KEYS.consent, next);
    if (next.decided) {
      setIntroPrefs((prev) => {
        if (prev.introSeen) return prev;
        const updated = { ...prev, introSeen: true };
        writeStorage(STORAGE_KEYS.intro, updated);
        return updated;
      });
    }
  }, []);

  const handleToggleAlwaysShowIntro = useCallback((always: boolean) => {
    setIntroPrefs((prev) => {
      const next: IntroPreferences = {
        ...prev,
        introSeen: true,
        alwaysShowIntro: always,
      };
      writeStorage(STORAGE_KEYS.intro, next);
      return next;
    });
  }, []);

  const handleAcceptCookieNotice = useCallback(
    (next: ConsentState) => {
      handleUpdateConsent(next);
      setReactionSignal({ type: 'happy', nonce: Date.now() + Math.random() });
    },
    [handleUpdateConsent]
  );

  const handleClearHistory = useCallback(() => {
    clearSearchHistory();
    playUiSound('clear-history');
    const trimmed = query.trim();
    setSuggestions(trimmed ? buildSuggestions(trimmed, [], localeOption.lang) : []);
  }, [query, localeOption.lang]);

  const handleOpenSettings = useCallback(() => {
    inputRef.current?.blur();
    playUiSound('menu-open');
    setSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    playUiSound('menu-close');
    setSettingsOpen(false);
  }, []);
  const handleCloseLegal = useCallback(() => {
    playUiSound('menu-close');
    setLegalOpen(false);
  }, []);
  const handleOpenLegalFromFooter = useCallback(() => {
    inputRef.current?.blur();
    playUiSound('menu-open');
    setLegalOpen(true);
  }, []);
  const handleOpenLegalFromNotice = useCallback(() => {
    playUiSound('menu-open');
    setLegalOpen(true);
  }, []);
  const handleOpenLegalFromSettings = useCallback(() => {
    setSettingsOpen(false);
    setLegalOpen(true);
  }, []);

  const handleSearchFocus = useCallback(() => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setIsFocused(true);
    measureCaret();
  }, [measureCaret]);

  const handleSearchBlur = useCallback(() => {
    blurAtRef.current = performance.now();
    if (pointerInSearchRef.current) {
      blurTimerRef.current = setTimeout(() => {
        if (document.activeElement !== inputRef.current) {
          setIsFocused(false);
        }
      }, 160);
      return;
    }
    setIsFocused(false);
  }, []);

  const isUiReady = bootPhase === 'ready';
  const botHorizontalPercent = overlayBackdropOpen && isDesktop ? 24 : 50;

  return (
    <div
      data-testid="orbit-app"
      data-boot-phase={bootPhase}
      data-theme={resolvedTheme}
      data-theme-mode={theme}
      data-keyboard-active={stageLayout.keyboardActive ? 'true' : 'false'}
      data-menu-open={isMenuOpen ? 'true' : 'false'}
      data-cookie-notice-open={cookieNoticeOpen ? 'true' : 'false'}
      className="fixed left-0 top-0 w-full overflow-hidden select-none"
      style={{
        height: `${viewportMetrics.height}px`,
        transform: `translate3d(0, ${viewportMetrics.topOffset}px, 0)`,
      }}
      onPointerDown={(e) => {
        unlockOrbitAudio();
        const insideSearch = Boolean((e.target as HTMLElement).closest('#search-ui'));
        pointerInSearchRef.current = insideSearch;
        if (isFocused && !isMenuOpen && !insideSearch) {
          inputRef.current?.blur();
        }
      }}
      onPointerUp={() => {
        setTimeout(() => {
          pointerInSearchRef.current = false;
        }, 180);
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
        className="fixed left-0 right-0 top-0 z-30 flex justify-end px-4 pt-[calc(var(--st)+14px)] pointer-events-none transition-opacity duration-250"
        style={{
          opacity: isUiReady && !stageLayout.keyboardActive && !isMenuOpen ? 1 : 0,
        }}
      >
        <BubbleButton
          variant="glass"
          data-testid="settings-btn"
          aria-label={dict.settingsAria}
          onClick={handleOpenSettings}
          contentClassName="grid place-items-center w-full h-full"
          className="pointer-events-auto w-11 h-11 rounded-full backdrop-blur-lg cursor-pointer hover:bg-[var(--glass2)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
          style={{
            backgroundColor: 'var(--glass)',
            color: 'var(--fg)',
            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
          }}
        >
          <Settings className="w-5 h-5" />
        </BubbleButton>
      </header>

      {/* Smooth blurred background layer behind Orb when Legal or Cookie notice is open */}
      <AnimatePresence>
        {overlayBackdropOpen && (
          <motion.div
            data-testid="menu-blur-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-30 backdrop-blur-[8px] pointer-events-none"
            style={{
              backgroundColor:
                resolvedTheme === 'dark' ? 'rgba(5, 7, 12, 0.36)' : 'rgba(244, 246, 250, 0.42)',
              willChange: 'opacity',
            }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Boot Splash Sequence */}
      <BootSplash phase={bootPhase} centerY={stageLayout.botCenterY} />

      {/* Central Mascot with Single Crisp Orbital Ring (stays z-40 above backdrop blur on PC) */}
      <main>
        <OrbitBot
          bootPhase={bootPhase}
          botSize={stageLayout.botSize}
          botCenterY={stageLayout.botCenterY}
          horizontalPercent={botHorizontalPercent}
          viewportWidth={viewportMetrics.width}
          scale={stageLayout.scale}
          animateStageTransition={animateStageTransition}
          menuOpen={isMenuOpen}
          isFocused={isFocused && !isMenuOpen}
          hasQuery={query.trim().length > 0}
          caretRatio={caretRatio}
          reactionSignal={reactionSignal}
          ariaLabel={dict.botAriaLabel}
        />

        {/* Search Bar + Width-Matched Quick Links + Suggestions */}
        <SearchBlock
          visible={isUiReady}
          uiTopY={stageLayout.uiTopY}
          animateStageTransition={animateStageTransition}
          query={query}
          isFocused={isFocused && !isMenuOpen}
          quickLinks={quickLinks}
          suggestions={suggestions}
          visibleSuggestions={stageLayout.visibleSuggestions}
          dict={dict}
          inputRef={inputRef}
          onQueryChange={setQuery}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          onSubmit={handleSubmit}
          onCaretMove={measureCaret}
          onClearHistory={handleClearHistory}
        />
      </main>

      {/* Minimal Discreet Footer with Accent Legal Link + Language/Region Selector */}
      <FooterBar
        visible={isUiReady && !stageLayout.keyboardActive}
        localeOption={localeOption}
        dict={dict}
        onOpenLegal={handleOpenLegalFromFooter}
        onSelectLocaleRegion={handleLocaleChange}
      />

      {/* First-Open Cookie Notice presented alongside Orb */}
      <CookieNoticeModal
        open={cookieNoticeOpen}
        dict={dict}
        consent={consent}
        onAcceptConsent={handleAcceptCookieNotice}
        onOpenLegal={handleOpenLegalFromNotice}
        onUserModify={triggerModifyReaction}
      />

      {/* Full-Screen Settings Panel */}
      <SettingsModal
        open={settingsOpen}
        theme={theme}
        resolvedTheme={resolvedTheme}
        accentId={accentId}
        quickLinks={quickLinks}
        localeOption={localeOption}
        dict={dict}
        consent={consent}
        alwaysShowIntro={introPrefs.alwaysShowIntro}
        reactionSignal={reactionSignal}
        onClose={handleCloseSettings}
        onThemeChange={setTheme}
        onAccentChange={setAccentId}
        onQuickLinksChange={handleQuickLinksChange}
        onUpdateConsent={handleUpdateConsent}
        onToggleAlwaysShowIntro={handleToggleAlwaysShowIntro}
        onSelectLocaleRegion={handleLocaleChange}
        onOpenLegal={handleOpenLegalFromSettings}
        onUserModify={triggerModifyReaction}
      />

      {/* Legal & Privacy 2026 Interactive Drawer / Modal */}
      <LegalModal
        open={legalOpen}
        lang={localeOption.lang}
        jurisdiction={localeOption.jurisdiction}
        jurisdictionLabel={localeOption.fullLabel}
        dict={dict}
        consent={consent}
        onClose={handleCloseLegal}
        onUpdateConsent={handleUpdateConsent}
        onUserModify={triggerModifyReaction}
      />
    </div>
  );
}
