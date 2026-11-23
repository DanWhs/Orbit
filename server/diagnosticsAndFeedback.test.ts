import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearDiagnostics,
  getDiagnosticsSnapshot,
  recordServerDiagnostic,
  scrubSensitiveText,
} from './diagnostics.ts';
import {
  buildDailyDigestText,
  buildFeedbackRssXml,
  getRecipientFeedbackEmail,
  sanitizeFeedbackList,
  validateFeedbackInput,
} from './feedbackService.ts';

test('scrubSensitiveText redacts Gemini keys, Bearer tokens, and query secrets', () => {
  const raw = 'Failed auth AIzaSyA1234567890abcdefghijk token=supersecret123 Bearer abc.def.ghi';
  const scrubbed = scrubSensitiveText(raw);
  assert.ok(!scrubbed.includes('AIzaSyA1234567890'), 'Expected Gemini key redacted');
  assert.ok(!scrubbed.includes('supersecret123'), 'Expected token query param redacted');
  assert.ok(!scrubbed.includes('abc.def.ghi'), 'Expected Bearer token redacted');
  assert.ok(scrubbed.includes('[REDACTED]'));
});

test('server diagnostics ring buffer records, bounds, and resets entries', () => {
  clearDiagnostics();
  const item = recordServerDiagnostic({
    level: 'warn',
    source: 'network',
    event: 'unit.test.probe',
    message: 'Simulated slow route AIzaSyTestKeyShouldRedact9999',
    statusCode: 504,
    durationMs: 1920,
  });
  assert.equal(item.level, 'warn');
  assert.equal(item.statusCode, 504);
  assert.ok(!item.message.includes('ShouldRedact9999'));

  const snap = getDiagnosticsSnapshot();
  assert.ok(snap.entries.some((e) => e.event === 'unit.test.probe'));
  assert.ok(snap.totalRecorded >= 1);

  clearDiagnostics();
  const afterClear = getDiagnosticsSnapshot();
  assert.equal(afterClear.entries[0]?.event, 'diagnostics.cleared');
});

test('validateFeedbackInput enforces bounds and preserves clean optional contactEmail', () => {
  const badShort = validateFeedbackInput({ category: 'idea', rating: 5, message: 'hi' });
  assert.equal(badShort.ok, false);

  const badEmail = validateFeedbackInput({
    category: 'bug',
    rating: 2,
    message: 'Ring overlaps slightly on tiny watch screen',
    contactEmail: 'not-an-email',
  });
  assert.equal(badEmail.ok, false);

  const good = validateFeedbackInput({
    category: 'ux',
    rating: 5,
    message: 'The happy Orb on the Support showcase looks super clean!',
    contactEmail: 'user@example.com',
    lang: 'it',
  });
  assert.equal(good.ok, true);
  if (good.ok) {
    assert.equal(good.data.category, 'ux');
    assert.equal(good.data.rating, 5);
    assert.equal(good.data.contactEmail, 'user@example.com');
  }

  assert.equal(getRecipientFeedbackEmail(), 'mastrorillidaniel@gmail.com');
});

test('buildDailyDigestText and buildFeedbackRssXml aggregate entries cleanly with XML escaping', () => {
  const sample = sanitizeFeedbackList([
    {
      id: 'fb-1',
      createdAt: '2026-11-23T10:15:00.000Z',
      dayKey: '2026-11-23',
      category: 'praise',
      rating: 5,
      message: 'Love the <Orb> & fast diagnostics!',
      lang: 'en',
      includedInDigestAt: null,
    },
  ]);

  const digest = buildDailyDigestText(sample, '2026-11-23');
  assert.ok(digest.includes('2026-11-23'));
  assert.ok(digest.includes('PRAISE'));
  assert.ok(digest.includes('5/5'));

  const rss = buildFeedbackRssXml(sample, 'http://localhost:3000');
  assert.ok(rss.startsWith('<?xml version="1.0"'));
  assert.ok(rss.includes('<rss version="2.0">'));
  assert.ok(rss.includes('&lt;Orb&gt; &amp; fast diagnostics!'));
});
