import { memo, useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Mail,
  MessageSquareHeart,
  Rss,
  Send,
  Star,
} from 'lucide-react';
import { UiDictionary } from '../i18n/translations';
import { FeedbackCategory, FeedbackDigestSummary, LanguageCode } from '../types/orbit';
import { BubbleButton } from './LiquidBubble';

interface SettingsFeedbackPanelProps {
  lang: LanguageCode;
  dict: UiDictionary;
  onUserModify?: () => void;
}

export const SettingsFeedbackPanel = memo(function SettingsFeedbackPanel({
  lang,
  dict,
  onUserModify,
}: SettingsFeedbackPanelProps) {
  const [category, setCategory] = useState<FeedbackCategory>('idea');
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [digest, setDigest] = useState<FeedbackDigestSummary | null>(null);
  const [copiedRss, setCopiedRss] = useState(false);
  const [serverDispatchNote, setServerDispatchNote] = useState('');

  const loadDigest = useCallback(async () => {
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) {
        setDigest((await res.json()) as FeedbackDigestSummary);
      }
    } catch {
      // Ignore offline fetch failure
    }
  }, []);

  useEffect(() => {
    void loadDigest();
  }, [loadDigest]);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 5) {
      setErrorMsg(dict.fbValidationError);
      setSuccessMsg('');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'OrbitSearch',
        },
        body: JSON.stringify({
          category,
          rating,
          message: trimmed,
          contactEmail: contactEmail.trim() || undefined,
          lang,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(err.error || dict.fbValidationError);
        return;
      }
      const data = (await res.json()) as { summary?: FeedbackDigestSummary };
      if (data.summary) setDigest(data.summary);
      setMessage('');
      setSuccessMsg(dict.fbSuccessBanner);
      onUserModify?.();
    } catch {
      setErrorMsg(dict.fbValidationError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyRssUrl = async () => {
    const rssUrl = `${window.location.origin}/api/feedback/digest?format=rss`;
    try {
      await navigator.clipboard.writeText(rssUrl);
      setCopiedRss(true);
      setTimeout(() => setCopiedRss(false), 2200);
    } catch {
      // Clipboard fallback unavailable in restricted contexts
    }
  };

  const handleServerDigestDispatch = async () => {
    try {
      const res = await fetch('/api/feedback/digest/send', {
        method: 'POST',
        headers: { 'X-Requested-With': 'OrbitSearch' },
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setServerDispatchNote(data.message || '');
      await loadDigest();
    } catch {
      // Ignore error
    }
  };

  const mailtoHref = digest
    ? `mailto:${encodeURIComponent(digest.toEmail)}?subject=${encodeURIComponent(
        `Orbit Daily Feedback Digest (${digest.dayKey})`
      )}&body=${encodeURIComponent(digest.digestText)}`
    : 'mailto:mastrorillidaniel@gmail.com';

  const categories: Array<{ id: FeedbackCategory; label: string }> = [
    { id: 'idea', label: dict.fbCategoryIdea },
    { id: 'bug', label: dict.fbCategoryBug },
    { id: 'ux', label: dict.fbCategoryUx },
    { id: 'praise', label: dict.fbCategoryPraise },
  ];

  return (
    <section
      id="settings-tabpanel-feedback"
      role="tabpanel"
      data-testid="settings-panel-feedback"
      className="space-y-6 pb-6"
    >
      <div className="space-y-1">
        <div
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em]"
          style={{ color: 'var(--acc-text)' }}
        >
          <MessageSquareHeart className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{dict.settingsTabFeedback}</span>
        </div>
        <h3 className="m-0 text-base font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
          {dict.fbSectionTitle}
        </h3>
        <p className="m-0 text-xs leading-relaxed" style={{ color: 'var(--mut)' }}>
          {dict.fbSubtitle}
        </p>
      </div>

      {/* Feedback Submission Form */}
      <form
        onSubmit={(e) => void handleSubmitFeedback(e)}
        className="rounded-2xl p-4 sm:p-5 space-y-4"
        style={{
          backgroundColor: 'var(--glass)',
          boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
        }}
      >
        {/* Category Selector */}
        <div className="space-y-2">
          <div className="text-xs font-medium" style={{ color: 'var(--mut)' }}>
            {dict.fbCategoryLabel}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  tabIndex={0}
                  data-testid={`feedback-cat-${cat.id}`}
                  onClick={() => setCategory(cat.id)}
                  className="h-8 px-3.5 rounded-full text-xs font-medium cursor-pointer transition-colors"
                  style={{
                    backgroundColor: active ? 'var(--acc)' : 'var(--glass2)',
                    color: active ? 'var(--acc-fg)' : 'var(--fg)',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 1-5 Star Rating */}
        <div className="space-y-2">
          <div className="text-xs font-medium" style={{ color: 'var(--mut)' }}>
            {dict.fbRatingLabel}
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((num) => {
              const filled = num <= rating;
              return (
                <button
                  key={num}
                  type="button"
                  tabIndex={0}
                  data-testid={`feedback-rating-${num}`}
                  aria-label={`${num} / 5`}
                  onClick={() => setRating(num)}
                  className="w-9 h-9 rounded-full grid place-items-center cursor-pointer transition-transform hover:scale-105"
                  style={{
                    backgroundColor: filled ? 'rgba(var(--acc-rgb), 0.18)' : 'var(--glass2)',
                    color: filled ? 'var(--acc-text)' : 'var(--mut)',
                  }}
                >
                  <Star className={`w-4 h-4 ${filled ? 'fill-current' : ''}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Textarea */}
        <div className="space-y-1.5">
          <textarea
            tabIndex={0}
            data-testid="feedback-message-input"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (errorMsg) setErrorMsg('');
              if (successMsg) setSuccessMsg('');
            }}
            placeholder={dict.fbMessagePlaceholder}
            aria-label={dict.fbMessagePlaceholder}
            rows={3}
            maxLength={1500}
            className="w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-[13px] outline-none resize-y focus:ring-1 focus:ring-[var(--acc)]"
            style={{
              backgroundColor: 'var(--glass2)',
              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
              color: 'var(--fg)',
            }}
          />
          <div className="flex items-center justify-between gap-2 text-[11px]" style={{ color: 'var(--mut)' }}>
            <span>{message.trim().length}/1500</span>
          </div>
        </div>

        {/* Optional Contact Email */}
        <div className="space-y-1.5">
          <label htmlFor="orbit-feedback-email" className="block text-xs font-medium" style={{ color: 'var(--mut)' }}>
            {dict.fbEmailLabel}
          </label>
          <input
            id="orbit-feedback-email"
            type="email"
            tabIndex={0}
            data-testid="feedback-email-input"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder={dict.fbEmailPlaceholder}
            className="w-full h-10 px-3.5 rounded-full text-xs outline-none focus:ring-1 focus:ring-[var(--acc)]"
            style={{
              backgroundColor: 'var(--glass2)',
              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
              color: 'var(--fg)',
            }}
          />
        </div>

        {errorMsg && (
          <p className="m-0 text-xs font-medium text-red-500" role="alert" data-testid="feedback-error-msg">
            {errorMsg}
          </p>
        )}
        {successMsg && (
          <p
            className="m-0 text-xs font-semibold flex items-center gap-1.5"
            style={{ color: 'var(--acc-text)' }}
            role="status"
            data-testid="feedback-success-banner"
          >
            <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{successMsg}</span>
          </p>
        )}

        <BubbleButton
          type="submit"
          variant="solid"
          tabIndex={0}
          disabled={submitting}
          data-testid="feedback-submit-btn"
          contentClassName="inline-flex items-center gap-2"
          className="h-10 px-5 rounded-full text-xs font-semibold cursor-pointer active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--acc)',
            color: 'var(--acc-fg)',
          }}
        >
          <Send className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{submitting ? dict.fbSubmitting : dict.fbSubmitBtn}</span>
        </BubbleButton>
      </form>

      {/* Daily Digest Delivery & Archive Card */}
      <div
        data-testid="feedback-digest-panel"
        className="rounded-2xl p-4 sm:p-5 space-y-4"
        style={{
          backgroundColor: 'var(--glass)',
          boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--fg)' }}>
            <Rss className="w-4 h-4 shrink-0" style={{ color: 'var(--acc-text)' }} aria-hidden="true" />
            <span>{dict.fbDigestTitle}</span>
          </div>
          {digest && (
            <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums" style={{ color: 'var(--mut)' }}>
              <span>
                {dict.fbTodayCountLabel}: <strong style={{ color: 'var(--fg)' }}>{digest.countToday}</strong>
              </span>
              <span>·</span>
              <span>
                {dict.fbAvgRatingLabel}: <strong style={{ color: 'var(--fg)' }}>{digest.averageRating || '—'}/5</strong>
              </span>
            </div>
          )}
        </div>

        <p className="m-0 text-xs leading-relaxed" style={{ color: 'var(--mut)' }}>
          {dict.fbDigestDesc}
        </p>

        {digest && (
          <div
            className="rounded-xl px-3.5 py-2.5 text-[11.5px] font-medium"
            style={{
              backgroundColor: 'var(--glass2)',
              color: 'var(--fg)',
            }}
          >
            {digest.autoEmailConfigured || digest.webhookConfigured
              ? `${dict.fbAutoStatusReady} ${digest.toEmail}`
              : `${dict.fbAutoStatusArchive} ${digest.toEmail}`}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={mailtoHref}
            tabIndex={0}
            data-testid="feedback-email-digest-link"
            className="h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold transition-transform active:scale-95"
            style={{
              backgroundColor: 'var(--acc)',
              color: 'var(--acc-fg)',
              textDecoration: 'none',
            }}
          >
            <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{dict.fbSendEmailDigestBtn}</span>
          </a>

          <BubbleButton
            variant="glass"
            tabIndex={0}
            data-testid="feedback-copy-rss-btn"
            onClick={() => void handleCopyRssUrl()}
            contentClassName="inline-flex items-center gap-1.5"
            className="h-9 px-3.5 rounded-full text-xs font-medium cursor-pointer hover:bg-[var(--glass2)]"
            style={{
              backgroundColor: 'var(--glass2)',
              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
            }}
          >
            {copiedRss ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedRss ? dict.fbCopiedRss : dict.fbCopyRssBtn}</span>
          </BubbleButton>

          <a
            href="/api/feedback/digest?format=txt"
            download={`orbit-feedback-${digest?.dayKey || 'today'}.txt`}
            tabIndex={0}
            data-testid="feedback-download-txt-link"
            className="h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium hover:bg-[var(--glass2)]"
            style={{
              backgroundColor: 'var(--glass2)',
              color: 'var(--fg)',
              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
              textDecoration: 'none',
            }}
          >
            <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{dict.fbDownloadTxtBtn}</span>
          </a>

          {(digest?.autoEmailConfigured || digest?.webhookConfigured) && (
            <BubbleButton
              variant="glass"
              tabIndex={0}
              onClick={() => void handleServerDigestDispatch()}
              className="h-9 px-3.5 rounded-full text-xs font-medium cursor-pointer hover:bg-[var(--glass2)]"
              style={{
                backgroundColor: 'var(--glass2)',
                boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
              }}
            >
              <span>{dict.fbTriggerServerDigestBtn}</span>
            </BubbleButton>
          )}
        </div>

        {serverDispatchNote && (
          <p className="m-0 text-xs font-medium" style={{ color: 'var(--acc-text)' }}>
            {serverDispatchNote}
          </p>
        )}

        {/* Recent Collected Entries */}
        <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="text-xs font-medium" style={{ color: 'var(--mut)' }}>
            {dict.fbRecentTitle}
          </div>
          {!digest || digest.entries.length === 0 ? (
            <p className="m-0 text-xs" style={{ color: 'var(--mut)' }}>
              {dict.fbNoEntriesYet}
            </p>
          ) : (
            <div data-testid="feedback-entries-list" className="space-y-2 max-h-[210px] overflow-y-auto orbit-scroll">
              {digest.entries.slice(0, 12).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl p-3 space-y-1 text-xs"
                  style={{ backgroundColor: 'var(--glass2)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold uppercase text-[10px]" style={{ color: 'var(--acc-text)' }}>
                      {item.category} · {item.rating}/5
                    </span>
                    <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--mut)' }}>
                      {item.dayKey}
                    </span>
                  </div>
                  <p className="m-0 leading-relaxed break-words" style={{ color: 'var(--fg)' }}>
                    {item.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
