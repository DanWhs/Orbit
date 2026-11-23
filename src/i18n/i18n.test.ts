import test from 'node:test';
import assert from 'node:assert/strict';
import { detectLocaleAndJurisdiction, getCachedDictionary } from './translations';
import { filterLegalSections, getLegalSections } from '../../server/legalContentServer';

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
    assert.ok(d.settingsBreadcrumbLabel.length > 0, `Missing settingsBreadcrumbLabel for ${lang}`);
    assert.ok(d.settingsTabAppearance.length > 0, `Missing settingsTabAppearance for ${lang}`);
    assert.ok(d.settingsTabExperience.length > 0, `Missing settingsTabExperience for ${lang}`);
    assert.ok(d.settingsTabQuickLinks.length > 0, `Missing settingsTabQuickLinks for ${lang}`);
    assert.ok(d.settingsTabAi.length > 0, `Missing settingsTabAi for ${lang}`);
    assert.ok(d.settingsTabPrivacy.length > 0, `Missing settingsTabPrivacy for ${lang}`);
    assert.equal(d.aiComingSoonTitle, 'coming soon...');
    assert.ok(d.aiComingSoonDesc.length > 20, `Missing aiComingSoonDesc for ${lang}`);
    assert.ok(d.standbyButtonLabel.length > 0, `Missing standbyButtonLabel for ${lang}`);
    assert.ok(d.weatherClear.length > 0, `Missing weatherClear for ${lang}`);
    assert.ok(d.themeSystem.length > 0, `Missing themeSystem for ${lang}`);
    assert.ok(d.alwaysShowIntroLabel.length > 0, `Missing alwaysShowIntroLabel for ${lang}`);
    assert.ok(d.betaTag.length > 0, `Missing betaTag for ${lang}`);
    assert.ok(d.standbyExitHint.length > 0, `Missing standbyExitHint for ${lang}`);
  }
  assert.ok(itDict.standbyExitHint.toLowerCase().includes('clicca'));
  assert.ok(getCachedDictionary('en', 'EU').standbyExitHint.toLowerCase().includes('click'));
});

test('2026 legal sections contain all 10 blocks (0..9), zero bullet points, accurate private open-source attribution, and keyword filtering', () => {
  for (const [lang, jur] of [
    ['it', 'IT'],
    ['en', 'EU'],
    ['fr', 'EU'],
    ['de', 'EU'],
    ['es', 'EU'],
  ] as const) {
    const sections = getLegalSections(lang, jur);
    assert.equal(sections.length, 10);
    const joined = sections.map((s) => `${s.title} ${s.body}`).join(' ');
    assert.ok(joined.includes('Daniele Mastrorilli'), `Expected Daniele Mastrorilli in ${lang}`);
    assert.ok(joined.includes('GitHub'), `Expected GitHub in ${lang}`);
    assert.ok(!joined.includes('Orbit Digital S.r.l.'), `Unexpected S.r.l. in ${lang}`);
    assert.ok(!joined.includes('IT12345678901'), `Unexpected fake VAT in ${lang}`);
    assert.ok(!joined.includes('orbitdigital@pec.it'), `Unexpected fake PEC in ${lang}`);
  }

  const itSections = getLegalSections('it', 'IT');
  for (const sec of itSections) {
    assert.ok(!sec.body.includes('•'), `Bullet character found in ${sec.id}`);
    assert.ok(!/^\s*[-*]\s+/m.test(sec.body), `Markdown bullet list found in ${sec.id}`);
  }

  const githubMatches = filterLegalSections(itSections, 'GitHub');
  assert.ok(githubMatches.some((s) => s.id === 'contatti-diretti'));

  const aiMatches = filterLegalSections(itSections, 'AI Act');
  assert.ok(aiMatches.some((s) => s.id === 'trasparenza-ai'));

  const ccpaMatches = filterLegalSections(itSections, 'CCPA');
  assert.ok(ccpaMatches.some((s) => s.id === 'requisiti-usa'));
});
