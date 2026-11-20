import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, CheckCircle2, Coffee, Moon, Pencil, Plus, RotateCcw, Sun, Trash2, X } from 'lucide-react';
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
  onOpenSupport?: () => void;
  onUserModify?: () => void;
}

export function SettingsModal({
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
  onOpenSupport,
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

  const applyCookieChoice = (functionalExternal: boolean, analytics: boolean, doNotSellOrShare: boolean) => {
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

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center md:justify-end p-4 md:pr-10 lg:pr-14 pointer-events-none"
        >
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
            initial={{ opacity: 0, x: 28, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.98 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 pointer-events-auto w-full max-w-[460px] max-h-[86vh] flex flex-col rounded-[28px] overflow-hidden backdrop-blur-2xl"
            style={{
              backgroundColor: 'var(--menu-glass)',
              color: 'var(--fg)',
              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between gap-4 px-6 py-4 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="min-w-0">
                <h2 id="settings-modal-title" className="text-lg font-semibold tracking-tight">
                  {dict.settingsTitle}
                </h2>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--mut)' }}>
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
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto orbit-scroll space-y-5">
              {/* Theme Switch */}
              <section>
                <h3 className="text-xs font-semibold mb-2.5" style={{ color: 'var(--mut)' }}>
                  {dict.themeLabel}
                </h3>
                <div
                  className="grid grid-cols-2 gap-1.5 p-1 rounded-full"
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
                    className="h-10 rounded-full text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: theme === 'dark' ? 'var(--acc)' : 'transparent',
                      color: theme === 'dark' ? 'var(--acc-fg)' : 'var(--fg)',
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
                    className="h-10 rounded-full text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: theme === 'light' ? 'var(--acc)' : 'transparent',
                      color: theme === 'light' ? 'var(--acc-fg)' : 'var(--fg)',
                    }}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>{dict.themeLight}</span>
                  </BubbleButton>
                </div>
              </section>

              {/* 6 Fluo Accent Colors */}
              <section>
                <h3 className="text-xs font-semibold mb-2.5" style={{ color: 'var(--mut)' }}>
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
                        className="h-11 px-3 rounded-full text-left text-xs font-semibold cursor-pointer hover:bg-[var(--glass2)] active:scale-[0.98]"
                        style={{
                          backgroundColor: isSelected ? 'var(--glass2)' : 'var(--glass)',
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
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <span className="truncate">{label}</span>
                      </BubbleButton>
                    );
                  })}
                </div>
              </section>

              {/* Quick Links Manager (Max 4) */}
              <section>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <h3 className="text-xs font-semibold" style={{ color: 'var(--mut)' }}>
                    {dict.quickLinksLabel} ({quickLinks.length}/{MAX_QUICK_LINKS})
                  </h3>
                  <BubbleButton
                    variant="glass"
                    onClick={() => {
                      handleCancelEdit();
                      onQuickLinksChange(DEFAULT_QUICK_LINKS);
                      onUserModify?.();
                    }}
                    contentClassName="inline-flex items-center gap-1"
                    className="text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer hover:bg-[var(--glass2)]"
                    style={{ color: 'var(--mut)' }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{dict.resetDefaults}</span>
                  </BubbleButton>
                </div>

                {/* Existing Quick Links */}
                <div className="space-y-1.5 mb-3">
                  {quickLinks.map((link) => (
                    <div
                      key={link.id}
                      data-testid={`quicklink-row-${link.id}`}
                      className="flex items-center justify-between gap-2 pl-4 pr-1.5 py-1.5 rounded-full transition-all duration-200"
                      style={{
                        backgroundColor: 'var(--glass)',
                        boxShadow:
                          editingId === link.id
                            ? 'inset 0 0 0 1.5px var(--acc)'
                            : 'inset 0 0 0 1px var(--border-subtle)',
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate">{link.title}</div>
                        <div className="text-[11px] truncate" style={{ color: 'var(--mut)' }}>
                          {link.url}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(link)}
                          aria-label={`${dict.editLabel} ${link.title}`}
                          className="w-9 h-9 rounded-full grid place-items-center cursor-pointer hover:bg-[var(--glass2)] transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(link.id)}
                          aria-label={`${dict.deleteLabel} ${link.title}`}
                          className="w-9 h-9 rounded-full grid place-items-center cursor-pointer hover:bg-red-500/15 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add / Edit Quick Link Form */}
                {(canAddMore || editingId !== null) && (
                  <form onSubmit={handleSaveLink} className="space-y-2 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        placeholder={dict.quickLinkTitlePlaceholder}
                        aria-label={dict.quickLinkTitlePlaceholder}
                        maxLength={32}
                        className="h-10 px-4 rounded-full text-xs font-medium outline-none transition-all"
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
                        className="h-10 px-4 rounded-full text-xs font-medium outline-none transition-all"
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
                        className="h-10 px-4 rounded-full text-xs font-semibold cursor-pointer active:scale-[0.97]"
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

              {/* Cookie & Privacy Preferences (Modifiable Anytime from Settings) */}
              <section
                data-testid="settings-cookie-section"
                className="pt-4 border-t space-y-3"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div>
                  <h3 className="text-xs font-semibold" style={{ color: 'var(--mut)' }}>
                    {dict.settingsCookieTitle}
                  </h3>
                  <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--mut)' }}>
                    {dict.settingsCookieSubtitle}
                  </p>
                </div>

                <div
                  className="p-3.5 rounded-2xl space-y-3"
                  style={{
                    backgroundColor: 'var(--glass)',
                    boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                  }}
                >
                  <div className="text-xs font-medium flex items-start gap-2" style={{ color: 'var(--mut)' }}>
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--acc-text)' }} />
                    <span>
                      {dict.cookieStatusLabel}:{' '}
                      <strong style={{ color: 'var(--fg)' }}>{consentStatusSummary}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <BubbleButton
                      variant="solid"
                      data-testid="settings-cookie-accept-all"
                      onClick={() => applyCookieChoice(true, true, false)}
                      className="h-9 px-3 rounded-full text-xs font-semibold cursor-pointer hover:bg-[var(--glass2)]"
                      style={{
                        backgroundColor: 'var(--glass)',
                        boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                        color: 'var(--fg)',
                      }}
                    >
                      <span>{dict.cookieAcceptAll}</span>
                    </BubbleButton>

                    <BubbleButton
                      variant="glass"
                      data-testid="settings-cookie-reject-all"
                      onClick={() => applyCookieChoice(false, false, true)}
                      className="h-9 px-3 rounded-full text-xs font-semibold cursor-pointer hover:bg-[var(--glass2)]"
                      style={{
                        backgroundColor: 'var(--glass)',
                        boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                        color: 'var(--fg)',
                      }}
                    >
                      <span>{dict.cookieRejectAll}</span>
                    </BubbleButton>
                  </div>

                  <div className="space-y-1.5 pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <label className="flex items-center justify-between gap-3 text-xs cursor-pointer py-1">
                      <span>{dict.cookieFunctionalToggle}</span>
                      <input
                        type="checkbox"
                        data-testid="settings-cookie-functional-toggle"
                        checked={consent.functionalExternal}
                        disabled={consent.gpcDetected}
                        onChange={(e) =>
                          applyCookieChoice(e.target.checked, consent.analytics, consent.doNotSellOrShare)
                        }
                        className="w-4 h-4 accent-[var(--acc)]"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 text-xs cursor-pointer py-1">
                      <span>{dict.cookieAnalyticsToggle}</span>
                      <input
                        type="checkbox"
                        data-testid="settings-cookie-analytics-toggle"
                        checked={consent.analytics}
                        disabled={consent.gpcDetected}
                        onChange={(e) =>
                          applyCookieChoice(consent.functionalExternal, e.target.checked, consent.doNotSellOrShare)
                        }
                        className="w-4 h-4 accent-[var(--acc)]"
                      />
                    </label>
                  </div>

                  {onOpenLegal && (
                    <button
                      type="button"
                      onClick={onOpenLegal}
                      className="text-[11px] font-semibold underline underline-offset-4 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--acc-text)' }}
                    >
                      {dict.cookieNoticeOpenPolicy}
                    </button>
                  )}
                </div>
              </section>

              {/* Support / Buy Me a Coffee */}
              {onOpenSupport && (
                <section
                  data-testid="settings-support-section"
                  className="pt-4 border-t space-y-2.5"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div>
                    <h3 className="text-xs font-semibold" style={{ color: 'var(--mut)' }}>
                      {dict.settingsSupportTitle}
                    </h3>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--mut)' }}>
                      {dict.settingsSupportSubtitle}
                    </p>
                  </div>

                  <BubbleButton
                    variant="solid"
                    data-testid="settings-donate-btn"
                    onClick={onOpenSupport}
                    className="w-full h-11 px-4 rounded-full text-[13px] font-semibold cursor-pointer active:scale-[0.98]"
                    style={{
                      backgroundColor: 'var(--acc)',
                      color: 'var(--acc-fg)',
                    }}
                  >
                    <Coffee className="w-4 h-4 shrink-0" />
                    <span>{dict.settingsSupportButton}</span>
                  </BubbleButton>
                </section>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
