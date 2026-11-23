import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  FeedbackCategory,
  FeedbackDigestSummary,
  FeedbackEntry,
  LanguageCode,
} from '../src/types/orbit.ts';
import { recordServerDiagnostic } from './diagnostics.ts';

const DATA_ROOT = path.resolve(process.cwd(), 'data');
const FEEDBACK_FILE = path.resolve(DATA_ROOT, 'feedback.json');
const MAX_STORED_ENTRIES = 300;
const DAY_MS = 24 * 60 * 60 * 1000;

interface FeedbackStoreFile {
  entries: FeedbackEntry[];
  lastAutoDispatchAt: string | null;
}

function assertConfinedFeedbackPath(): void {
  if (!FEEDBACK_FILE.startsWith(DATA_ROOT + path.sep)) {
    throw new Error('Unsafe feedback storage path');
  }
}

export function getRecipientFeedbackEmail(): string {
  const envEmail = process.env.FEEDBACK_TO_EMAIL?.trim();
  if (envEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(envEmail)) {
    return envEmail;
  }
  return 'mastrorillidaniel@gmail.com';
}

export function getTodayDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function validateFeedbackInput(raw: unknown): {
  ok: true;
  data: {
    category: FeedbackCategory;
    rating: number;
    message: string;
    contactEmail?: string;
    lang: LanguageCode;
  };
} | {
  ok: false;
  error: string;
} {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid feedback payload' };
  }
  const obj = raw as Record<string, unknown>;
  const validCategories: FeedbackCategory[] = ['bug', 'idea', 'ux', 'praise'];
  const category: FeedbackCategory = validCategories.includes(obj.category as FeedbackCategory)
    ? (obj.category as FeedbackCategory)
    : 'idea';

  const ratingNum = Number(obj.rating);
  const rating = Number.isFinite(ratingNum) ? Math.min(5, Math.max(1, Math.round(ratingNum))) : 5;

  const rawMessage = typeof obj.message === 'string' ? obj.message.replace(/\r\n/g, '\n').trim() : '';
  if (rawMessage.length < 5 || rawMessage.length > 1500) {
    return { ok: false, error: 'Feedback message must be between 5 and 1500 characters.' };
  }

  let contactEmail: string | undefined;
  if (typeof obj.contactEmail === 'string' && obj.contactEmail.trim().length > 0) {
    const emailCandidate = obj.contactEmail.trim().slice(0, 160);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCandidate)) {
      return { ok: false, error: 'Invalid optional email format.' };
    }
    contactEmail = emailCandidate;
  }

  const validLangs: LanguageCode[] = ['it', 'en', 'fr', 'de', 'es'];
  const lang: LanguageCode = validLangs.includes(obj.lang as LanguageCode)
    ? (obj.lang as LanguageCode)
    : 'it';

  return {
    ok: true,
    data: {
      category,
      rating,
      message: rawMessage,
      ...(contactEmail ? { contactEmail } : {}),
      lang,
    },
  };
}

export function sanitizeFeedbackList(raw: unknown): FeedbackEntry[] {
  if (!Array.isArray(raw)) return [];
  const validCategories = new Set<FeedbackCategory>(['bug', 'idea', 'ux', 'praise']);
  const validLangs = new Set<LanguageCode>(['it', 'en', 'fr', 'de', 'es']);

  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .slice(0, MAX_STORED_ENTRIES)
    .map((item) => {
      const createdAt =
        typeof item.createdAt === 'string' && !Number.isNaN(Date.parse(item.createdAt))
          ? item.createdAt
          : new Date().toISOString();
      return {
        id: typeof item.id === 'string' ? item.id.slice(0, 64) : `fb-${Date.now()}`,
        createdAt,
        dayKey:
          typeof item.dayKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.dayKey)
            ? item.dayKey
            : createdAt.slice(0, 10),
        category: validCategories.has(item.category as FeedbackCategory)
          ? (item.category as FeedbackCategory)
          : 'idea',
        rating: Math.min(5, Math.max(1, Math.round(Number(item.rating) || 5))),
        message: typeof item.message === 'string' ? item.message.slice(0, 1500) : '',
        ...(typeof item.contactEmail === 'string' && item.contactEmail.trim()
          ? { contactEmail: item.contactEmail.trim().slice(0, 160) }
          : {}),
        lang: validLangs.has(item.lang as LanguageCode) ? (item.lang as LanguageCode) : 'it',
        includedInDigestAt:
          typeof item.includedInDigestAt === 'string' ? item.includedInDigestAt : null,
      };
    })
    .filter((item) => item.message.length >= 5);
}

async function readStore(): Promise<FeedbackStoreFile> {
  assertConfinedFeedbackPath();
  try {
    const raw = await fs.readFile(FEEDBACK_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<FeedbackStoreFile>;
    return {
      entries: sanitizeFeedbackList(parsed.entries),
      lastAutoDispatchAt:
        typeof parsed.lastAutoDispatchAt === 'string' ? parsed.lastAutoDispatchAt : null,
    };
  } catch {
    return { entries: [], lastAutoDispatchAt: null };
  }
}

async function writeStore(store: FeedbackStoreFile): Promise<void> {
  assertConfinedFeedbackPath();
  await fs.mkdir(DATA_ROOT, { recursive: true });
  await fs.writeFile(
    FEEDBACK_FILE,
    JSON.stringify(
      {
        entries: store.entries.slice(0, MAX_STORED_ENTRIES),
        lastAutoDispatchAt: store.lastAutoDispatchAt,
      },
      null,
      2
    ),
    'utf8'
  );
}

export async function listFeedbackEntries(): Promise<FeedbackStoreFile> {
  return readStore();
}

export async function addFeedbackEntry(input: unknown): Promise<FeedbackEntry> {
  const validated = validateFeedbackInput(input);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  const now = new Date();
  const entry: FeedbackEntry = {
    id: `fb-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now.toISOString(),
    dayKey: getTodayDayKey(now),
    category: validated.data.category,
    rating: validated.data.rating,
    message: validated.data.message,
    ...(validated.data.contactEmail ? { contactEmail: validated.data.contactEmail } : {}),
    lang: validated.data.lang,
    includedInDigestAt: null,
  };

  const store = await readStore();
  store.entries.unshift(entry);
  if (store.entries.length > MAX_STORED_ENTRIES) {
    store.entries.length = MAX_STORED_ENTRIES;
  }
  await writeStore(store);

  recordServerDiagnostic({
    level: 'info',
    source: 'server',
    event: 'feedback.received',
    message: `Feedback saved (${entry.category}, rating ${entry.rating}/5, day ${entry.dayKey}).`,
  });

  return entry;
}

export function buildDailyDigestText(entries: FeedbackEntry[], dayKey: string): string {
  const dayEntries = entries.filter((e) => e.dayKey === dayKey);
  const targetEntries = dayEntries.length > 0 ? dayEntries : entries.slice(0, 15);
  if (targetEntries.length === 0) {
    return `Orbit Daily Feedback Digest (${dayKey})\nNo feedback entries recorded yet.`;
  }

  const avg =
    Math.round(
      (targetEntries.reduce((acc, item) => acc + item.rating, 0) / targetEntries.length) * 10
    ) / 10;

  const lines = [
    `Orbit Daily Feedback Digest · ${dayKey}`,
    `Entries: ${targetEntries.length} (Today: ${dayEntries.length}) | Avg rating: ${avg}/5`,
    '------------------------------------------------------------',
    ...targetEntries.map((item, idx) => {
      const reply = item.contactEmail ? ` | Reply: ${item.contactEmail}` : '';
      return `${idx + 1}. [${item.createdAt}] [${item.category.toUpperCase()}] ${item.rating}/5 (${item.lang})${reply}\n   ${item.message}`;
    }),
  ];
  return lines.join('\n');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildFeedbackRssXml(entries: FeedbackEntry[], baseUrl: string): string {
  const grouped = new Map<string, FeedbackEntry[]>();
  for (const item of entries) {
    const arr = grouped.get(item.dayKey) ?? [];
    arr.push(item);
    grouped.set(item.dayKey, arr);
  }
  const days = Array.from(grouped.keys()).sort((a, b) => (a < b ? 1 : -1)).slice(0, 14);
  const itemsXml = days
    .map((day) => {
      const dayItems = grouped.get(day) ?? [];
      const text = buildDailyDigestText(dayItems, day);
      const pubDate = new Date(`${day}T21:00:00.000Z`).toUTCString();
      return [
        '    <item>',
        `      <title>${escapeXml(`Orbit Daily Feedback (${day}) · ${dayItems.length} items`)}</title>`,
        `      <guid isPermaLink="false">orbit-feedback-${escapeXml(day)}-${dayItems.length}</guid>`,
        `      <pubDate>${escapeXml(pubDate)}</pubDate>`,
        `      <description>${escapeXml(text)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    '    <title>Orbit Search — Daily Feedback Digest</title>',
    `    <link>${escapeXml(baseUrl)}</link>`,
    '    <description>Daily aggregated user feedback for Orbit Search.</description>',
    itemsXml,
    '  </channel>',
    '</rss>',
  ].join('\n');
}

export async function getFeedbackDigestSummary(
  dayKey: string = getTodayDayKey()
): Promise<FeedbackDigestSummary> {
  const store = await readStore();
  const todayEntries = store.entries.filter((e) => e.dayKey === dayKey);
  const pool = todayEntries.length > 0 ? todayEntries : store.entries.slice(0, 20);
  const avg =
    pool.length > 0
      ? Math.round((pool.reduce((acc, item) => acc + item.rating, 0) / pool.length) * 10) / 10
      : 0;

  return {
    dayKey,
    toEmail: getRecipientFeedbackEmail(),
    countToday: todayEntries.length,
    totalCount: store.entries.length,
    averageRating: avg,
    autoEmailConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    webhookConfigured: Boolean(process.env.FEEDBACK_WEBHOOK_URL?.trim()),
    lastAutoDispatchAt: store.lastAutoDispatchAt,
    digestText: buildDailyDigestText(store.entries, dayKey),
    entries: store.entries.slice(0, 30),
  };
}

export async function dispatchDailyFeedbackDigest(forceDayKey?: string): Promise<{
  ok: boolean;
  channel: 'resend' | 'webhook' | 'archive-only';
  dispatchedCount: number;
  message: string;
}> {
  const dayKey = forceDayKey || getTodayDayKey();
  const store = await readStore();
  const pending = store.entries.filter((e) => !e.includedInDigestAt);
  const digestText = buildDailyDigestText(
    pending.length > 0 ? pending : store.entries,
    dayKey
  );
  const toEmail = getRecipientFeedbackEmail();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL?.trim();

  if (resendKey) {
    const fromEmail =
      process.env.FEEDBACK_FROM_EMAIL?.trim() || 'Orbit Feedback <onboarding@resend.dev>';
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `Orbit Daily Feedback Digest (${dayKey})`,
        text: digestText,
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      recordServerDiagnostic({
        level: 'error',
        source: 'server',
        event: 'feedback.digest.email_error',
        message: `Resend API returned HTTP ${resp.status}: ${detail.slice(0, 120)}`,
        statusCode: resp.status,
      });
      return {
        ok: false,
        channel: 'resend',
        dispatchedCount: 0,
        message: `Email delivery returned HTTP ${resp.status}`,
      };
    }

    const nowIso = new Date().toISOString();
    store.entries = store.entries.map((item) =>
      item.includedInDigestAt ? item : { ...item, includedInDigestAt: nowIso }
    );
    store.lastAutoDispatchAt = nowIso;
    await writeStore(store);

    recordServerDiagnostic({
      level: 'info',
      source: 'server',
      event: 'feedback.digest.sent',
      message: `Daily feedback digest emailed to ${toEmail} (${pending.length} items).`,
    });
    return {
      ok: true,
      channel: 'resend',
      dispatchedCount: pending.length,
      message: `Daily digest emailed to ${toEmail}.`,
    };
  }

  if (webhookUrl) {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayKey,
        toEmail,
        count: pending.length,
        digestText,
      }),
    });
    if (!resp.ok) {
      recordServerDiagnostic({
        level: 'error',
        source: 'server',
        event: 'feedback.digest.webhook_error',
        message: `Webhook returned HTTP ${resp.status}`,
        statusCode: resp.status,
      });
      return {
        ok: false,
        channel: 'webhook',
        dispatchedCount: 0,
        message: `Webhook delivery returned HTTP ${resp.status}`,
      };
    }

    const nowIso = new Date().toISOString();
    store.entries = store.entries.map((item) =>
      item.includedInDigestAt ? item : { ...item, includedInDigestAt: nowIso }
    );
    store.lastAutoDispatchAt = nowIso;
    await writeStore(store);

    recordServerDiagnostic({
      level: 'info',
      source: 'server',
      event: 'feedback.digest.sent',
      message: `Daily feedback digest sent via webhook (${pending.length} items).`,
    });
    return {
      ok: true,
      channel: 'webhook',
      dispatchedCount: pending.length,
      message: 'Daily digest dispatched to webhook.',
    };
  }

  return {
    ok: true,
    channel: 'archive-only',
    dispatchedCount: 0,
    message: 'Daily digest compiled and ready via RSS/JSON feed or one-click email.',
  };
}

let schedulerStarted = false;

export function startDailyDigestScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const checkAndDispatch = async () => {
    try {
      const hasAutoTransport = Boolean(
        process.env.RESEND_API_KEY?.trim() || process.env.FEEDBACK_WEBHOOK_URL?.trim()
      );
      if (!hasAutoTransport) return;
      const store = await readStore();
      const pending = store.entries.filter((e) => !e.includedInDigestAt);
      if (pending.length === 0) return;

      const lastMs = store.lastAutoDispatchAt ? Date.parse(store.lastAutoDispatchAt) : 0;
      if (Date.now() - lastMs >= DAY_MS) {
        await dispatchDailyFeedbackDigest();
      }
    } catch (err) {
      recordServerDiagnostic({
        level: 'warn',
        source: 'server',
        event: 'feedback.scheduler.error',
        message: err instanceof Error ? err.message : 'Scheduler check failed',
      });
    }
  };

  setInterval(() => {
    void checkAndDispatch();
  }, 60 * 60 * 1000).unref();
}
