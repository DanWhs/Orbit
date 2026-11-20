import test from 'node:test';
import assert from 'node:assert/strict';
import { detectLocaleAndJurisdiction, getCachedDictionary } from './translations';
import { filterLegalSections, getLegalSections } from './legalContent';

test('auto-detection maps browser language and timezone to IT, EU, UK, US, and Global jurisdictions', () => {
  assert.equal(detectLocaleAndJurisdiction('it-IT', 'Europe/Rome').id, 'it-IT');
  assert.equal(detectLocaleAndJurisdiction('en-GB', 'Europe/London').id, 'en-UK');
  assert.equal(detectLocaleAndJurisdiction('en-US', 'America/New_York').id, 'en-US');
  assert.equal(detectLocaleAndJurisdiction('fr-FR', 'Europe/Paris').id, 'fr-EU');
  assert.equal(detectLocaleAndJurisdiction('de-DE', 'Europe/Berlin').id, 'de-EU');
  assert.equal(detectLocaleAndJurisdiction('pt-BR', 'America/Sao_Paulo').id, 'en-GLOBAL');
});

test('translation cache returns synchronous dictionaries without network calls', () => {
  const itDict = getCachedDictionary('it', 'IT');
  const usDict = getCachedDictionary('en', 'US');
  assert.ok(itDict.footerLegalLink.length > 0);
  assert.ok(usDict.usDoNotSellLabel.includes('Do Not Sell'));

  for (const [lang, jur] of [
    ['it', 'IT'],
    ['en', 'EU'],
    ['fr', 'EU'],
    ['de', 'EU'],
    ['es', 'EU'],
  ] as const) {
    const d = getCachedDictionary(lang, jur);
    assert.ok(d.cookieNoticeTitle.length > 0, `Missing cookieNoticeTitle for ${lang}`);
    assert.ok(d.cookieNoticeBody.length > 0, `Missing cookieNoticeBody for ${lang}`);
    assert.ok(d.settingsCookieTitle.length > 0, `Missing settingsCookieTitle for ${lang}`);
    assert.ok(d.clearHistoryLabel.length > 0, `Missing clearHistoryLabel for ${lang}`);
    assert.ok(d.settingsSupportButton.length > 0, `Missing settingsSupportButton for ${lang}`);
    assert.ok(d.supportModalTitle.length > 0, `Missing supportModalTitle for ${lang}`);
    assert.ok(d.supportDonateCta.length > 0, `Missing supportDonateCta for ${lang}`);
  }
});

test('2026 legal sections contain all 10 blocks (0..9), zero bullet points, and accurate keyword filtering', () => {
  const itSections = getLegalSections('it', 'IT');
  assert.equal(itSections.length, 10);
  for (const sec of itSections) {
    assert.ok(!sec.body.includes('•'), `Bullet character found in ${sec.id}`);
    assert.ok(!/^\s*[-*]\s+/m.test(sec.body), `Markdown bullet list found in ${sec.id}`);
  }

  const pecMatches = filterLegalSections(itSections, 'PEC');
  assert.ok(pecMatches.some((s) => s.id === 'contatti-diretti'));

  const aiMatches = filterLegalSections(itSections, 'AI Act');
  assert.ok(aiMatches.some((s) => s.id === 'trasparenza-ai'));

  const ccpaMatches = filterLegalSections(itSections, 'CCPA');
  assert.ok(ccpaMatches.some((s) => s.id === 'requisiti-usa'));
});
