import { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Accessibility,
  Activity,
  ArrowUpRight,
  Bot,
  Check,
  Coffee,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  History,
  KeyRound,
  Link2,
  Lock,
  MessageSquareHeart,
  MonitorSmartphone,
  Moon,
  Palette,
  Pencil,
  Pipette,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { ACCENT_PRESETS, normalizeHexColor, resolveAccentTokens } from '../constants/accents';
import { LOCALE_REGION_OPTIONS, UiDictionary } from '../i18n/translations';
import {
  AccentValue,
  AccessibilityPreferences,
  AiStatusResponse,
  BotReactionType,
  ConsentState,
  LocaleRegionOption,
  QuickLink,
  ResolvedTheme,
  ThemeMode,
} from '../types/orbit';
import {
  DEFAULT_ACCESSIBILITY_PREFS,
  DEFAULT_QUICK_LINKS,
  isValidQuickLinkInput,
  MAX_QUICK_LINKS,
  normalizeUrl,
} from '../utils/storage';
import { BuyMeCoffeeButton } from './BuyMeCoffeeButton';
import { BubbleAnchor, BubbleButton } from './LiquidBubble';
import { LiveOrbMark } from './LiveOrbMark';
import { SettingsDiagnosticsPanel } from './SettingsDiagnosticsPanel';
import { SettingsFeedbackPanel } from './SettingsFeedbackPanel';

export type SettingsTabId =
  | 'appearance'
  | 'experience'
  | 'quicklinks'
  | 'ai'
  | 'accessibility'
  | 'diagnostics'
  | 'feedback'
  | 'changelog'
  | 'support'
  | 'privacy';

interface SettingsModalProps {
  open: boolean;
  initialTab?: SettingsTabId | null;
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  accentId: AccentValue;
  quickLinks: QuickLink[];
  localeOption: LocaleRegionOption;
  dict: UiDictionary;
  consent: ConsentState;
  alwaysShowIntro: boolean;
  accessibilityPrefs: AccessibilityPreferences;
  reduceMotion?: boolean;
  aiStatus: AiStatusResponse;
  reactionSignal?: { type: BotReactionType; nonce: number } | null;
  onClose: () => void;
  onThemeChange: (theme: ThemeMode) => void;
  onAccentChange: (accentValue: AccentValue) => void;
  onQuickLinksChange: (links: QuickLink[]) => void;
  onUpdateConsent: (next: ConsentState) => void;
  onToggleAlwaysShowIntro: (next: boolean) => void;
  onSelectLocaleRegion: (optionId: string) => void;
  onAccessibilityChange: (next: AccessibilityPreferences) => void;
  onSaveAiKey: (apiKey: string, rememberDevice: boolean) => Promise<{ ok: boolean; error?: string }>;
  onDisconnectAiKey: () => Promise<void>;
  onOpenLegal?: (sectionId?: string) => void;
  onOpenSupportShowcase?: () => void;
  onDonateClick?: () => void;
  onUserModify?: () => void;
}

function formatDisplayHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, '');
  } catch {
    return rawUrl;
  }
}

function getDomainMonogram(title: string, url: string): string {
  const cleanTitle = title.trim();
  if (cleanTitle) return cleanTitle[0].toUpperCase();
  const host = formatDisplayHost(url);
  return host ? host[0].toUpperCase() : '?';
}

function capitalizeWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export const SettingsModal = memo(function SettingsModal({
  open,
  initialTab = null,
  theme,
  resolvedTheme,
  accentId,
  quickLinks,
  localeOption,
  dict,
  consent,
  alwaysShowIntro,
  accessibilityPrefs,
  reduceMotion = false,
  aiStatus,
  reactionSignal = null,
  onClose,
  onThemeChange,
  onAccentChange,
  onQuickLinksChange,
  onUpdateConsent,
  onToggleAlwaysShowIntro,
  onSelectLocaleRegion,
  onAccessibilityChange,
  onSaveAiKey,
  onDisconnectAiKey,
  onOpenLegal,
  onOpenSupportShowcase,
  onDonateClick,
  onUserModify,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('appearance');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // BYOK Gemini state
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [rememberDeviceVault, setRememberDeviceVault] = useState(true);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState('');

  const accentTokens = resolveAccentTokens(accentId);
  const [pickerHex, setPickerHex] = useState<string>(accentTokens.hex);
  const pickerSoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPickerHex(accentTokens.hex);
  }, [accentTokens.hex]);

  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setTitleInput('');
      setUrlInput('');
      setErrorMsg('');
      setApiKeyInput('');
      setShowApiKey(false);
      setAiError('');
      if (pickerSoundTimerRef.current) {
        clearTimeout(pickerSoundTimerRef.current);
        pickerSoundTimerRef.current = null;
      }
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const canAddMore = quickLinks.length < MAX_QUICK_LINKS;
  const lang = localeOption.lang;
  const headingWord = capitalizeWord(dict.settingsBreadcrumbLabel);

  const handleSaveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidQuickLinkInput(titleInput, urlInput)) {
      setErrorMsg(dict.invalidQuickLink);
      return;
    }
    setErrorMsg('');
    const normalized = normalizeUrl(urlInput);
    const cleanTitle = titleInput.trim().slice(0, 32);

    if (editingId) {
      onQuickLinksChange(
        quickLinks.map((item) =>
          item.id === editingId ? { ...item, title: cleanTitle, url: normalized } : item
        )
      );
      setEditingId(null);
      setTitleInput('');
      setUrlInput('');
      onUserModify?.();
      return;
    }

    if (!canAddMore) return;
    onQuickLinksChange([
      ...quickLinks,
      {
        id: `ql-${Date.now()}`,
        title: cleanTitle,
        url: normalized,
      },
    ]);
    setTitleInput('');
    setUrlInput('');
    onUserModify?.();
  };

  const handleStartEdit = (item: QuickLink) => {
    setEditingId(item.id);
    setTitleInput(item.title);
    setUrlInput(item.url);
    setErrorMsg('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitleInput('');
    setUrlInput('');
    setErrorMsg('');
  };

  const handleRemove = (id: string) => {
    if (editingId === id) handleCancelEdit();
    onQuickLinksChange(quickLinks.filter((item) => item.id !== id));
    onUserModify?.();
  };

  const applyCookieChoice = (
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
    onUserModify?.();
  };

  const handleCustomColorPick = (rawHex: string) => {
    const normalized = normalizeHexColor(rawHex);
    if (!normalized) return;
    setPickerHex(normalized);
    onAccentChange(normalized);
    if (pickerSoundTimerRef.current) clearTimeout(pickerSoundTimerRef.current);
    pickerSoundTimerRef.current = setTimeout(() => {
      onUserModify?.();
    }, 280);
  };

  const handleConnectAiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = apiKeyInput.trim();
    if (!/^[A-Za-z0-9_-]{20,256}$/.test(cleaned)) {
      setAiError(dict.aiKeyInvalidError);
      return;
    }
    setAiError('');
    setAiSaving(true);
    try {
      const result = await onSaveAiKey(cleaned, rememberDeviceVault);
      if (result.ok) {
        setApiKeyInput('');
        setShowApiKey(false);
        onUserModify?.();
      } else {
        setAiError(result.error || dict.aiKeyInvalidError);
      }
    } finally {
      setAiSaving(false);
    }
  };

  const handleDisconnectAi = async () => {
    setAiSaving(true);
    try {
      await onDisconnectAiKey();
      setApiKeyInput('');
      setAiError('');
      onUserModify?.();
    } finally {
      setAiSaving(false);
    }
  };

  const isAllAccepted = consent.decided && consent.functionalExternal && consent.analytics;
  const isAllRejected = consent.decided && !consent.functionalExternal && !consent.analytics;

  const tabs: Array<{
    id: SettingsTabId;
    label: string;
    icon: typeof Palette;
    count?: string;
    badge?: string;
    highlighted?: boolean;
  }> = [
    { id: 'appearance', label: dict.settingsTabAppearance, icon: Palette },
    { id: 'experience', label: dict.settingsTabExperience, icon: Sparkles },
    {
      id: 'quicklinks',
      label: dict.settingsTabQuickLinks,
      icon: Link2,
      count: `${quickLinks.length}/${MAX_QUICK_LINKS}`,
    },
    { id: 'ai', label: dict.settingsTabAi, icon: Bot, badge: dict.betaTag },
    { id: 'accessibility', label: dict.settingsTabAccessibility, icon: Accessibility },
    { id: 'diagnostics', label: dict.settingsTabDiagnostics, icon: Activity },
    { id: 'feedback', label: dict.settingsTabFeedback, icon: MessageSquareHeart },
    { id: 'changelog', label: dict.settingsTabChangelog, icon: History },
    { id: 'support', label: dict.settingsTabSupport, icon: Coffee, highlighted: true },
    { id: 'privacy', label: dict.settingsTabPrivacy, icon: ShieldCheck },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          data-testid="settings-modal"
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
          {/* Left Sidebar (Desktop/Smart Home) / Compact Top Header (Mobile) */}
          <aside
            className="shrink-0 md:w-[248px] lg:w-[292px] md:h-full border-b md:border-b-0 md:border-r flex flex-col"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {/* Brand Row: Live Interactive Orbit Mascot + Settings Title */}
            <div className="flex items-center justify-between gap-3 px-5 sm:px-7 pt-[calc(var(--st)+14px)] md:pt-[calc(var(--st)+18px)] lg:pt-[calc(var(--st)+26px)] pb-3 md:pb-5 lg:pb-7">
              <div className="flex items-center gap-4 min-w-0">
                <LiveOrbMark
                  size={38}
                  reduceMotion={reduceMotion}
                  reactionSignal={reactionSignal}
                  ariaLabel={dict.botAriaLabel}
                />
                <h2
                  id="settings-modal-title"
                  data-testid="settings-brand-breadcrumb"
                  className="text-[21px] sm:text-[23px] font-semibold tracking-[-0.025em] leading-none truncate"
                  style={{ color: 'var(--acc-text)' }}
                >
                  {headingWord}
                </h2>
              </div>

              {/* Mobile Close Button */}
              <BubbleButton
                variant="glass"
                tabIndex={0}
                data-testid="settings-close-btn-mobile"
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

            {/* Category Navigation */}
            <nav
              role="tablist"
              aria-label={dict.settingsTitle}
              data-testid="settings-subpanel-tabs"
              className="flex md:flex-col gap-1 px-4 md:px-4 pb-3 md:pb-5 overflow-x-auto md:overflow-y-auto orbit-scroll"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isHighlighted = Boolean(tab.highlighted);
                return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      tabIndex={0}
                      aria-selected={isActive}
                      aria-controls={`settings-tabpanel-${tab.id}`}
                      data-testid={`settings-tab-${tab.id}`}
                      onClick={() => {
                        if (tab.id === 'support' && onOpenSupportShowcase) {
                          onOpenSupportShowcase();
                          return;
                        }
                        setActiveTab(tab.id);
                      }}
                      className={`h-10 px-3.5 rounded-xl flex items-center justify-between gap-2.5 text-[13.5px] cursor-pointer shrink-0 transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)] ${
                        isHighlighted ? 'support-tab-highlight' : ''
                      }`}
                      style={{
                        backgroundColor: isHighlighted
                          ? isActive
                            ? 'rgba(var(--acc-rgb), 0.2)'
                            : undefined
                          : isActive
                            ? 'rgba(var(--acc-rgb), 0.11)'
                            : 'transparent',
                        color: isActive || isHighlighted ? 'var(--acc-text)' : 'var(--mut)',
                        fontWeight: isActive || isHighlighted ? 600 : 500,
                      }}
                    >
                      {isHighlighted && <span className="support-tab-shimmer" aria-hidden="true" />}
                      <span className="relative z-[1] inline-flex items-center gap-2.5 whitespace-nowrap">
                        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{tab.label}</span>
                      </span>
                      {tab.badge && (
                        <span
                          className="relative z-[1] text-[9.5px] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-md shrink-0"
                          style={{
                            backgroundColor: 'rgba(var(--acc-rgb), 0.16)',
                            color: 'var(--acc-text)',
                          }}
                        >
                          {tab.badge}
                        </span>
                      )}
                      {tab.count && (
                        <span
                          className="relative z-[1] text-[11px] tabular-nums opacity-70"
                          style={{ color: isActive ? 'var(--acc-text)' : 'var(--mut)' }}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Buy Me a Coffee relocated from Main Page Footer into Settings */}
              <div
                className="hidden md:flex items-center px-4 py-4 mt-auto border-t"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <BuyMeCoffeeButton
                  compact
                  variant="glass"
                  className="w-full"
                  testId="settings-sidebar-coffee-btn"
                  onClick={onDonateClick}
                />
              </div>
            </aside>

          {/* Right Main Stage */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {/* Desktop Top-Right Close Button */}
            <div className="hidden md:flex items-center justify-end px-8 pt-[calc(var(--st)+24px)] pb-2 shrink-0">
              <BubbleButton
                variant="glass"
                tabIndex={0}
                data-testid="settings-close-btn"
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

            {/* Scrollable Panel Body */}
            <div className="flex-1 overflow-y-auto orbit-scroll px-5 sm:px-10 md:px-14 pt-6 md:pt-4 pb-[max(32px,var(--sb))]">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-[640px]"
              >
                {/* SUB-PANEL 1: APPEARANCE */}
                {activeTab === 'appearance' && (
                  <div
                    id="settings-tabpanel-appearance"
                    role="tabpanel"
                    data-testid="settings-panel-appearance"
                    className="space-y-8"
                  >
                    {/* Theme Segmented Control */}
                    <section>
                      <h3
                        className="text-xs font-medium mb-3"
                        style={{ color: 'var(--mut)' }}
                      >
                        {dict.themeLabel}
                      </h3>
                      <div
                        className="grid grid-cols-1 sm:grid-cols-3 gap-1 p-1 rounded-2xl sm:rounded-full"
                        style={{
                          backgroundColor: 'var(--glass)',
                          boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                        }}
                      >
                        <BubbleButton
                          variant="solid"
                          tabIndex={0}
                          data-testid="theme-system-btn"
                          aria-pressed={theme === 'system'}
                          onClick={() => {
                            if (theme !== 'system') {
                              onThemeChange('system');
                              onUserModify?.();
                            }
                          }}
                          className="h-10 px-3 rounded-xl sm:rounded-full text-xs font-semibold cursor-pointer"
                          style={{
                            backgroundColor: theme === 'system' ? 'var(--acc)' : 'transparent',
                            color: theme === 'system' ? 'var(--acc-fg)' : 'var(--fg)',
                          }}
                        >
                          <MonitorSmartphone className="w-3.5 h-3.5 shrink-0" />
                          <span>{dict.themeSystem}</span>
                        </BubbleButton>

                        <BubbleButton
                          variant="solid"
                          tabIndex={0}
                          data-testid="theme-dark-btn"
                          aria-pressed={theme === 'dark'}
                          onClick={() => {
                            if (theme !== 'dark') {
                              onThemeChange('dark');
                              onUserModify?.();
                            }
                          }}
                          className="h-10 px-3 rounded-xl sm:rounded-full text-xs font-semibold cursor-pointer"
                          style={{
                            backgroundColor: theme === 'dark' ? 'var(--acc)' : 'transparent',
                            color: theme === 'dark' ? 'var(--acc-fg)' : 'var(--fg)',
                          }}
                        >
                          <Moon className="w-3.5 h-3.5 shrink-0" />
                          <span>{dict.themeDark}</span>
                        </BubbleButton>

                        <BubbleButton
                          variant="solid"
                          tabIndex={0}
                          data-testid="theme-light-btn"
                          aria-pressed={theme === 'light'}
                          onClick={() => {
                            if (theme !== 'light') {
                              onThemeChange('light');
                              onUserModify?.();
                            }
                          }}
                          className="h-10 px-3 rounded-xl sm:rounded-full text-xs font-semibold cursor-pointer"
                          style={{
                            backgroundColor: theme === 'light' ? 'var(--acc)' : 'transparent',
                            color: theme === 'light' ? 'var(--acc-fg)' : 'var(--fg)',
                          }}
                        >
                          <Sun className="w-3.5 h-3.5 shrink-0" />
                          <span>{dict.themeLight}</span>
                        </BubbleButton>
                      </div>
                    </section>

                    {/* Fluo Presets + Beta Color Picker */}
                    <section
                      className="pt-7 border-t space-y-4"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <h3
                        className="text-xs font-medium"
                        style={{ color: 'var(--mut)' }}
                      >
                        {dict.accentLabel}
                      </h3>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {ACCENT_PRESETS.map((preset) => {
                          const isSelected = preset.id === accentId;
                          const label = preset.labels[lang] ?? preset.labels.en;
                          return (
                            <BubbleButton
                              key={preset.id}
                              variant="glass"
                              tabIndex={0}
                              data-testid={`accent-${preset.id}`}
                              aria-pressed={isSelected}
                              onClick={() => {
                                if (preset.id !== accentId) {
                                  onAccentChange(preset.id);
                                  onUserModify?.();
                                }
                              }}
                              contentClassName="flex items-center gap-2.5 w-full h-full min-w-0"
                              className="h-11 px-3 rounded-full text-left text-xs font-medium cursor-pointer hover:bg-[var(--glass2)] active:scale-[0.985]"
                              style={{
                                backgroundColor: isSelected
                                  ? `color-mix(in srgb, ${preset.hex} 12%, var(--glass))`
                                  : 'var(--glass)',
                                boxShadow: isSelected
                                  ? `inset 0 0 0 1.5px ${preset.hex}`
                                  : 'inset 0 0 0 1px var(--border-subtle)',
                              }}
                            >
                              <span
                                className="w-4 h-4 rounded-full shrink-0 grid place-items-center"
                                style={{
                                  backgroundColor: preset.hex,
                                  color: preset.fgOnAccent,
                                }}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </span>
                              <span className="truncate">{label}</span>
                            </BubbleButton>
                          );
                        })}
                      </div>

                      {/* Custom Color Picker (BETA) — clean compact row */}
                      <div
                        data-testid="accent-custom-card"
                        className="rounded-full px-4 py-2.5 flex items-center justify-between gap-3 transition-colors duration-200"
                        style={{
                          backgroundColor: accentTokens.isCustom
                            ? `color-mix(in srgb, ${accentTokens.hex} 10%, var(--glass))`
                            : 'var(--glass)',
                          boxShadow: accentTokens.isCustom
                            ? `inset 0 0 0 1.5px ${accentTokens.hex}`
                            : 'inset 0 0 0 1px var(--border-subtle)',
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xs sm:text-[13px] font-medium truncate">
                            {dict.accentCustomLabel}
                          </span>
                          <span
                            data-testid="accent-beta-badge"
                            className="text-[10px] font-semibold uppercase tracking-[0.06em] shrink-0"
                            style={{ color: 'var(--acc-text)' }}
                          >
                            {dict.betaTag}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span
                            data-testid="accent-custom-hex"
                            className="text-xs font-medium tabular-nums"
                            style={{ color: 'var(--mut)' }}
                          >
                            {pickerHex}
                          </span>
                          <label
                            className="relative w-8 h-8 rounded-full cursor-pointer grid place-items-center transition-transform hover:scale-[1.06] active:scale-[0.96]"
                            style={{
                              backgroundColor: pickerHex,
                              color: accentTokens.fgOnAccent,
                              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                            }}
                            title={dict.accentCustomLabel}
                          >
                            <Pipette className="w-3.5 h-3.5 pointer-events-none" aria-hidden="true" />
                            <input
                              type="color"
                              tabIndex={0}
                              data-testid="accent-custom-picker"
                              aria-label={dict.accentCustomLabel}
                              value={pickerHex}
                              onChange={(e) => handleCustomColorPick(e.target.value)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </label>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {/* SUB-PANEL 2: EXPERIENCE */}
                {activeTab === 'experience' && (
                  <div
                    id="settings-tabpanel-experience"
                    role="tabpanel"
                    data-testid="settings-panel-experience"
                    className="space-y-8"
                  >
                    {/* Always Show Intro Switch */}
                    <section>
                      <h3
                        className="text-xs font-medium mb-3"
                        style={{ color: 'var(--mut)' }}
                      >
                        {dict.introSectionLabel}
                      </h3>
                      <button
                        type="button"
                        role="switch"
                        tabIndex={0}
                        aria-checked={alwaysShowIntro}
                        data-testid="always-show-intro-toggle"
                        onClick={() => {
                          onToggleAlwaysShowIntro(!alwaysShowIntro);
                          onUserModify?.();
                        }}
                        className="w-full text-left flex items-center justify-between gap-4 px-4 py-3.5 rounded-2xl cursor-pointer transition-colors hover:bg-[var(--glass2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
                        style={{
                          backgroundColor: 'var(--glass)',
                          boxShadow: alwaysShowIntro
                            ? 'inset 0 0 0 1.5px var(--acc)'
                            : 'inset 0 0 0 1px var(--border-subtle)',
                        }}
                      >
                        <span className="text-[13.5px] font-medium">
                          {dict.alwaysShowIntroLabel}
                        </span>
                        <span
                          aria-hidden="true"
                          className="w-11 h-6 rounded-full transition-colors duration-200 relative block shrink-0"
                          style={{
                            backgroundColor: alwaysShowIntro ? 'var(--acc)' : 'var(--glass2)',
                            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                          }}
                        >
                          <span
                            className="block w-4.5 h-4.5 rounded-full transition-transform duration-200 mt-[3px]"
                            style={{
                              backgroundColor: alwaysShowIntro ? 'var(--acc-fg)' : 'var(--fg)',
                              transform: alwaysShowIntro ? 'translateX(23px)' : 'translateX(3px)',
                            }}
                          />
                        </span>
                      </button>
                    </section>

                    {/* Language & Region */}
                    <section
                      className="pt-7 border-t"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Globe className="w-3.5 h-3.5 opacity-55" aria-hidden="true" />
                        <h3 className="text-xs font-medium" style={{ color: 'var(--mut)' }}>
                          {dict.languageRegionSectionLabel}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {LOCALE_REGION_OPTIONS.map((opt) => {
                          const isSelected = opt.id === localeOption.id;
                          return (
                            <BubbleButton
                              key={opt.id}
                              variant="glass"
                              tabIndex={0}
                              data-testid={`settings-locale-${opt.id}`}
                              aria-pressed={isSelected}
                              onClick={() => onSelectLocaleRegion(opt.id)}
                              contentClassName="flex items-center justify-between w-full gap-2"
                              className="h-11 px-4 rounded-full text-left cursor-pointer hover:bg-[var(--glass2)]"
                              style={{
                                backgroundColor: isSelected ? 'var(--glass2)' : 'var(--glass)',
                                boxShadow: isSelected
                                  ? 'inset 0 0 0 1.5px var(--acc)'
                                  : 'inset 0 0 0 1px var(--border-subtle)',
                              }}
                            >
                              <span className="text-xs font-medium truncate">
                                {opt.shortLabel}
                              </span>
                              <span
                                className="text-[11px] truncate shrink-0"
                                style={{ color: 'var(--mut)' }}
                              >
                                {opt.jurisdiction}
                              </span>
                            </BubbleButton>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                )}

                {/* SUB-PANEL 3: QUICK LINKS */}
                {activeTab === 'quicklinks' && (
                  <section
                    id="settings-tabpanel-quicklinks"
                    role="tabpanel"
                    data-testid="settings-panel-quicklinks"
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-medium" style={{ color: 'var(--mut)' }}>
                        {dict.quickLinksLabel}{' '}
                        <span className="tabular-nums opacity-70">
                          {quickLinks.length}/{MAX_QUICK_LINKS}
                        </span>
                      </h3>
                      <BubbleButton
                        variant="glass"
                        tabIndex={0}
                        onClick={() => {
                          handleCancelEdit();
                          onQuickLinksChange(DEFAULT_QUICK_LINKS);
                          onUserModify?.();
                        }}
                        contentClassName="inline-flex items-center gap-1.5"
                        className="text-[11px] font-medium px-2.5 py-1 rounded-full cursor-pointer hover:bg-[var(--glass2)]"
                        style={{ color: 'var(--mut)' }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{dict.resetDefaults}</span>
                      </BubbleButton>
                    </div>

                    {quickLinks.length > 0 && (
                      <div
                        className="rounded-2xl overflow-hidden divide-y"
                        style={{
                          backgroundColor: 'var(--glass)',
                          boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      >
                        {quickLinks.map((link) => {
                          const isEditing = editingId === link.id;
                          return (
                            <div
                              key={link.id}
                              data-testid={`quicklink-row-${link.id}`}
                              className="flex items-center justify-between gap-2.5 pl-3.5 pr-2.5 py-3 transition-colors duration-200"
                              style={{
                                borderColor: 'var(--border-subtle)',
                                backgroundColor: isEditing
                                  ? 'rgba(var(--acc-rgb), 0.1)'
                                  : 'transparent',
                              }}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span
                                  className="w-8 h-8 rounded-full shrink-0 grid place-items-center text-xs font-semibold"
                                  style={{
                                    backgroundColor: isEditing ? 'var(--acc)' : 'var(--glass2)',
                                    color: isEditing ? 'var(--acc-fg)' : 'var(--fg)',
                                  }}
                                  aria-hidden="true"
                                >
                                  {getDomainMonogram(link.title, link.url)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[13px] font-medium truncate leading-tight">
                                    {link.title}
                                  </div>
                                  <div
                                    className="text-[11px] truncate mt-0.5"
                                    style={{ color: 'var(--mut)' }}
                                  >
                                    {formatDisplayHost(link.url)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  tabIndex={0}
                                  onClick={() => handleStartEdit(link)}
                                  aria-label={`${dict.editLabel} ${link.title}`}
                                  className="w-8 h-8 rounded-full grid place-items-center cursor-pointer opacity-70 hover:opacity-100 hover:bg-[var(--glass2)] transition-all"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  tabIndex={0}
                                  onClick={() => handleRemove(link.id)}
                                  aria-label={`${dict.deleteLabel} ${link.title}`}
                                  className="w-8 h-8 rounded-full grid place-items-center cursor-pointer opacity-70 hover:opacity-100 hover:bg-red-500/15 hover:text-red-500 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {(canAddMore || editingId !== null) && (
                      <form onSubmit={handleSaveLink} className="space-y-3 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            tabIndex={0}
                            value={titleInput}
                            onChange={(e) => setTitleInput(e.target.value)}
                            placeholder={dict.quickLinkTitlePlaceholder}
                            aria-label={dict.quickLinkTitlePlaceholder}
                            maxLength={32}
                            className="h-11 px-4 rounded-full text-xs font-medium outline-none transition-shadow focus:ring-1 focus:ring-[var(--acc)]"
                            style={{
                              backgroundColor: 'var(--glass)',
                              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                              color: 'var(--fg)',
                            }}
                          />
                          <input
                            type="text"
                            tabIndex={0}
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder={dict.quickLinkUrlPlaceholder}
                            aria-label={dict.quickLinkUrlPlaceholder}
                            className="h-11 px-4 rounded-full text-xs font-medium outline-none transition-shadow focus:ring-1 focus:ring-[var(--acc)]"
                            style={{
                              backgroundColor: 'var(--glass)',
                              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                              color: 'var(--fg)',
                            }}
                          />
                        </div>
                        {errorMsg && (
                          <p className="text-xs font-medium text-red-500 px-2" role="alert">
                            {errorMsg}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <BubbleButton
                            type="submit"
                            variant="solid"
                            tabIndex={0}
                            contentClassName="inline-flex items-center gap-1.5"
                            className="h-10 px-5 rounded-full text-xs font-semibold cursor-pointer active:scale-[0.97]"
                            style={{
                              backgroundColor: 'var(--acc)',
                              color: 'var(--acc-fg)',
                            }}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{editingId ? dict.saveChanges : dict.addQuickLink}</span>
                          </BubbleButton>
                          {editingId && (
                            <BubbleButton
                              variant="glass"
                              tabIndex={0}
                              onClick={handleCancelEdit}
                              className="h-10 px-4 rounded-full text-xs font-medium cursor-pointer hover:bg-[var(--glass2)]"
                              style={{
                                backgroundColor: 'var(--glass)',
                                boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                              }}
                            >
                              {dict.cancelEdit}
                            </BubbleButton>
                          )}
                        </div>
                      </form>
                    )}
                  </section>
                )}

                {/* SUB-PANEL 4: FEATURES AI (BETA · BYOK GEMINI) */}
                {activeTab === 'ai' && (
                  <section
                    id="settings-tabpanel-ai"
                    role="tabpanel"
                    data-testid="settings-panel-ai"
                    className="space-y-6 pb-4"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div
                        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em]"
                        style={{ color: 'var(--acc-text)' }}
                      >
                        <Bot className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{dict.settingsTabAi}</span>
                      </div>
                      <span
                        data-testid="ai-beta-badge"
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.08em]"
                        style={{
                          backgroundColor: 'rgba(var(--acc-rgb), 0.16)',
                          color: 'var(--acc-text)',
                          boxShadow: 'inset 0 0 0 1px rgba(var(--acc-rgb), 0.35)',
                        }}
                      >
                        {dict.betaTag}
                      </span>
                    </div>

                    {/* Clear Disclaimer: no dedicated model-hosting server yet */}
                    <div
                      data-testid="ai-server-disclaimer"
                      className="rounded-2xl p-4 space-y-2 text-[13px] leading-relaxed"
                      style={{
                        backgroundColor: 'var(--glass)',
                        boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                      }}
                    >
                      <p className="m-0 font-medium" style={{ color: 'var(--fg)' }}>
                        {dict.aiServerDisclaimer}
                      </p>
                      <p className="m-0 text-xs leading-relaxed" style={{ color: 'var(--mut)' }}>
                        {dict.aiComingSoonDesc}
                      </p>
                    </div>

                    {/* Official Google AI Studio Setup Guide */}
                    <div
                      data-testid="ai-official-guide"
                      className="rounded-2xl p-4 space-y-3"
                      style={{
                        backgroundColor: 'var(--glass)',
                        boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--fg)' }}>
                        <KeyRound className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--acc-text)' }} aria-hidden="true" />
                        <span>{dict.aiGuideTitle}</span>
                      </div>
                      <div className="space-y-1.5 text-xs leading-relaxed" style={{ color: 'var(--mut)' }}>
                        <p className="m-0">{dict.aiGuideStep1}</p>
                        <p className="m-0">{dict.aiGuideStep2}</p>
                        <p className="m-0">{dict.aiGuideStep3}</p>
                      </div>
                      <BubbleAnchor
                        variant="glass"
                        tabIndex={0}
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="ai-official-guide-link"
                        contentClassName="inline-flex items-center gap-2"
                        className="h-9 px-3.5 rounded-full text-xs font-semibold cursor-pointer hover:bg-[var(--glass2)]"
                        style={{
                          backgroundColor: 'var(--glass2)',
                          color: 'var(--acc-text)',
                          boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                          textDecoration: 'none',
                        }}
                      >
                        <span>{dict.aiGuideOpenStudio}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      </BubbleAnchor>
                    </div>

                    {/* Multi-Layer Encrypted BYOK Key Vault */}
                    <div
                      className="rounded-2xl p-4 space-y-3.5"
                      style={{
                        backgroundColor: 'var(--glass)',
                        boxShadow: aiStatus.connected
                          ? 'inset 0 0 0 1.5px var(--acc)'
                          : 'inset 0 0 0 1px var(--border-subtle)',
                      }}
                    >
                      {aiStatus.connected ? (
                        <div className="space-y-3" data-testid="ai-key-connected-box">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--acc-text)' }} />
                              <span className="text-xs font-semibold">{dict.aiKeyConnectedLabel}</span>
                            </div>
                            <span
                              data-testid="ai-key-masked-hint"
                              className="text-xs font-mono px-2.5 py-1 rounded-full"
                              style={{
                                backgroundColor: 'var(--glass2)',
                                color: 'var(--fg)',
                              }}
                            >
                              {aiStatus.maskedHint || '••••'}
                            </span>
                          </div>

                          <BubbleButton
                            variant="glass"
                            tabIndex={0}
                            disabled={aiSaving}
                            data-testid="ai-key-disconnect-btn"
                            onClick={() => void handleDisconnectAi()}
                            contentClassName="inline-flex items-center gap-2"
                            className="h-10 px-4 rounded-full text-xs font-semibold cursor-pointer hover:bg-red-500/15 hover:text-red-500"
                            style={{
                              backgroundColor: 'var(--glass2)',
                              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{dict.aiKeyDisconnectBtn}</span>
                          </BubbleButton>
                        </div>
                      ) : (
                        <form onSubmit={(e) => void handleConnectAiKey(e)} className="space-y-3">
                          <label
                            htmlFor="orbit-gemini-key-input"
                            className="block text-xs font-medium"
                            style={{ color: 'var(--fg)' }}
                          >
                            {dict.aiKeyLabel}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              id="orbit-gemini-key-input"
                              type={showApiKey ? 'text' : 'password'}
                              tabIndex={0}
                              autoComplete="off"
                              autoCapitalize="off"
                              autoCorrect="off"
                              spellCheck={false}
                              data-testid="ai-key-input"
                              value={apiKeyInput}
                              onChange={(e) => {
                                setApiKeyInput(e.target.value);
                                if (aiError) setAiError('');
                              }}
                              placeholder={dict.aiKeyPlaceholder}
                              className="flex-1 min-w-0 h-11 px-4 rounded-full text-xs font-mono outline-none transition-shadow focus:ring-1 focus:ring-[var(--acc)]"
                              style={{
                                backgroundColor: 'var(--glass2)',
                                boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                                color: 'var(--fg)',
                              }}
                            />
                            <button
                              type="button"
                              tabIndex={0}
                              onClick={() => setShowApiKey((v) => !v)}
                              aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                              className="w-10 h-10 rounded-full grid place-items-center shrink-0 cursor-pointer hover:bg-[var(--glass2)]"
                              style={{
                                backgroundColor: 'var(--glass)',
                                boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                              }}
                            >
                              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>

                          <label className="flex items-center gap-2.5 text-xs cursor-pointer" style={{ color: 'var(--mut)' }}>
                            <input
                              type="checkbox"
                              tabIndex={0}
                              data-testid="ai-remember-device-checkbox"
                              checked={rememberDeviceVault}
                              onChange={(e) => setRememberDeviceVault(e.target.checked)}
                              className="w-4 h-4 accent-[var(--acc)]"
                            />
                            <span>{dict.aiKeyRememberDevice}</span>
                          </label>

                          {aiError && (
                            <p className="text-xs font-medium text-red-500" role="alert" data-testid="ai-key-error">
                              {aiError}
                            </p>
                          )}

                          <BubbleButton
                            type="submit"
                            variant="solid"
                            tabIndex={0}
                            disabled={aiSaving}
                            data-testid="ai-key-save-btn"
                            contentClassName="inline-flex items-center gap-2"
                            className="h-10 px-5 rounded-full text-xs font-semibold cursor-pointer active:scale-[0.98]"
                            style={{
                              backgroundColor: 'var(--acc)',
                              color: 'var(--acc-fg)',
                            }}
                          >
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>{aiSaving ? dict.aiKeySaving : dict.aiKeySaveBtn}</span>
                          </BubbleButton>
                        </form>
                      )}

                      <p
                        className="m-0 pt-2 border-t text-[11px] leading-relaxed flex items-start gap-2"
                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--mut)' }}
                      >
                        <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-75" aria-hidden="true" />
                        <span>{dict.aiKeySecurityLayers}</span>
                      </p>
                    </div>
                  </section>
                )}

                {/* SUB-PANEL 5: EXPANDED ACCESSIBILITY */}
                {activeTab === 'accessibility' && (
                  <section
                    id="settings-tabpanel-accessibility"
                    role="tabpanel"
                    data-testid="settings-panel-accessibility"
                    className="space-y-6 pb-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="m-0 text-base font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
                        {dict.a11ySectionTitle}
                      </h3>
                      <BubbleButton
                        variant="glass"
                        tabIndex={0}
                        data-testid="a11y-reset-btn"
                        onClick={() => {
                          onAccessibilityChange({ ...DEFAULT_ACCESSIBILITY_PREFS });
                          onUserModify?.();
                        }}
                        contentClassName="inline-flex items-center gap-1.5"
                        className="h-8 px-3 rounded-full text-[11px] font-medium cursor-pointer hover:bg-[var(--glass2)]"
                        style={{
                          backgroundColor: 'var(--glass)',
                          color: 'var(--mut)',
                          boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                        }}
                      >
                        <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        <span>{dict.a11yResetAllBtn}</span>
                      </BubbleButton>
                    </div>

                    {/* Motion Mode */}
                    <div className="space-y-2.5">
                      <h4 className="m-0 text-xs font-medium" style={{ color: 'var(--mut)' }}>
                        {dict.a11yMotionLabel}
                      </h4>
                      <div
                        className="grid grid-cols-1 sm:grid-cols-3 gap-1 p-1 rounded-2xl sm:rounded-full"
                        style={{
                          backgroundColor: 'var(--glass)',
                          boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                        }}
                      >
                        {(
                          [
                            ['system', dict.a11yMotionSystem],
                            ['reduce', dict.a11yMotionReduce],
                            ['full', dict.a11yMotionFull],
                          ] as const
                        ).map(([mode, label]) => {
                          const active = accessibilityPrefs.motionMode === mode;
                          return (
                            <BubbleButton
                              key={mode}
                              variant="solid"
                              tabIndex={0}
                              data-testid={`a11y-motion-${mode}`}
                              aria-pressed={active}
                              onClick={() => {
                                if (accessibilityPrefs.motionMode !== mode) {
                                  onAccessibilityChange({ ...accessibilityPrefs, motionMode: mode });
                                  onUserModify?.();
                                }
                              }}
                              className="h-10 px-3 rounded-xl sm:rounded-full text-xs font-semibold cursor-pointer"
                              style={{
                                backgroundColor: active ? 'var(--acc)' : 'transparent',
                                color: active ? 'var(--acc-fg)' : 'var(--fg)',
                              }}
                            >
                              <span>{label}</span>
                            </BubbleButton>
                          );
                        })}
                      </div>
                    </div>

                    {/* Typography Scale */}
                    <div className="space-y-2.5">
                      <h4 className="m-0 text-xs font-medium" style={{ color: 'var(--mut)' }}>
                        {dict.a11yTextScaleLabel}
                      </h4>
                      <div
                        className="grid grid-cols-3 gap-1 p-1 rounded-full"
                        style={{
                          backgroundColor: 'var(--glass)',
                          boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                        }}
                      >
                        {(
                          [
                            ['normal', dict.a11yTextScaleNormal],
                            ['large', dict.a11yTextScaleLarge],
                            ['xlarge', dict.a11yTextScaleXLarge],
                          ] as const
                        ).map(([scaleMode, label]) => {
                          const active = accessibilityPrefs.textScale === scaleMode;
                          return (
                            <BubbleButton
                              key={scaleMode}
                              variant="solid"
                              tabIndex={0}
                              data-testid={`a11y-scale-${scaleMode}`}
                              aria-pressed={active}
                              onClick={() => {
                                if (accessibilityPrefs.textScale !== scaleMode) {
                                  onAccessibilityChange({
                                    ...accessibilityPrefs,
                                    textScale: scaleMode,
                                    largeText: scaleMode !== 'normal',
                                  });
                                  onUserModify?.();
                                }
                              }}
                              className="h-9 px-3 rounded-full text-xs font-semibold cursor-pointer"
                              style={{
                                backgroundColor: active ? 'var(--acc)' : 'transparent',
                                color: active ? 'var(--acc-fg)' : 'var(--fg)',
                              }}
                            >
                              <span>{label}</span>
                            </BubbleButton>
                          );
                        })}
                      </div>
                    </div>

                    {/* Color Vision Profile */}
                    <div className="space-y-2.5">
                      <h4 className="m-0 text-xs font-medium" style={{ color: 'var(--mut)' }}>
                        {dict.a11yColorFilterLabel}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        {(
                          [
                            ['none', dict.a11yColorFilterNone],
                            ['grayscale', dict.a11yColorFilterGrayscale],
                            ['protanopia', dict.a11yColorFilterProtanopia],
                            ['deuteranopia', dict.a11yColorFilterDeuteranopia],
                            ['tritanopia', dict.a11yColorFilterTritanopia],
                          ] as const
                        ).map(([filterId, label]) => {
                          const active = accessibilityPrefs.colorFilter === filterId;
                          return (
                            <button
                              key={filterId}
                              type="button"
                              tabIndex={0}
                              data-testid={`a11y-filter-${filterId}`}
                              aria-pressed={active}
                              onClick={() => {
                                if (accessibilityPrefs.colorFilter !== filterId) {
                                  onAccessibilityChange({
                                    ...accessibilityPrefs,
                                    colorFilter: filterId,
                                  });
                                  onUserModify?.();
                                }
                              }}
                              className="h-9 px-2.5 rounded-full text-[11px] font-medium cursor-pointer transition-colors truncate"
                              style={{
                                backgroundColor: active ? 'var(--acc)' : 'var(--glass)',
                                color: active ? 'var(--acc-fg)' : 'var(--fg)',
                                boxShadow: active ? 'none' : 'inset 0 0 0 1px var(--border-subtle)',
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Comprehensive Vision, Motor & Cognitive Switches */}
                    <div
                      className="rounded-2xl overflow-hidden divide-y"
                      style={{
                        backgroundColor: 'var(--glass)',
                        boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      {(
                        [
                          {
                            key: 'highContrast',
                            title: dict.a11yHighContrastLabel,
                            desc: dict.a11yHighContrastDesc,
                            checked: accessibilityPrefs.highContrast,
                          },
                          {
                            key: 'focusRings',
                            title: dict.a11yFocusRingsLabel,
                            desc: dict.a11yFocusRingsDesc,
                            checked: accessibilityPrefs.focusRings,
                          },
                          {
                            key: 'reduceTransparency',
                            title: dict.a11yReduceTransparencyLabel,
                            desc: dict.a11yReduceTransparencyDesc,
                            checked: accessibilityPrefs.reduceTransparency,
                          },
                          {
                            key: 'underlineLinks',
                            title: dict.a11yUnderlineLinksLabel,
                            desc: dict.a11yUnderlineLinksDesc,
                            checked: accessibilityPrefs.underlineLinks,
                          },
                          {
                            key: 'dyslexiaFont',
                            title: dict.a11yDyslexiaFontLabel,
                            desc: dict.a11yDyslexiaFontDesc,
                            checked: accessibilityPrefs.dyslexiaFont,
                          },
                          {
                            key: 'relaxedSpacing',
                            title: dict.a11yRelaxedSpacingLabel,
                            desc: dict.a11yRelaxedSpacingDesc,
                            checked: accessibilityPrefs.relaxedSpacing,
                          },
                          {
                            key: 'largeTargets',
                            title: dict.a11yLargeTargetsLabel,
                            desc: dict.a11yLargeTargetsDesc,
                            checked: accessibilityPrefs.largeTargets,
                          },
                          {
                            key: 'readingGuide',
                            title: dict.a11yReadingGuideLabel,
                            desc: dict.a11yReadingGuideDesc,
                            checked: accessibilityPrefs.readingGuide,
                          },
                          {
                            key: 'screenReaderHints',
                            title: dict.a11yScreenReaderHintsLabel,
                            desc: dict.a11yScreenReaderHintsDesc,
                            checked: accessibilityPrefs.screenReaderHints,
                          },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          role="switch"
                          tabIndex={0}
                          aria-checked={item.checked}
                          data-testid={`a11y-toggle-${item.key}`}
                          onClick={() => {
                            onAccessibilityChange({
                              ...accessibilityPrefs,
                              [item.key]: !item.checked,
                            });
                            onUserModify?.();
                          }}
                          className="w-full text-left flex items-center justify-between gap-4 px-4 py-3.5 cursor-pointer hover:bg-[var(--glass2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="text-[13.5px] font-medium">{item.title}</div>
                            <div className="text-[11.5px] leading-snug" style={{ color: 'var(--mut)' }}>
                              {item.desc}
                            </div>
                          </div>
                          <span
                            aria-hidden="true"
                            className="w-11 h-6 rounded-full transition-colors duration-200 relative block shrink-0"
                            style={{
                              backgroundColor: item.checked ? 'var(--acc)' : 'var(--glass2)',
                              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                            }}
                          >
                            <span
                              className="block w-4.5 h-4.5 rounded-full transition-transform duration-200 mt-[3px]"
                              style={{
                                backgroundColor: item.checked ? 'var(--acc-fg)' : 'var(--fg)',
                                transform: item.checked ? 'translateX(23px)' : 'translateX(3px)',
                              }}
                            />
                          </span>
                        </button>
                      ))}
                    </div>

                    <p className="m-0 text-xs leading-relaxed" style={{ color: 'var(--mut)' }}>
                      {dict.a11yKeyboardHint}
                    </p>
                  </section>
                )}

                {/* SUB-PANEL: REAL DIAGNOSTICS */}
                {activeTab === 'diagnostics' && (
                  <SettingsDiagnosticsPanel dict={dict} onUserModify={onUserModify} />
                )}

                {/* SUB-PANEL: FEEDBACK & DAILY DIGEST */}
                {activeTab === 'feedback' && (
                  <SettingsFeedbackPanel
                    lang={localeOption.lang}
                    dict={dict}
                    onUserModify={onUserModify}
                  />
                )}

                {/* SUB-PANEL 6: VERSION CHANGELOG */}
                {activeTab === 'changelog' && (
                  <section
                    id="settings-tabpanel-changelog"
                    role="tabpanel"
                    data-testid="settings-panel-changelog"
                    className="space-y-5 pb-6"
                  >
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
                        {dict.changelogSectionTitle}
                      </h3>
                      <p className="m-0 text-xs leading-relaxed" style={{ color: 'var(--mut)' }}>
                        {dict.changelogSubtitle}
                      </p>
                    </div>

                    <div className="space-y-3.5">
                      {dict.changelogEntries.map((entry) => (
                        <article
                          key={entry.version}
                          data-testid={`changelog-entry-${entry.version}`}
                          className="rounded-2xl p-4 sm:p-5 space-y-3"
                          style={{
                            backgroundColor: 'var(--glass)',
                            boxShadow: entry.isCurrent
                              ? 'inset 0 0 0 1.5px rgba(var(--acc-rgb), 0.42)'
                              : 'inset 0 0 0 1px var(--border-subtle)',
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono tracking-tight"
                                style={{
                                  backgroundColor: entry.isCurrent
                                    ? 'var(--acc)'
                                    : 'var(--glass2)',
                                  color: entry.isCurrent ? 'var(--acc-fg)' : 'var(--fg)',
                                }}
                              >
                                {entry.version}
                              </span>
                              {entry.isCurrent && (
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.06em]"
                                  style={{
                                    backgroundColor: 'rgba(var(--acc-rgb), 0.14)',
                                    color: 'var(--acc-text)',
                                  }}
                                >
                                  {dict.changelogCurrentTag}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--mut)' }}>
                              {entry.dateLabel}
                            </span>
                          </div>

                          <h4 className="m-0 text-[14.5px] font-semibold leading-snug" style={{ color: 'var(--fg)' }}>
                            {entry.title}
                          </h4>

                          <div className="space-y-1.5 pt-0.5">
                            {entry.items.map((item, idx) => (
                              <div
                                key={`${entry.version}-${idx}`}
                                className="flex items-start gap-2.5 text-[12.5px] leading-relaxed"
                                style={{ color: 'var(--mut)' }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                                  style={{ backgroundColor: 'var(--acc)' }}
                                  aria-hidden="true"
                                />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {/* SUB-PANEL 7: SUPPORT / BUY ME A COFFEE (No 3 boxes, opens huge showcase) */}
                {activeTab === 'support' && (
                  <section
                    id="settings-tabpanel-support"
                    role="tabpanel"
                    data-testid="settings-panel-support"
                    className="space-y-5 pb-6"
                  >
                    <div className="support-vfx-stage rounded-[26px] p-5 sm:p-7 space-y-5">
                      <span className="support-vfx-halo-sweep" aria-hidden="true" />
                      <div className="relative z-[1] flex items-center gap-4">
                        <div className="shrink-0">
                          <LiveOrbMark
                            size={52}
                            reduceMotion={reduceMotion}
                            reactionSignal={reactionSignal}
                            ariaLabel={dict.botAriaLabel}
                          />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
                            style={{ color: 'var(--acc-text)' }}
                          >
                            <Coffee className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{dict.settingsTabSupport}</span>
                          </div>
                          <h3
                            className="m-0 text-lg sm:text-xl font-semibold tracking-tight leading-snug"
                            style={{ color: 'var(--fg)' }}
                          >
                            {dict.supportLetterTitle}
                          </h3>
                        </div>
                      </div>

                      <div
                        data-testid="orb-support-letter"
                        className="relative z-[1] space-y-3 text-[14px] sm:text-[15px] leading-[1.72]"
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

                      <p
                        className="relative z-[1] m-0 text-xs italic leading-relaxed"
                        style={{ color: 'var(--mut)' }}
                      >
                        {dict.supportVoluntaryItalicPrefix}{' '}
                        {onOpenLegal && (
                          <button
                            type="button"
                            tabIndex={0}
                            data-testid="settings-support-legal-link"
                            onClick={() => onOpenLegal('donazioni-volontarie')}
                            className="inline underline underline-offset-4 italic font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--acc-text)' }}
                          >
                            {dict.supportVoluntaryLegalLink}
                          </button>
                        )}
                        {dict.supportVoluntaryItalicSuffix}
                      </p>

                      <div className="relative z-[1] flex flex-wrap items-center gap-3 pt-1">
                        <BuyMeCoffeeButton
                          variant="accent"
                          testId="settings-support-coffee-btn"
                          onClick={onDonateClick}
                        />
                        {onOpenSupportShowcase && (
                          <BubbleButton
                            variant="glass"
                            tabIndex={0}
                            data-testid="settings-open-support-showcase-btn"
                            onClick={onOpenSupportShowcase}
                            className="h-11 px-4 rounded-full text-xs font-medium cursor-pointer hover:bg-[var(--glass2)]"
                            style={{
                              backgroundColor: 'var(--glass2)',
                              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                            }}
                          >
                            <span>{dict.supportOpenShowcaseBtn}</span>
                          </BubbleButton>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {/* SUB-PANEL 7: PRIVACY */}
                {activeTab === 'privacy' && (
                  <section
                    id="settings-tabpanel-privacy"
                    role="tabpanel"
                    data-testid="settings-cookie-section"
                    className="space-y-5"
                  >
                    <h3 className="text-xs font-medium" style={{ color: 'var(--mut)' }}>
                      {dict.settingsCookieTitle}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <BubbleButton
                        variant="glass"
                        tabIndex={0}
                        data-testid="settings-cookie-accept-all"
                        onClick={() => applyCookieChoice(true, true, false)}
                        className="h-10 px-4 rounded-full text-xs font-semibold cursor-pointer hover:bg-[var(--glass2)]"
                        style={{
                          backgroundColor: isAllAccepted ? 'var(--glass2)' : 'var(--glass)',
                          boxShadow: isAllAccepted
                            ? 'inset 0 0 0 1.5px var(--acc)'
                            : 'inset 0 0 0 1px var(--border-subtle)',
                          color: 'var(--fg)',
                        }}
                      >
                        <span>{dict.cookieAcceptAll}</span>
                      </BubbleButton>

                      <BubbleButton
                        variant="glass"
                        tabIndex={0}
                        data-testid="settings-cookie-reject-all"
                        onClick={() => applyCookieChoice(false, false, true)}
                        className="h-10 px-4 rounded-full text-xs font-semibold cursor-pointer hover:bg-[var(--glass2)]"
                        style={{
                          backgroundColor: isAllRejected ? 'var(--glass2)' : 'var(--glass)',
                          boxShadow: isAllRejected
                            ? 'inset 0 0 0 1.5px var(--acc)'
                            : 'inset 0 0 0 1px var(--border-subtle)',
                          color: 'var(--fg)',
                        }}
                      >
                        <span>{dict.cookieRejectAll}</span>
                      </BubbleButton>
                    </div>

                    <div
                      className="rounded-2xl overflow-hidden divide-y"
                      style={{
                        backgroundColor: 'var(--glass)',
                        boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <button
                        type="button"
                        role="switch"
                        tabIndex={0}
                        aria-checked={consent.functionalExternal}
                        disabled={consent.gpcDetected}
                        data-testid="settings-cookie-functional-toggle"
                        onClick={() =>
                          applyCookieChoice(
                            !consent.functionalExternal,
                            consent.analytics,
                            consent.doNotSellOrShare
                          )
                        }
                        className={`w-full text-left flex items-center justify-between gap-3 px-4 py-3.5 text-xs font-medium ${
                          consent.gpcDetected ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--glass2)]'
                        }`}
                      >
                        <span>{dict.cookieFunctionalToggle}</span>
                        <span
                          aria-hidden="true"
                          className="w-10 h-5.5 rounded-full transition-colors duration-200 relative block shrink-0"
                          style={{
                            backgroundColor: consent.functionalExternal
                              ? 'var(--acc)'
                              : 'var(--glass2)',
                            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                          }}
                        >
                          <span
                            className="block w-4 h-4 rounded-full transition-transform duration-200 mt-[3px]"
                            style={{
                              backgroundColor: consent.functionalExternal
                                ? 'var(--acc-fg)'
                                : 'var(--fg)',
                              transform: consent.functionalExternal
                                ? 'translateX(21px)'
                                : 'translateX(3px)',
                            }}
                          />
                        </span>
                      </button>

                      <button
                        type="button"
                        role="switch"
                        tabIndex={0}
                        aria-checked={consent.analytics}
                        disabled={consent.gpcDetected}
                        data-testid="settings-cookie-analytics-toggle"
                        onClick={() =>
                          applyCookieChoice(
                            consent.functionalExternal,
                            !consent.analytics,
                            consent.doNotSellOrShare
                          )
                        }
                        className={`w-full text-left flex items-center justify-between gap-3 px-4 py-3.5 text-xs font-medium ${
                          consent.gpcDetected ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--glass2)]'
                        }`}
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        <span>{dict.cookieAnalyticsToggle}</span>
                        <span
                          aria-hidden="true"
                          className="w-10 h-5.5 rounded-full transition-colors duration-200 relative block shrink-0"
                          style={{
                            backgroundColor: consent.analytics ? 'var(--acc)' : 'var(--glass2)',
                            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                          }}
                        >
                          <span
                            className="block w-4 h-4 rounded-full transition-transform duration-200 mt-[3px]"
                            style={{
                              backgroundColor: consent.analytics ? 'var(--acc-fg)' : 'var(--fg)',
                              transform: consent.analytics ? 'translateX(21px)' : 'translateX(3px)',
                            }}
                          />
                        </span>
                      </button>
                    </div>

                    {consent.gpcDetected && (
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--mut)' }}>
                        {dict.usGpcDetected}
                      </p>
                    )}

                    {onOpenLegal && (
                      <div className="pt-1 flex flex-wrap items-center gap-x-5 gap-y-2">
                        <button
                          type="button"
                          tabIndex={0}
                          onClick={() => onOpenLegal()}
                          className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
                          style={{ color: 'var(--acc-text)' }}
                        >
                          <span>{dict.cookieNoticeOpenPolicy}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          tabIndex={0}
                          data-testid="settings-privacy-donations-legal-link"
                          onClick={() => onOpenLegal('donazioni-volontarie')}
                          className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
                          style={{ color: 'var(--acc-text)' }}
                        >
                          <span>{dict.supportLegalLinkLabel}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </section>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
