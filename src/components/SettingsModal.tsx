import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { ACCENT_PRESETS } from '../constants/accents';
import { UiDictionary } from '../i18n/translations';
import { AccentId, ConsentState, LanguageCode, QuickLink, ThemeMode } from '../types/orbit';
import {
  DEFAULT_QUICK_LINKS,
  isValidQuickLinkInput,
  MAX_QUICK_LINKS,
  normalizeUrl,
} from '../utils/storage';
import { BubbleButton } from './LiquidBubble';

interface SettingsModalProps {
  open: boolean;
  theme: ThemeMode;
  accentId: AccentId;
  quickLinks: QuickLink[];
  lang: LanguageCode;
  dict: UiDictionary;
  consent: ConsentState;
  onClose: () => void;
  onThemeChange: (theme: ThemeMode) => void;
  onAccentChange: (accentId: AccentId) => void;
  onQuickLinksChange: (links: QuickLink[]) => void;
  onUpdateConsent: (next: ConsentState) => void;
  onOpenLegal?: () => void;
  onUserModify?: () => void;
}

function getDomainMonogram(title: string, url: string): string {
  const cleanTitle = title.trim();
  if (cleanTitle) return cleanTitle.charAt(0).toUpperCase();
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return (host.charAt(0) || 'O').toUpperCase();
  } catch {
    return 'O';
  }
}

function formatDisplayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const SettingsModal = memo(function SettingsModal({
  open,
  theme,
  accentId,
  quickLinks,
  lang,
  dict,
  consent,
  onClose,
  onThemeChange,
  onAccentChange,
  onQuickLinksChange,
  onUpdateConsent,
  onOpenLegal,
  onUserModify,
}: SettingsModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setTitleInput('');
      setUrlInput('');
      setErrorMsg('');
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const canAddMore = quickLinks.length < MAX_QUICK_LINKS;

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
        <div className="fixed inset-0 z-50 flex items-center justify-center md:justify-end p-3.5 sm:p-5 md:pr-10 lg:pr-14 pointer-events-none">
          {/* Click-outside capture layer (blur sits behind Orb at z-30) */}
          <div
            className="fixed inset-0 pointer-events-auto"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            data-testid="settings-modal"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 14 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 pointer-events-auto w-full max-w-[476px] max-h-[86vh] flex flex-col rounded-[32px] overflow-hidden"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--bg) 74%, var(--menu-glass))',
              backgroundImage:
                'radial-gradient(110% 55% at 88% 0%, rgba(var(--acc-rgb), 0.085), transparent 60%)',
              color: 'var(--fg)',
              willChange: 'transform, opacity',
              contain: 'layout style paint',
              boxShadow:
                theme === 'dark'
                  ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.14), inset 0 0 0 1px var(--border-subtle), 0 32px 84px -24px rgba(0, 0, 0, 0.72)'
                  : 'inset 0 1px 0 0 rgba(255, 255, 255, 0.85), inset 0 0 0 1px var(--border-subtle), 0 28px 72px -24px rgba(13, 17, 29, 0.22)',
            }}
          >
            {/* Header */}
            <header
              className="flex items-start justify-between gap-4 px-6 sm:px-7 pt-6 pb-5 border-b shrink-0"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="min-w-0">
                <h2
                  id="settings-modal-title"
                  className="text-[20px] font-semibold tracking-[-0.02em] leading-tight"
                >
                  {dict.settingsTitle}
                </h2>
                <p
                  className="text-[13px] mt-1 leading-snug"
                  style={{ color: 'var(--mut)' }}
                >
                  {dict.settingsSubtitle}
                </p>
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
            </header>

            {/* Scrollable Body */}
            <div className="px-6 sm:px-7 py-6 overflow-y-auto orbit-scroll space-y-6">
              {/* Theme Mode */}
              <section>
                <h3
                  className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-3"
                  style={{ color: 'var(--mut)' }}
                >
                  {dict.themeLabel}
                </h3>
                <div
                  className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl"
                  style={{
                    backgroundColor: 'var(--glass)',
                    boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                  }}
                >
                  <BubbleButton
                    variant="solid"
                    data-testid="theme-dark-btn"
                    onClick={() => {
                      if (theme !== 'dark') {
                        onThemeChange('dark');
                        onUserModify?.();
                      }
                    }}
                    className="h-10 rounded-[12px] text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: theme === 'dark' ? 'var(--acc)' : 'transparent',
                      color: theme === 'dark' ? 'var(--acc-fg)' : 'var(--fg)',
                      boxShadow:
                        theme === 'dark' ? '0 6px 18px -6px rgba(var(--acc-rgb), 0.5)' : 'none',
                    }}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>{dict.themeDark}</span>
                  </BubbleButton>
                  <BubbleButton
                    variant="solid"
                    data-testid="theme-light-btn"
                    onClick={() => {
                      if (theme !== 'light') {
                        onThemeChange('light');
                        onUserModify?.();
                      }
                    }}
                    className="h-10 rounded-[12px] text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: theme === 'light' ? 'var(--acc)' : 'transparent',
                      color: theme === 'light' ? 'var(--acc-fg)' : 'var(--fg)',
                      boxShadow:
                        theme === 'light' ? '0 6px 18px -6px rgba(var(--acc-rgb), 0.45)' : 'none',
                    }}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>{dict.themeLight}</span>
                  </BubbleButton>
                </div>
              </section>

              {/* 10 Fluo Accents */}
              <section
                className="pt-6 border-t"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <h3
                  className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-3"
                  style={{ color: 'var(--mut)' }}
                >
                  {dict.accentLabel}
                </h3>
                <div className="grid grid-cols-2 gap-2">
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
                        className="h-11 px-3 rounded-2xl text-left text-xs font-semibold cursor-pointer hover:bg-[var(--glass2)] active:scale-[0.985]"
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
                          className="w-[18px] h-[18px] rounded-full shrink-0 grid place-items-center transition-transform duration-200"
                          style={{
                            backgroundColor: preset.hex,
                            color: preset.fgOnAccent,
                            boxShadow: isSelected
                              ? `0 0 12px -1px ${preset.hex}, inset 0 1px 1px rgba(255,255,255,0.45)`
                              : 'inset 0 1px 1px rgba(255,255,255,0.35)',
                            transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                          }}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <span className="truncate">{label}</span>
                      </BubbleButton>
                    );
                  })}
                </div>
              </section>

              {/* Quick Links Manager */}
              <section
                className="pt-6 border-t"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-baseline gap-2">
                    <h3
                      className="text-[11px] font-semibold uppercase tracking-[0.06em]"
                      style={{ color: 'var(--mut)' }}
                    >
                      {dict.quickLinksLabel}
                    </h3>
                    <span
                      className="text-[11px] font-semibold tabular-nums"
                      style={{ color: 'var(--mut)' }}
                    >
                      {quickLinks.length}/{MAX_QUICK_LINKS}
                    </span>
                  </div>
                  <BubbleButton
                    variant="glass"
                    onClick={() => {
                      handleCancelEdit();
                      onQuickLinksChange(DEFAULT_QUICK_LINKS);
                      onUserModify?.();
                    }}
                    contentClassName="inline-flex items-center gap-1.5"
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full cursor-pointer hover:bg-[var(--glass2)]"
                    style={{ color: 'var(--mut)' }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{dict.resetDefaults}</span>
                  </BubbleButton>
                </div>

                {/* Single Grouped Architectural List */}
                {quickLinks.length > 0 && (
                  <div
                    className="rounded-2xl overflow-hidden divide-y mb-3.5"
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
                          className="flex items-center justify-between gap-2.5 pl-3 pr-2 py-2.5 transition-colors duration-200"
                          style={{
                            borderColor: 'var(--border-subtle)',
                            backgroundColor: isEditing
                              ? 'rgba(var(--acc-rgb), 0.1)'
                              : 'transparent',
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span
                              className="w-8 h-8 rounded-xl shrink-0 grid place-items-center text-xs font-bold"
                              style={{
                                backgroundColor: isEditing ? 'var(--acc)' : 'var(--glass2)',
                                color: isEditing ? 'var(--acc-fg)' : 'var(--fg)',
                              }}
                              aria-hidden="true"
                            >
                              {getDomainMonogram(link.title, link.url)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-[13px] font-semibold truncate leading-tight">
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
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(link)}
                              aria-label={`${dict.editLabel} ${link.title}`}
                              className="w-9 h-9 rounded-xl grid place-items-center cursor-pointer opacity-75 hover:opacity-100 hover:bg-[var(--glass2)] transition-all"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemove(link.id)}
                              aria-label={`${dict.deleteLabel} ${link.title}`}
                              className="w-9 h-9 rounded-xl grid place-items-center cursor-pointer opacity-75 hover:opacity-100 hover:bg-red-500/15 hover:text-red-500 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add / Edit Quick Link Form */}
                {(canAddMore || editingId !== null) && (
                  <form onSubmit={handleSaveLink} className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        placeholder={dict.quickLinkTitlePlaceholder}
                        aria-label={dict.quickLinkTitlePlaceholder}
                        maxLength={32}
                        className="h-10 px-3.5 rounded-xl text-xs font-medium outline-none transition-shadow focus:ring-1 focus:ring-[var(--acc)]"
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
                        className="h-10 px-3.5 rounded-xl text-xs font-medium outline-none transition-shadow focus:ring-1 focus:ring-[var(--acc)]"
                        style={{
                          backgroundColor: 'var(--glass)',
                          boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                          color: 'var(--fg)',
                        }}
                      />
                    </div>
                    {errorMsg && (
                      <p className="text-xs font-medium text-red-500 px-1" role="alert">
                        {errorMsg}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <BubbleButton
                        type="submit"
                        variant="solid"
                        contentClassName="inline-flex items-center gap-1.5"
                        className="h-9 px-4 rounded-full text-xs font-semibold cursor-pointer active:scale-[0.97]"
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
                          className="h-9 px-4 rounded-full text-xs font-medium cursor-pointer hover:bg-[var(--glass2)]"
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

              {/* Privacy & Cookie Governance */}
              <section
                data-testid="settings-cookie-section"
                className="pt-6 border-t space-y-3.5"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3
                      className="text-[11px] font-semibold uppercase tracking-[0.06em]"
                      style={{ color: 'var(--mut)' }}
                    >
                      {dict.settingsCookieTitle}
                    </h3>
                    <p
                      className="text-xs mt-1 leading-relaxed"
                      style={{ color: 'var(--mut)' }}
                    >
                      {dict.settingsCookieSubtitle}
                    </p>
                  </div>
                </div>

                {/* Single Clean Privacy Surface */}
                <div
                  className="rounded-2xl overflow-hidden"
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

                  {/* Quick Actions */}
                  <div
                    className="p-3 grid grid-cols-2 gap-2 border-b"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <BubbleButton
                      variant="glass"
                      data-testid="settings-cookie-accept-all"
                      onClick={() => applyCookieChoice(true, true, false)}
                      className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer hover:bg-[var(--glass2)]"
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
                      className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer hover:bg-[var(--glass2)]"
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

                  {/* Granular Custom Orbit Switches */}
                  <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                    <label
                      className={`flex items-center justify-between gap-3 px-4 py-3 text-xs font-medium ${
                        consent.gpcDetected ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <span>{dict.cookieFunctionalToggle}</span>
                      <span className="relative inline-flex items-center shrink-0">
                        <input
                          type="checkbox"
                          data-testid="settings-cookie-functional-toggle"
                          checked={consent.functionalExternal}
                          disabled={consent.gpcDetected}
                          onChange={(e) =>
                            applyCookieChoice(
                              e.target.checked,
                              consent.analytics,
                              consent.doNotSellOrShare
                            )
                          }
                          className="sr-only peer"
                        />
                        <span
                          aria-hidden="true"
                          className="w-10 h-5.5 rounded-full transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--acc)] relative block"
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
                      </span>
                    </label>

                    <label
                      className={`flex items-center justify-between gap-3 px-4 py-3 text-xs font-medium ${
                        consent.gpcDetected ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <span>{dict.cookieAnalyticsToggle}</span>
                      <span className="relative inline-flex items-center shrink-0">
                        <input
                          type="checkbox"
                          data-testid="settings-cookie-analytics-toggle"
                          checked={consent.analytics}
                          disabled={consent.gpcDetected}
                          onChange={(e) =>
                            applyCookieChoice(
                              consent.functionalExternal,
                              e.target.checked,
                              consent.doNotSellOrShare
                            )
                          }
                          className="sr-only peer"
                        />
                        <span
                          aria-hidden="true"
                          className="w-10 h-5.5 rounded-full transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--acc)] relative block"
                          style={{
                            backgroundColor: consent.analytics
                              ? 'var(--acc)'
                              : 'var(--glass2)',
                            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                          }}
                        >
                          <span
                            className="block w-4 h-4 rounded-full transition-transform duration-200 mt-[3px]"
                            style={{
                              backgroundColor: consent.analytics ? 'var(--acc-fg)' : 'var(--fg)',
                              transform: consent.analytics
                                ? 'translateX(21px)'
                                : 'translateX(3px)',
                            }}
                          />
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                {onOpenLegal && (
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={onOpenLegal}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--acc-text)' }}
                    >
                      <span>{dict.cookieNoticeOpenPolicy}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
