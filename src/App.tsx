import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Coffee, Menu, MoonStar, Settings } from 'lucide-react';
import { BootSplash } from './components/BootSplash';
import { CookieNoticeModal } from './components/CookieNoticeModal';
import { DonationPopup } from './components/DonationPopup';
import { ErrorScreen } from './components/ErrorScreen';
import { FooterBar } from './components/FooterBar';
import { LegalModal } from './components/LegalModal';
import { BubbleButton } from './components/LiquidBubble';
import { OrbitBot } from './components/OrbitBot';
import { AttachedReferenceImage, OrbChatPanel } from './components/OrbChatPanel';
import { SearchBlock } from './components/SearchBlock';
import { SettingsModal, SettingsTabId } from './components/SettingsModal';
import { StandbyOverlay } from './components/StandbyOverlay';
import { SupportShowcaseOverlay } from './components/SupportShowcaseOverlay';
import { resolveAccentTokens, hexToRgb } from './constants/accents';
import {
  getCachedDictionary,
  getInitialLocaleOption,
  LOCALE_REGION_OPTIONS,
  prewarmTranslationCache,
} from './i18n/translations';
import {
  AccentValue,
  AccessibilityPreferences,
  AiAskResponse,
  AiChatMessage,
  AiChatTurn,
  AiImageResponse,
  AiStatusResponse,
  BootPhase,
  BotReactionType,
  ConsentState,
  DonationPromptState,
  GeminiRoleId,
  ImageAspectRatio,
  LocaleRegionOption,
  QuickLink,
  ResolvedTheme,
  SearchSuggestion,
  ThemeMode,
} from './types/orbit';
import {
  clearClientVault,
  hasEncryptedClientBackup,
  loadEncryptedClientBackup,
  packClientTransportEnvelope,
  saveEncryptedClientBackup,
} from './utils/clientVault';
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
  getDonationPromptState,
  getInitialAccent,
  getInitialAccessibility,
  getInitialConsent,
  getInitialIntroPreferences,
  getInitialTheme,
  IntroPreferences,
  readStorage,
  resolveEffectiveReducedMotion,
  resolveThemeMode,
  sanitizeAccessibilityPreferences,
  sanitizeQuickLinks,
  shouldShowBootIntro,
  shouldTriggerDonationPrompt,
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
  const [accessibilityPrefs, setAccessibilityPrefs] = useState<AccessibilityPreferences>(
    getInitialAccessibility
  );
  const [osPrefersReduced, setOsPrefersReduced] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
      : false
  );

  const [bootPhase, setBootPhase] = useState<BootPhase>(() => {
    const autostart =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('autostart') === '1';
    const initialReduced = resolveEffectiveReducedMotion(
      accessibilityPrefs.motionMode,
      osPrefersReduced
    );
    const shouldPlay = shouldShowBootIntro({
      introSeen: introPrefs.introSeen,
      alwaysShowIntro: introPrefs.alwaysShowIntro,
      consentDecided: consent.decided,
      autostart,
      reducedMotion: initialReduced,
    });
    return shouldPlay ? 'word' : 'ready';
  });

  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>(() => getHistorySuggestions());
  const [caretRatio, setCaretRatio] = useState(0);
  const [lastTypedTimestamp, setLastTypedTimestamp] = useState(0);
  const [reactionSignal, setReactionSignal] = useState<{ type: BotReactionType; nonce: number } | null>(
    null
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTabId | null>(null);
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalInitialSectionId, setLegalInitialSectionId] = useState<string | null>(null);
  const [routeNotFound, setRouteNotFound] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const p = window.location.pathname;
    return p !== '/' && p !== '/index.html';
  });
  const [standbyMode, setStandbyMode] = useState(false);
  const [supportShowcaseOpen, setSupportShowcaseOpen] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [readingGuideY, setReadingGuideY] = useState<number | null>(null);
  const [srAnnouncement, setSrAnnouncement] = useState('');

  // Gemini BYOK AI chat + Nano Banana 2.1 image studio state
  const [aiStatus, setAiStatus] = useState<AiStatusResponse>({
    connected: false,
    maskedHint: null,
    layersActive: 0,
  });
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMode, setAiMode] = useState<'chat' | 'image'>('chat');
  const [aiRole, setAiRole] = useState<GeminiRoleId>('auto');
  const [imageAspectRatio, setImageAspectRatio] = useState<ImageAspectRatio>('1:1');
  const [attachedImage, setAttachedImage] = useState<AttachedReferenceImage | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([]);

  // Periodic donation prompt state
  const [donationState, setDonationState] = useState<DonationPromptState>(getDonationPromptState);
  const [donationPopupOpen, setDonationPopupOpen] = useState(false);
  const [donationPreviewDismissed, setDonationPreviewDismissed] = useState(false);

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
  const hamburgerRef = useRef<HTMLDivElement>(null);
  const modifyParityRef = useRef(0);
  const pointerInSearchRef = useRef(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurAtRef = useRef(0);
  const fullHeightRef = useRef(viewportMetrics.fullHeight);
  const isFocusedRef = useRef(isFocused);
  isFocusedRef.current = isFocused;
  const standbyEnteredAtRef = useRef(0);
  const searchEngine = useMemo(() => detectSearchEngine(), []);

  const cookieNoticeOpen =
    bootPhase === 'ready' && !consent.decided && !settingsOpen && !legalOpen;
  const otherModalOpen = settingsOpen || legalOpen || cookieNoticeOpen;
  const isDesktop = viewportMetrics.width >= 768;
  const canUseDesktopStandby = isDesktop;
  const activeSupportShowcase =
    supportShowcaseOpen &&
    !otherModalOpen &&
    !(standbyMode && canUseDesktopStandby && bootPhase === 'ready') &&
    bootPhase === 'ready';
  const showDonationOverlay =
    donationPopupOpen &&
    !otherModalOpen &&
    !activeSupportShowcase &&
    !(standbyMode && canUseDesktopStandby && bootPhase === 'ready');
  const overlayBackdropOpen = cookieNoticeOpen || showDonationOverlay;
  const isMenuOpen = otherModalOpen || showDonationOverlay;
  const activeStandby =
    standbyMode && canUseDesktopStandby && !isMenuOpen && !activeSupportShowcase && bootPhase === 'ready';
  const activeChatMode =
    aiChatOpen && !isMenuOpen && !activeStandby && !activeSupportShowcase && bootPhase === 'ready';

  const effectiveReducedMotion = useMemo(
    () => resolveEffectiveReducedMotion(accessibilityPrefs.motionMode, osPrefersReduced),
    [accessibilityPrefs.motionMode, osPrefersReduced]
  );

  // Trigger judging or perplexed face whenever user modifies settings or preferences
  const triggerModifyReaction = useCallback(() => {
    modifyParityRef.current = (modifyParityRef.current + 1) % 2;
    const type: BotReactionType = modifyParityRef.current === 1 ? 'perplexed' : 'judge';
    setReactionSignal({ type, nonce: Date.now() + Math.random() });
  }, []);

  // Prewarm local translation cache & sync popstate for 404 route handling
  useEffect(() => {
    prewarmTranslationCache();
    const onPopState = () => {
      const p = window.location.pathname;
      setRouteNotFound(p !== '/' && p !== '/index.html');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Hydrate encrypted Gemini vault status (with encrypted client vault fallback re-seal if cookie expired)
  useEffect(() => {
    let cancelled = false;
    const hydrateAiVault = async () => {
      try {
        const res = await fetch('/api/ai/status');
        if (!res.ok || cancelled) return;
        const status = (await res.json()) as AiStatusResponse;
        if (status.connected) {
          if (!cancelled) setAiStatus(status);
          return;
        }
        if (hasEncryptedClientBackup()) {
          const recovered = await loadEncryptedClientBackup();
          if (recovered && !cancelled) {
            const clientEnvelope = await packClientTransportEnvelope(recovered);
            const reseal = await fetch('/api/ai/key', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'OrbitSearch',
              },
              body: JSON.stringify(
                clientEnvelope ? { clientEnvelope } : { apiKey: recovered }
              ),
            });
            if (reseal.ok && !cancelled) {
              setAiStatus((await reseal.json()) as AiStatusResponse);
            }
          }
        }
      } catch {
        // Ignore offline errors cleanly
      }
    };
    void hydrateAiVault();
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve active translation dictionary synchronously (zero flicker)
  const dict = useMemo(
    () => getCachedDictionary(localeOption.lang, localeOption.jurisdiction),
    [localeOption.lang, localeOption.jurisdiction]
  );

  // Follow OS prefers-color-scheme and prefers-reduced-motion live
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersDark(darkMq.matches);
    setOsPrefersReduced(motionMq.matches);
    const handleDark = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    const handleMotion = (e: MediaQueryListEvent) => setOsPrefersReduced(e.matches);
    darkMq.addEventListener?.('change', handleDark);
    motionMq.addEventListener?.('change', handleMotion);
    return () => {
      darkMq.removeEventListener?.('change', handleDark);
      motionMq.removeEventListener?.('change', handleMotion);
    };
  }, []);

  // Apply Accessibility DOM attributes to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.reduceMotion = effectiveReducedMotion ? 'reduce' : 'full';
    root.dataset.highContrast = accessibilityPrefs.highContrast ? 'true' : 'false';
    root.dataset.largeText =
      accessibilityPrefs.largeText || accessibilityPrefs.textScale !== 'normal' ? 'true' : 'false';
    root.dataset.textScale = accessibilityPrefs.textScale;
    root.dataset.focusRings = accessibilityPrefs.focusRings ? 'true' : 'false';
    root.dataset.reduceTransparency = accessibilityPrefs.reduceTransparency ? 'true' : 'false';
    root.dataset.underlineLinks = accessibilityPrefs.underlineLinks ? 'true' : 'false';
    root.dataset.dyslexiaFont = accessibilityPrefs.dyslexiaFont ? 'true' : 'false';
    root.dataset.relaxedSpacing = accessibilityPrefs.relaxedSpacing ? 'true' : 'false';
    root.dataset.largeTargets = accessibilityPrefs.largeTargets ? 'true' : 'false';
    root.dataset.colorFilter = accessibilityPrefs.colorFilter;
    writeStorage(STORAGE_KEYS.accessibility, accessibilityPrefs);
  }, [accessibilityPrefs, effectiveReducedMotion]);

  // Reading Guide horizontal ruler follows pointer smoothly when enabled
  useEffect(() => {
    if (!accessibilityPrefs.readingGuide) {
      setReadingGuideY(null);
      return;
    }
    const onMove = (e: PointerEvent) => setReadingGuideY(Math.round(e.clientY));
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [accessibilityPrefs.readingGuide]);

  // Close top-right Hamburger dropdown on outside click, Escape, or mode switch
  useEffect(() => {
    if (isMenuOpen || activeStandby || activeSupportShowcase) {
      setHamburgerOpen(false);
    }
  }, [isMenuOpen, activeStandby, activeSupportShowcase]);

  useEffect(() => {
    if (!hamburgerOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (hamburgerRef.current && !hamburgerRef.current.contains(e.target as Node)) {
        setHamburgerOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHamburgerOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [hamburgerOpen]);

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

  // Exit Desktop Standby Mode on click (after button-click settle grace) or key press — never on cursor move
  const handleExitStandby = useCallback(() => {
    if (performance.now() - standbyEnteredAtRef.current < 240) return;
    setStandbyMode(false);
  }, []);

  useEffect(() => {
    if (!activeStandby) return;
    const onClick = () => {
      if (performance.now() - standbyEnteredAtRef.current < 240) return;
      setStandbyMode(false);
    };
    const onKey = () => setStandbyMode(false);
    window.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey, { passive: true });
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [activeStandby]);

  // Periodic voluntary support prompt after active usage (or ?promptDonation=1 preview)
  useEffect(() => {
    const rawPreview =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('promptDonation') === '1';
    const forcePreview = rawPreview && !donationPreviewDismissed;
    if (!bootPhase || bootPhase !== 'ready') return;
    if (
      !shouldTriggerDonationPrompt({
        state: donationState,
        nowMs: Date.now(),
        consentDecided: consent.decided,
        isMenuOpen: otherModalOpen || donationPopupOpen,
        standbyMode: activeStandby,
        forcePreview,
      })
    ) {
      return;
    }

    const delayMs = forcePreview ? 450 : 45000;
    const timer = setTimeout(() => {
      setDonationPopupOpen(true);
      if (!forcePreview) {
        setDonationState((prev) => {
          const next = { ...prev, lastShownAt: Date.now() };
          writeStorage(STORAGE_KEYS.donationPrompt, next);
          return next;
        });
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [
    bootPhase,
    consent.decided,
    otherModalOpen,
    donationPopupOpen,
    donationPreviewDismissed,
    activeStandby,
    donationState,
  ]);

  const stageLayout = useMemo(() => {
    const layout = computeStageLayout({
      viewportWidth: viewportMetrics.width,
      viewportHeight: viewportMetrics.height,
      fullHeight: viewportMetrics.fullHeight,
      safeTop: viewportMetrics.safeTop,
      safeBottom: viewportMetrics.safeBottom,
      isMobile: viewportMetrics.isMobile,
      isFocused: isFocused && !isMenuOpen && !activeStandby && !activeSupportShowcase,
      hasQuickLinks: quickLinks.length > 0,
      suggestionCount: suggestions.length,
    });

    const isCompactHeight = viewportMetrics.height <= 620;
    const standbyBotSize = Math.round(
      Math.max(190, Math.min(viewportMetrics.width * 0.36, viewportMetrics.height * 0.56, 500))
    );
    const supportBotSize = Math.round(
      Math.max(180, Math.min(viewportMetrics.width * 0.34, viewportMetrics.height * 0.54, 440))
    );
    const chatBotSize = Math.round(
      Math.max(
        164,
        Math.min(
          viewportMetrics.width * 0.24,
          viewportMetrics.height * (isCompactHeight ? 0.34 : 0.42),
          320
        )
      )
    );

    const desiredBotSize = activeStandby
      ? standbyBotSize
      : activeSupportShowcase
        ? isDesktop
          ? supportBotSize
          : Math.min(layout.botSize, Math.max(82, viewportMetrics.height * 0.13))
        : activeChatMode
          ? isDesktop
            ? chatBotSize
            : Math.min(layout.botSize, Math.max(76, viewportMetrics.height * 0.13))
          : overlayBackdropOpen && viewportMetrics.width < 768
            ? Math.min(layout.botSize, Math.max(76, viewportMetrics.height * 0.14))
            : layout.botSize;
    const desiredBotCenterY = activeStandby
      ? viewportMetrics.height * 0.5
      : activeSupportShowcase
        ? isDesktop
          ? viewportMetrics.height * 0.5
          : Math.max(142, viewportMetrics.safeTop + Math.min(156, viewportMetrics.height * 0.185))
        : activeChatMode
          ? isDesktop
            ? viewportMetrics.height * 0.5
            : Math.max(66, viewportMetrics.safeTop + Math.min(84, viewportMetrics.height * 0.11))
          : overlayBackdropOpen && viewportMetrics.width >= 768
            ? viewportMetrics.height * 0.5
            : overlayBackdropOpen && viewportMetrics.width < 768
              ? Math.max(82, viewportMetrics.safeTop + Math.min(120, viewportMetrics.height * 0.165))
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
    activeStandby,
    activeSupportShowcase,
    activeChatMode,
    isDesktop,
    overlayBackdropOpen,
    quickLinks.length,
    suggestions.length,
  ]);

  // Live privacy-compliant search suggestions (real unlimited backend Suggest API + local history)
  const reqIdRef = useRef(0);
  useEffect(() => {
    const trimmed = query.trim();
    const reqId = ++reqIdRef.current;

    if (!trimmed) {
      setSuggestions(getHistorySuggestions());
      return;
    }

    setSuggestions(buildSuggestions(trimmed, []));

    if (!consent.functionalExternal) return;

    const timer = setTimeout(async () => {
      const ext = await fetchExternalSuggestions(trimmed, localeOption.lang, true);
      if (reqId !== reqIdRef.current || !ext) return;
      setSuggestions(buildSuggestions(trimmed, ext));
    }, 110);

    return () => clearTimeout(timer);
  }, [query, localeOption.lang, consent.functionalExternal]);

  // Keep history suggestions synced across tabs, new sessions, and iOS/Safari bfcache restores
  useEffect(() => {
    const syncHistoryFromStorage = () => {
      const trimmed = query.trim();
      setSuggestions(trimmed ? buildSuggestions(trimmed, []) : getHistorySuggestions());
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
  }, [query]);

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
    setSuggestions(trimmed ? buildSuggestions(trimmed, []) : []);
  }, [query]);

  const handleOpenSettings = useCallback((initialTab: SettingsTabId | null = null) => {
    inputRef.current?.blur();
    setHamburgerOpen(false);
    setSupportShowcaseOpen(false);
    setStandbyMode(false);
    setDonationPopupOpen(false);
    setSettingsInitialTab(initialTab);
    playUiSound('menu-open');
    setSettingsOpen(true);
    setSrAnnouncement(dict.settingsTitle);
  }, [dict.settingsTitle]);

  const handleResetNotFound = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState(null, '', '/');
      } catch {
        // Ignore restricted environments
      }
    }
    setRouteNotFound(false);
  }, []);

  const handleEnterStandby = useCallback(() => {
    if (!canUseDesktopStandby) return;
    inputRef.current?.blur();
    setHamburgerOpen(false);
    setSupportShowcaseOpen(false);
    setIsFocused(false);
    standbyEnteredAtRef.current = performance.now();
    playUiSound('standby-enter');
    setStandbyMode(true);
    setSrAnnouncement(dict.standbyButtonLabel);
  }, [canUseDesktopStandby, dict.standbyButtonLabel]);

  const handleCloseSettings = useCallback(() => {
    playUiSound('menu-close');
    setSettingsOpen(false);
    setSettingsInitialTab(null);
  }, []);
  const handleCloseLegal = useCallback(() => {
    playUiSound('menu-close');
    setLegalOpen(false);
    setLegalInitialSectionId(null);
  }, []);
  const handleOpenLegalFromFooter = useCallback(() => {
    inputRef.current?.blur();
    setLegalInitialSectionId(null);
    playUiSound('menu-open');
    setLegalOpen(true);
  }, []);
  const handleOpenLegalFromNotice = useCallback(() => {
    setLegalInitialSectionId(null);
    playUiSound('menu-open');
    setLegalOpen(true);
  }, []);
  const handleOpenLegalFromSettings = useCallback((sectionId?: string) => {
    setSettingsOpen(false);
    setSettingsInitialTab(null);
    setLegalInitialSectionId(sectionId ?? null);
    setLegalOpen(true);
  }, []);

  const handleQueryChange = useCallback((nextVal: string) => {
    setQuery(nextVal);
    setLastTypedTimestamp(performance.now());
  }, []);

  const handleSaveAiKey = useCallback(
    async (apiKey: string, rememberDevice: boolean): Promise<{ ok: boolean; error?: string }> => {
      try {
        const clientEnvelope = await packClientTransportEnvelope(apiKey);
        const res = await fetch('/api/ai/key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'OrbitSearch',
          },
          body: JSON.stringify(clientEnvelope ? { clientEnvelope } : { apiKey }),
        });
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as { error?: string };
          return { ok: false, error: errBody.error || dict.aiKeyInvalidError };
        }
        const status = (await res.json()) as AiStatusResponse;
        setAiStatus(status);
        if (rememberDevice) {
          await saveEncryptedClientBackup(apiKey);
        } else {
          await clearClientVault();
        }
        return { ok: true };
      } catch {
        return { ok: false, error: dict.aiKeyInvalidError };
      }
    },
    [dict.aiKeyInvalidError]
  );

  const handleDisconnectAiKey = useCallback(async () => {
    try {
      await fetch('/api/ai/key', {
        method: 'DELETE',
        headers: { 'X-Requested-With': 'OrbitSearch' },
      });
    } catch {
      // Proceed clearing local state cleanly
    }
    await clearClientVault();
    setAiStatus({ connected: false, maskedHint: null, layersActive: 0 });
  }, []);

  const resealKeyFromDeviceBackup = useCallback(async (): Promise<boolean> => {
    if (!hasEncryptedClientBackup()) return false;
    try {
      const recovered = await loadEncryptedClientBackup();
      if (!recovered) return false;
      const clientEnvelope = await packClientTransportEnvelope(recovered);
      const reseal = await fetch('/api/ai/key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'OrbitSearch',
        },
        body: JSON.stringify(clientEnvelope ? { clientEnvelope } : { apiKey: recovered }),
      });
      if (!reseal.ok) return false;
      setAiStatus((await reseal.json()) as AiStatusResponse);
      return true;
    } catch {
      return false;
    }
  }, []);

  const sendChatPrompt = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt || aiLoading) return;

      const userMsg: AiChatMessage = {
        id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'user',
        text: prompt,
        mode: 'chat',
      };
      const priorHistory: AiChatTurn[] = aiMessages
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.text.trim().length > 0)
        .slice(-8)
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.text,
        }));

      setAiMessages((prev) => [...prev, userMsg]);
      setAiChatOpen(true);

      if (!aiStatus.connected) {
        setAiMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: 'error',
            text: dict.aiAnswerNeedKey,
            needKey: true,
          },
        ]);
        setReactionSignal({ type: 'perplexed', nonce: Date.now() + Math.random() });
        return;
      }

      setAiLoading(true);
      setReactionSignal({ type: 'think', nonce: Date.now() + Math.random() });

      try {
        const postAsk = () =>
          fetch('/api/ai/ask', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'OrbitSearch',
            },
            body: JSON.stringify({
              prompt,
              lang: localeOption.lang,
              role: aiRole,
              history: priorHistory,
            }),
          });

        let res = await postAsk();
        if (res.status === 401) {
          const errPeek = (await res.clone().json().catch(() => ({}))) as { code?: string };
          if (errPeek.code === 'KEY_MISSING' && (await resealKeyFromDeviceBackup())) {
            res = await postAsk();
          }
        }

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
          const needKey = errData.code === 'KEY_MISSING' || errData.code === 'INVALID_KEY';
          setAiMessages((prev) => [
            ...prev,
            {
              id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              role: 'error',
              text:
                errData.code === 'KEY_MISSING'
                  ? dict.aiAnswerNeedKey
                  : errData.error || dict.aiAnswerNeedKey,
              needKey,
            },
          ]);
          setReactionSignal({ type: 'perplexed', nonce: Date.now() + Math.random() });
          return;
        }
        const data = (await res.json()) as AiAskResponse;
        setAiMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: 'assistant',
            text: data.answer,
            model: data.model,
            roleBadge: data.roleUsed,
            mode: 'chat',
          },
        ]);
        setReactionSignal({ type: 'happy', nonce: Date.now() + Math.random() });
      } catch {
        setAiMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: 'error',
            text: dict.aiAnswerNeedKey,
            needKey: !aiStatus.connected,
          },
        ]);
        setReactionSignal({ type: 'perplexed', nonce: Date.now() + Math.random() });
      } finally {
        setAiLoading(false);
      }
    },
    [
      aiLoading,
      aiMessages,
      aiRole,
      aiStatus.connected,
      dict.aiAnswerNeedKey,
      localeOption.lang,
      resealKeyFromDeviceBackup,
    ]
  );

  const sendImagePrompt = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt || aiLoading) return;

      const sourceImg = attachedImage;
      const userMsg: AiChatMessage = {
        id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'user',
        text: prompt,
        sourceImageUrl: sourceImg?.dataUrl,
        mode: 'image',
      };

      setAiMessages((prev) => [...prev, userMsg]);
      setAiChatOpen(true);

      if (!aiStatus.connected) {
        setAiMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: 'error',
            text: dict.aiAnswerNeedKey,
            needKey: true,
          },
        ]);
        setReactionSignal({ type: 'perplexed', nonce: Date.now() + Math.random() });
        return;
      }

      setAiLoading(true);
      setReactionSignal({ type: 'think', nonce: Date.now() + Math.random() });

      try {
        const postImage = () =>
          fetch('/api/ai/image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'OrbitSearch',
            },
            body: JSON.stringify({
              prompt,
              aspectRatio: imageAspectRatio,
              imageBase64: sourceImg?.base64,
              mimeType: sourceImg?.mimeType,
            }),
          });

        let res = await postImage();
        if (res.status === 401) {
          const errPeek = (await res.clone().json().catch(() => ({}))) as { code?: string };
          if (errPeek.code === 'KEY_MISSING' && (await resealKeyFromDeviceBackup())) {
            res = await postImage();
          }
        }

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
          const needKey = errData.code === 'KEY_MISSING' || errData.code === 'INVALID_KEY';
          setAiMessages((prev) => [
            ...prev,
            {
              id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              role: 'error',
              text:
                errData.code === 'KEY_MISSING'
                  ? dict.aiAnswerNeedKey
                  : errData.error || dict.aiAnswerNeedKey,
              needKey,
            },
          ]);
          setReactionSignal({ type: 'perplexed', nonce: Date.now() + Math.random() });
          return;
        }
        const data = (await res.json()) as AiImageResponse;
        setAttachedImage(null);
        setAiMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: 'assistant',
            text: data.text || '',
            imageUrl: data.imageUrl,
            model: data.model,
            mode: 'image',
          },
        ]);
        setReactionSignal({ type: 'happy', nonce: Date.now() + Math.random() });
      } catch {
        setAiMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: 'error',
            text: dict.aiAnswerNeedKey,
            needKey: !aiStatus.connected,
          },
        ]);
        setReactionSignal({ type: 'perplexed', nonce: Date.now() + Math.random() });
      } finally {
        setAiLoading(false);
      }
    },
    [
      aiLoading,
      aiStatus.connected,
      attachedImage,
      dict.aiAnswerNeedKey,
      imageAspectRatio,
      resealKeyFromDeviceBackup,
    ]
  );

  const handleDispatchAiPrompt = useCallback(
    (rawPrompt: string) => {
      if (aiMode === 'image') {
        void sendImagePrompt(rawPrompt);
      } else {
        void sendChatPrompt(rawPrompt);
      }
    },
    [aiMode, sendChatPrompt, sendImagePrompt]
  );

  const handleStartEditGeneratedImage = useCallback((imageUrl: string) => {
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(imageUrl);
    if (!match) return;
    setAttachedImage({
      dataUrl: imageUrl,
      mimeType: match[1] as AttachedReferenceImage['mimeType'],
      base64: match[2],
    });
    setAiMode('image');
  }, []);

  const handleAskAi = useCallback(() => {
    const prompt = query.trim();
    if (!prompt) return;
    inputRef.current?.blur();
    setAiMode('chat');
    void sendChatPrompt(prompt);
  }, [query, sendChatPrompt]);

  const handleExitAiChat = useCallback(() => {
    setAiChatOpen(false);
    playUiSound('menu-close');
  }, []);

  const handleAccessibilityChange = useCallback((next: AccessibilityPreferences) => {
    setAccessibilityPrefs(sanitizeAccessibilityPreferences(next));
  }, []);

  const handleDonationLater = useCallback(() => {
    setDonationPreviewDismissed(true);
    setDonationPopupOpen(false);
    setDonationState((prev) => {
      const next: DonationPromptState = {
        ...prev,
        dismissedCount: prev.dismissedCount + 1,
        lastShownAt: Date.now(),
      };
      writeStorage(STORAGE_KEYS.donationPrompt, next);
      return next;
    });
  }, []);

  const handleDonationNever = useCallback(() => {
    setDonationPreviewDismissed(true);
    setDonationPopupOpen(false);
    setDonationState((prev) => {
      const next: DonationPromptState = {
        ...prev,
        neverShow: true,
        lastShownAt: Date.now(),
      };
      writeStorage(STORAGE_KEYS.donationPrompt, next);
      return next;
    });
  }, []);

  const handleDonateClick = useCallback(() => {
    setDonationPreviewDismissed(true);
    setDonationPopupOpen(false);
    setDonationState((prev) => {
      const next: DonationPromptState = {
        ...prev,
        donatedClicked: true,
        lastShownAt: Date.now(),
      };
      writeStorage(STORAGE_KEYS.donationPrompt, next);
      return next;
    });
  }, []);

  const handleOpenSupportShowcase = useCallback(() => {
    inputRef.current?.blur();
    setIsFocused(false);
    setHamburgerOpen(false);
    setStandbyMode(false);
    setDonationPopupOpen(false);
    setSettingsOpen(false);
    setSettingsInitialTab(null);
    setLegalOpen(false);
    playUiSound('menu-open');
    setSupportShowcaseOpen(true);
    setSrAnnouncement(dict.settingsTabSupport);
  }, [dict.settingsTabSupport]);

  const handleCloseSupportShowcase = useCallback(() => {
    playUiSound('menu-close');
    setSupportShowcaseOpen(false);
  }, []);

  const handleOpenDonationsLegal = useCallback(() => {
    setDonationPopupOpen(false);
    setSupportShowcaseOpen(false);
    setSettingsOpen(false);
    setHamburgerOpen(false);
    setLegalInitialSectionId('donazioni-volontarie');
    playUiSound('menu-open');
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
  const headerVisible =
    isUiReady &&
    !stageLayout.keyboardActive &&
    !isMenuOpen &&
    !activeStandby &&
    !activeSupportShowcase;
  const botHorizontalPercent =
    activeSupportShowcase && isDesktop
      ? 74
      : activeStandby
        ? 27
        : (overlayBackdropOpen || activeChatMode) && isDesktop
          ? 24
          : 50;

  return (
    <div
      data-testid="orbit-app"
      data-boot-phase={bootPhase}
      data-theme={resolvedTheme}
      data-theme-mode={theme}
      data-keyboard-active={stageLayout.keyboardActive ? 'true' : 'false'}
      data-menu-open={isMenuOpen ? 'true' : 'false'}
      data-standby={activeStandby ? 'true' : 'false'}
      data-support-showcase={activeSupportShowcase ? 'true' : 'false'}
      data-ai-chat={activeChatMode ? 'true' : 'false'}
      data-cookie-notice-open={cookieNoticeOpen ? 'true' : 'false'}
      className="fixed inset-0 w-full h-[100dvh] overflow-hidden select-none"
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
      {/* Hidden SVG Color Vision Deficiency Filters */}
      <svg aria-hidden="true" className="fixed w-0 h-0 pointer-events-none" focusable="false">
        <defs>
          <filter id="orbit-filter-protanopia">
            <feColorMatrix
              type="matrix"
              values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id="orbit-filter-deuteranopia">
            <feColorMatrix
              type="matrix"
              values="0.625 0.375 0 0 0  0.700 0.300 0 0 0  0 0.300 0.700 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id="orbit-filter-tritanopia">
            <feColorMatrix
              type="matrix"
              values="0.950 0.050 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>

      {/* Subtle atmospheric glow + micro-dot background pattern */}
      <div className="orbit-ambient-bg" aria-hidden="true" />

      {/* Horizontal Accessibility Reading Guide Ruler */}
      {accessibilityPrefs.readingGuide && readingGuideY !== null && (
        <div
          aria-hidden="true"
          data-testid="accessibility-reading-guide"
          className="fixed left-0 right-0 h-[2px] z-[60] pointer-events-none"
          style={{
            top: `${readingGuideY}px`,
            backgroundColor: 'var(--acc)',
            boxShadow: '0 0 12px 2px rgba(var(--acc-rgb), 0.45)',
          }}
        />
      )}

      {/* Polite Screen-Reader Live Announcements */}
      {accessibilityPrefs.screenReaderHints && (
        <div
          role="status"
          aria-live="polite"
          className="sr-only"
          data-testid="accessibility-sr-live"
        >
          {srAnnouncement}
        </div>
      )}

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

      {/* 404 Route Error Screen with Confused Orb */}
      {routeNotFound ? (
        <ErrorScreen
          variant="404"
          dict={dict}
          reduceMotion={effectiveReducedMotion}
          onReset={handleResetNotFound}
        />
      ) : (
        <>
      {/* Top Header: Standby & Hamburger Menu (Right) */}
      <header
        className="fixed left-0 right-0 top-0 z-30 flex items-center justify-end gap-2 px-4 pt-[calc(var(--st)+14px)] pointer-events-none"
        style={{
          opacity: headerVisible ? 1 : 0,
          transform: headerVisible ? 'translate3d(0, 0, 0)' : 'translate3d(0, -8px, 0)',
          transition:
            'opacity 320ms cubic-bezier(0.16, 1, 0.3, 1), transform 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Right: Desktop Standby Pill + Hamburger Menu */}
        <div className="flex items-center gap-2">
        {canUseDesktopStandby && (
          <BubbleButton
            variant="glass"
            tabIndex={headerVisible ? 0 : -1}
            data-testid="standby-btn"
            aria-label={dict.standbyAriaLabel}
            onClick={handleEnterStandby}
            contentClassName="inline-flex items-center gap-2"
            className="hidden md:inline-flex pointer-events-auto h-11 px-4 rounded-full text-xs font-medium backdrop-blur-lg cursor-pointer hover:bg-[var(--glass2)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
            style={{
              backgroundColor: 'var(--glass)',
              color: 'var(--fg)',
              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
            }}
          >
            <MoonStar className="w-3.5 h-3.5 opacity-75 shrink-0" aria-hidden="true" />
            <span>{dict.standbyButtonLabel}</span>
          </BubbleButton>
        )}

        <div ref={hamburgerRef} className={`relative ${headerVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          <BubbleButton
            variant="glass"
            tabIndex={headerVisible ? 0 : -1}
            data-testid="hamburger-menu-btn"
            aria-haspopup="menu"
            aria-expanded={hamburgerOpen}
            aria-label={dict.menuButtonAria}
            onClick={() => {
              unlockOrbitAudio();
              setHamburgerOpen((prev) => !prev);
            }}
            contentClassName="grid place-items-center w-full h-full"
            className="w-11 h-11 rounded-full backdrop-blur-lg cursor-pointer hover:bg-[var(--glass2)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
            style={{
              backgroundColor: hamburgerOpen ? 'var(--glass2)' : 'var(--glass)',
              color: 'var(--fg)',
              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
            }}
          >
            <Menu className="w-5 h-5" />
          </BubbleButton>

          <AnimatePresence>
            {hamburgerOpen && headerVisible && (
              <motion.div
                role="menu"
                aria-label={dict.menuButtonAria}
                data-testid="hamburger-dropdown"
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 mt-2.5 w-56 rounded-2xl p-1.5 backdrop-blur-2xl shadow-2xl origin-top-right z-40"
                style={{
                  backgroundColor: 'var(--menu-glass)',
                  boxShadow:
                    '0 20px 50px rgba(0, 0, 0, 0.28), inset 0 0 0 1px var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={0}
                  data-testid="menu-item-settings"
                  onClick={() => handleOpenSettings(null)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-[13px] font-medium cursor-pointer transition-colors hover:bg-[var(--glass2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
                  style={{ color: 'var(--fg)' }}
                >
                  <Settings className="w-4 h-4 opacity-80 shrink-0" aria-hidden="true" />
                  <span>{dict.menuSettingsItem}</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  tabIndex={0}
                  data-testid="menu-item-support"
                  onClick={handleOpenSupportShowcase}
                  className="mt-1 w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-[13px] font-semibold cursor-pointer transition-colors hover:bg-[var(--glass2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
                  style={{
                    color: 'var(--acc-text)',
                    backgroundColor: 'rgba(var(--acc-rgb), 0.10)',
                    boxShadow: 'inset 0 0 0 1px rgba(var(--acc-rgb), 0.24)',
                  }}
                >
                  <Coffee className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{dict.menuSupportItem}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
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

      {/* Central Mascot with Single Crisp Orbital Ring */}
      <main
        className="w-full h-full"
        style={
          viewportMetrics.topOffset && !isMenuOpen && !activeSupportShowcase && !activeStandby && !activeChatMode
            ? { transform: `translate3d(0, ${viewportMetrics.topOffset}px, 0)` }
            : undefined
        }
      >
        <OrbitBot
          bootPhase={bootPhase}
          botSize={stageLayout.botSize}
          baseBotSize={stageLayout.baseBotSize}
          botCenterY={stageLayout.botCenterY}
          horizontalPercent={botHorizontalPercent}
          viewportWidth={viewportMetrics.width}
          scale={stageLayout.scale}
          animateStageTransition={animateStageTransition && !effectiveReducedMotion}
          menuOpen={isMenuOpen}
          paused={settingsOpen || legalOpen}
          hidden={settingsOpen || legalOpen}
          standbyMode={activeStandby}
          supportMode={activeSupportShowcase}
          isFocused={isFocused && !isMenuOpen && !activeStandby && !activeSupportShowcase}
          hasQuery={query.trim().length > 0}
          caretRatio={caretRatio}
          lastTypedTimestamp={lastTypedTimestamp}
          reduceMotion={effectiveReducedMotion}
          reactionSignal={reactionSignal}
          ariaLabel={dict.botAriaLabel}
        />

        {/* Desktop Standby Clock + Weather Overlay */}
        <StandbyOverlay
          active={activeStandby}
          lang={localeOption.lang}
          dict={dict}
          onExit={handleExitStandby}
        />

        {/* Full-Screen Supporta Orb Showcase with Happy Orb on Right */}
        <SupportShowcaseOverlay
          open={activeSupportShowcase}
          dict={dict}
          onClose={handleCloseSupportShowcase}
          onDonateClick={handleDonateClick}
          onOpenDonationsLegal={handleOpenDonationsLegal}
        />

        {/* Search Bar + Width-Matched Quick Links + Suggestions */}
        <SearchBlock
          visible={
            isUiReady &&
            !activeStandby &&
            !settingsOpen &&
            !legalOpen &&
            !activeChatMode &&
            !activeSupportShowcase
          }
          uiTopY={stageLayout.uiTopY}
          animateStageTransition={animateStageTransition && !effectiveReducedMotion}
          query={query}
          isFocused={
            isFocused &&
            !isMenuOpen &&
            !activeStandby &&
            !activeChatMode &&
            !activeSupportShowcase
          }
          quickLinks={quickLinks}
          suggestions={suggestions}
          visibleSuggestions={stageLayout.visibleSuggestions}
          dict={dict}
          inputRef={inputRef}
          aiStatus={aiStatus}
          onQueryChange={handleQueryChange}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          onSubmit={handleSubmit}
          onAskAi={handleAskAi}
          onCaretMove={measureCaret}
          onClearHistory={handleClearHistory}
        />

        {/* Gemini Multi-Model Chatbot & Nano Banana 2.1 Image Studio */}
        <OrbChatPanel
          open={activeChatMode}
          mode={aiMode}
          role={aiRole}
          aspectRatio={imageAspectRatio}
          attachedImage={attachedImage}
          messages={aiMessages}
          loading={aiLoading}
          aiStatus={aiStatus}
          dict={dict}
          onModeChange={setAiMode}
          onRoleChange={setAiRole}
          onAspectRatioChange={setImageAspectRatio}
          onAttachImage={setAttachedImage}
          onSendMessage={handleDispatchAiPrompt}
          onStartEditGeneratedImage={handleStartEditGeneratedImage}
          onBackToSearch={handleExitAiChat}
          onOpenAiSettings={() => handleOpenSettings('ai')}
        />
      </main>

      {/* Minimal Discreet Footer with Accent Legal Link + Language/Region Selector */}
      <FooterBar
        visible={
          isUiReady &&
          !stageLayout.keyboardActive &&
          !activeStandby &&
          !settingsOpen &&
          !legalOpen &&
          !showDonationOverlay &&
          !activeChatMode &&
          !activeSupportShowcase
        }
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

      {/* Periodic Experience & Voluntary Support Popup */}
      <DonationPopup
        open={showDonationOverlay}
        dict={dict}
        onLater={handleDonationLater}
        onNever={handleDonationNever}
        onDonateClick={handleDonateClick}
        onOpenSupportSection={handleOpenSupportShowcase}
        onOpenDonationsLegal={handleOpenDonationsLegal}
      />

      {/* Full-Screen Settings Panel */}
      <SettingsModal
        open={settingsOpen}
        initialTab={settingsInitialTab}
        theme={theme}
        resolvedTheme={resolvedTheme}
        accentId={accentId}
        quickLinks={quickLinks}
        localeOption={localeOption}
        dict={dict}
        consent={consent}
        alwaysShowIntro={introPrefs.alwaysShowIntro}
        accessibilityPrefs={accessibilityPrefs}
        reduceMotion={effectiveReducedMotion}
        aiStatus={aiStatus}
        reactionSignal={reactionSignal}
        onClose={handleCloseSettings}
        onThemeChange={setTheme}
        onAccentChange={setAccentId}
        onQuickLinksChange={handleQuickLinksChange}
        onUpdateConsent={handleUpdateConsent}
        onToggleAlwaysShowIntro={handleToggleAlwaysShowIntro}
        onSelectLocaleRegion={handleLocaleChange}
        onAccessibilityChange={handleAccessibilityChange}
        onSaveAiKey={handleSaveAiKey}
        onDisconnectAiKey={handleDisconnectAiKey}
        onOpenLegal={handleOpenLegalFromSettings}
        onOpenSupportShowcase={handleOpenSupportShowcase}
        onDonateClick={handleDonateClick}
        onUserModify={triggerModifyReaction}
      />

      {/* Full-Screen Legal & Privacy 2026 Panel */}
      <LegalModal
        open={legalOpen}
        initialSectionId={legalInitialSectionId}
        lang={localeOption.lang}
        jurisdiction={localeOption.jurisdiction}
        jurisdictionLabel={localeOption.fullLabel}
        dict={dict}
        consent={consent}
        reduceMotion={effectiveReducedMotion}
        reactionSignal={reactionSignal}
        onClose={handleCloseLegal}
        onUpdateConsent={handleUpdateConsent}
        onUserModify={triggerModifyReaction}
      />
        </>
      )}
    </div>
  );
}
