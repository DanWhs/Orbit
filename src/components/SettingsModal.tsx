import { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowUpRight,
  Bot,
  Check,
  Globe,
  Link2,
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
  BotReactionType,
  ConsentState,
  LocaleRegionOption,
  QuickLink,
  ResolvedTheme,
  ThemeMode,
} from '../types/orbit';
import {
  DEFAULT_QUICK_LINKS,
  isValidQuickLinkInput,
  MAX_QUICK_LINKS,
  normalizeUrl,
} from '../utils/storage';
import { BubbleButton } from './LiquidBubble';
import { LiveOrbMark } from './LiveOrbMark';

export type SettingsTabId = 'appearance' | 'experience' | 'quicklinks' | 'ai' | 'privacy';

interface SettingsModalProps {
  open: boolean;
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  accentId: AccentValue;
  quickLinks: QuickLink[];
  localeOption: LocaleRegionOption;
  dict: UiDictionary;
  consent: ConsentState;
  alwaysShowIntro: boolean;
  reactionSignal?: { type: BotReactionType; nonce: number } | null;
  onClose: () => void;
  onThemeChange: (theme: ThemeMode) => void;
  onAccentChange: (accentValue: AccentValue) => void;
  onQuickLinksChange: (links: QuickLink[]) => void;
  onUpdateConsent: (next: ConsentState) => void;
  onToggleAlwaysShowIntro: (next: boolean) => void;
  onSelectLocaleRegion: (optionId: string) => void;
  onOpenLegal?: () => void;
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
  theme,
  resolvedTheme,
  accentId,
  quickLinks,
  localeOption,
  dict,
  consent,
  alwaysShowIntro,
  reactionSignal = null,
  onClose,
  onThemeChange,
  onAccentChange,
  onQuickLinksChange,
  onUpdateConsent,
  onToggleAlwaysShowIntro,
  onSelectLocaleRegion,
  onOpenLegal,
  onUserModify,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('appearance');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const accentTokens = resolveAccentTokens(accentId);
  const [pickerHex, setPickerHex] = useState<string>(accentTokens.hex);
  const pickerSoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPickerHex(accentTokens.hex);
  }, [accentTokens.hex]);

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setTitleInput('');
      setUrlInput('');
      setErrorMsg('');
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

  const isAllAccepted = consent.decided && consent.functionalExternal && consent.analytics;
  const isAllRejected = consent.decided && !consent.functionalExternal && !consent.analytics;

  const tabs: Array<{
    id: SettingsTabId;
    label: string;
    icon: typeof Palette;
    count?: string;
  }> = [
    { id: 'appearance', label: dict.settingsTabAppearance, icon: Palette },
    { id: 'experience', label: dict.settingsTabExperience, icon: Sparkles },
    {
      id: 'quicklinks',
      label: dict.settingsTabQuickLinks,
      icon: Link2,
      count: `${quickLinks.length}/${MAX_QUICK_LINKS}`,
    },
    { id: 'ai', label: dict.settingsTabAi, icon: Bot },
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
          {/* Left Sidebar (Desktop) / Compact Top Header (Mobile) */}
          <aside
            className="shrink-0 md:w-[264px] lg:w-[292px] md:h-full border-b md:border-b-0 md:border-r flex flex-col"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {/* Brand Row: Live Interactive Orbit Mascot + Settings Title */}
            <div className="flex items-center justify-between gap-3 px-5 sm:px-7 pt-[calc(var(--st)+18px)] md:pt-[calc(var(--st)+26px)] pb-4 md:pb-8">
              <div className="flex items-center gap-4 min-w-0">
                <LiveOrbMark
                  size={38}
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
              className="flex md:flex-col gap-1 px-4 md:px-4 pb-3 md:pb-6 overflow-x-auto md:overflow-visible"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`settings-tabpanel-${tab.id}`}
                    data-testid={`settings-tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className="h-10 px-3.5 rounded-xl flex items-center justify-between gap-2.5 text-[13.5px] cursor-pointer shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
                    style={{
                      backgroundColor: isActive ? 'rgba(var(--acc-rgb), 0.11)' : 'transparent',
                      color: isActive ? 'var(--acc-text)' : 'var(--mut)',
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{tab.label}</span>
                    </span>
                    {tab.count && (
                      <span
                        className="text-[11px] tabular-nums opacity-70"
                        style={{ color: isActive ? 'var(--acc-text)' : 'var(--mut)' }}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Right Main Stage */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {/* Desktop Top-Right Close Button */}
            <div className="hidden md:flex items-center justify-end px-8 pt-[calc(var(--st)+24px)] pb-2 shrink-0">
              <BubbleButton
                variant="glass"
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
                                  onClick={() => handleStartEdit(link)}
                                  aria-label={`${dict.editLabel} ${link.title}`}
                                  className="w-8 h-8 rounded-full grid place-items-center cursor-pointer opacity-70 hover:opacity-100 hover:bg-[var(--glass2)] transition-all"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
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

                {/* SUB-PANEL 4: FEATURES AI */}
                {activeTab === 'ai' && (
                  <section
                    id="settings-tabpanel-ai"
                    role="tabpanel"
                    data-testid="settings-panel-ai"
                    className="py-6 sm:py-10 space-y-5"
                  >
                    <div
                      className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em]"
                      style={{ color: 'var(--acc-text)' }}
                    >
                      <Bot className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{dict.settingsTabAi}</span>
                    </div>

                    <h3
                      data-testid="ai-coming-soon-title"
                      className="font-display font-bold tracking-[-0.035em] leading-[1.02]"
                      style={{
                        fontSize: 'clamp(36px, 5.4vw, 60px)',
                        color: 'var(--fg)',
                      }}
                    >
                      {dict.aiComingSoonTitle}
                    </h3>

                    <p
                      data-testid="ai-coming-soon-desc"
                      className="max-w-[490px] text-[15px] sm:text-base leading-[1.68]"
                      style={{ color: 'var(--mut)' }}
                    >
                      {dict.aiComingSoonDesc}
                    </p>
                  </section>
                )}

                {/* SUB-PANEL 5: PRIVACY */}
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
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={onOpenLegal}
                          className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--acc-text)' }}
                        >
                          <span>{dict.cookieNoticeOpenPolicy}</span>
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
