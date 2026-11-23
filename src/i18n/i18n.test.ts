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
    assert.ok(d.settingsTabAccessibility.length > 0, `Missing settingsTabAccessibility for ${lang}`);
    assert.ok(d.settingsTabChangelog.length > 0, `Missing settingsTabChangelog for ${lang}`);
    assert.ok(d.settingsTabSupport.length > 0, `Missing settingsTabSupport for ${lang}`);
    assert.ok(d.settingsTabPrivacy.length > 0, `Missing settingsTabPrivacy for ${lang}`);
    assert.equal(d.aiComingSoonTitle, 'coming soon...');
    assert.ok(d.aiComingSoonDesc.length > 20, `Missing aiComingSoonDesc for ${lang}`);
    assert.ok(d.aiServerDisclaimer.length > 20, `Missing aiServerDisclaimer for ${lang}`);
    assert.ok(d.aiGuideTitle.length > 5, `Missing aiGuideTitle for ${lang}`);
    assert.ok(d.aiKeySecurityLayers.length > 20, `Missing aiKeySecurityLayers for ${lang}`);
    assert.ok(d.aiChatTitle.length > 0, `Missing aiChatTitle for ${lang}`);
    assert.ok(d.aiChatBackToSearch.length > 0, `Missing aiChatBackToSearch for ${lang}`);
    assert.ok(d.aiChatInputPlaceholder.length > 0, `Missing aiChatInputPlaceholder for ${lang}`);
    assert.ok(d.aiChatSendAria.length > 0, `Missing aiChatSendAria for ${lang}`);
    assert.ok(d.aiChatModeChat.length > 0, `Missing aiChatModeChat for ${lang}`);
    assert.ok(d.aiChatModeImage.length > 0, `Missing aiChatModeImage for ${lang}`);
    assert.ok(d.aiRoleAuto.length > 0 && d.aiRoleReasoning.length > 0, `Missing role labels for ${lang}`);
    assert.ok(d.aiImageUploadLabel.length > 0 && d.aiImagePlaceholder.length > 0, `Missing image keys for ${lang}`);
    assert.ok(d.menuButtonAria.length > 0, `Missing menuButtonAria for ${lang}`);
    assert.ok(d.menuSettingsItem.length > 0, `Missing menuSettingsItem for ${lang}`);
    assert.ok(d.menuSupportItem.length > 0, `Missing menuSupportItem for ${lang}`);
    assert.ok(d.settingsTabDiagnostics.length > 0, `Missing settingsTabDiagnostics for ${lang}`);
    assert.ok(d.settingsTabFeedback.length > 0, `Missing settingsTabFeedback for ${lang}`);
    assert.ok(d.diagSectionTitle.length > 0, `Missing diagSectionTitle for ${lang}`);
    assert.ok(d.fbSectionTitle.length > 0, `Missing fbSectionTitle for ${lang}`);
    assert.ok(d.a11yMotionLabel.length > 0, `Missing a11yMotionLabel for ${lang}`);
    assert.ok(d.a11yColorFilterLabel.length > 0, `Missing a11yColorFilterLabel for ${lang}`);
    assert.ok(d.a11yReduceTransparencyLabel.length > 0, `Missing a11yReduceTransparencyLabel for ${lang}`);
    assert.ok(d.supportLetterTitle.length > 5, `Missing supportLetterTitle for ${lang}`);
    assert.ok(d.supportLetterParagraphs.length >= 5, `Missing supportLetterParagraphs for ${lang}`);
    assert.equal(d.supportPillars.length, 0, `Expected 0 supportPillars (removed boxes) for ${lang}`);
    assert.ok(d.supportVoluntaryItalicPrefix.length > 5, `Missing supportVoluntaryItalicPrefix for ${lang}`);
    assert.ok(d.supportVoluntaryLegalLink.length > 3, `Missing supportVoluntaryLegalLink for ${lang}`);
    assert.ok(d.supportLegalLinkLabel.length > 5, `Missing supportLegalLinkLabel for ${lang}`);
    assert.ok(d.changelogEntries.length >= 4, `Expected >= 4 changelog entries for ${lang}`);
    assert.equal(d.changelogEntries[0].version, 'v2.6.0', `Expected latest v2.6.0 changelog for ${lang}`);
    assert.ok(d.donationPopupTitle.length > 5, `Missing donationPopupTitle for ${lang}`);
    assert.ok(d.standbyButtonLabel.length > 0, `Missing standbyButtonLabel for ${lang}`);
    assert.ok(d.weatherClear.length > 0, `Missing weatherClear for ${lang}`);
    assert.ok(d.themeSystem.length > 0, `Missing themeSystem for ${lang}`);
    assert.ok(d.alwaysShowIntroLabel.length > 0, `Missing alwaysShowIntroLabel for ${lang}`);
    assert.ok(d.betaTag.length > 0, `Missing betaTag for ${lang}`);
    assert.ok(d.standbyExitHint.length > 0, `Missing standbyExitHint for ${lang}`);
  }
  assert.ok(itDict.supportLetterParagraphs.some((p) => p.toLowerCase().includes('caffè')));
  assert.ok(itDict.standbyExitHint.toLowerCase().includes('clicca'));
  assert.ok(getCachedDictionary('en', 'EU').standbyExitHint.toLowerCase().includes('click'));
});

test('2026 legal sections contain all 11 blocks (0..10), zero bullet points, accurate private attribution & voluntary donation citations, and keyword filtering', () => {
  for (const [lang, jur] of [
    ['it', 'IT'],
    ['en', 'EU'],
    ['fr', 'EU'],
    ['de', 'EU'],
    ['es', 'EU'],
  ] as const) {
    const sections = getLegalSections(lang, jur);
    assert.equal(sections.length, 11);
    const joined = sections.map((s) => `${s.title} ${s.body}`).join(' ');
    assert.ok(joined.includes('Daniele Mastrorilli'), `Expected Daniele Mastrorilli in ${lang}`);
    assert.ok(joined.includes('GitHub'), `Expected GitHub in ${lang}`);
    assert.ok(!joined.includes('Orbit Digital S.r.l.'), `Unexpected S.r.l. in ${lang}`);
    assert.ok(!joined.includes('IT12345678901'), `Unexpected fake VAT in ${lang}`);
    assert.ok(!joined.includes('orbitdigital@pec.it'), `Unexpected fake PEC in ${lang}`);

    const donationsSec = sections.find((s) => s.id === 'donazioni-volontarie');
    assert.ok(donationsSec, `Expected donazioni-volontarie section for ${lang}`);
    assert.equal(donationsSec.number, '10');
    assert.ok(donationsSec.body.includes('769'), `Expected Art. 769 c.c. in ${lang}`);
    assert.ok(donationsSec.body.includes('783'), `Expected Art. 783 c.c. in ${lang}`);
    assert.ok(donationsSec.body.includes('2011/83'), `Expected Directive 2011/83 in ${lang}`);

    for (const sec of sections) {
      assert.ok(!sec.body.includes('•'), `Bullet character found in ${sec.id} (${lang})`);
      assert.ok(!/^\s*[-*]\s+/m.test(sec.body), `Markdown bullet list found in ${sec.id} (${lang})`);
    }
  }

  const itSections = getLegalSections('it', 'IT');

  const githubMatches = filterLegalSections(itSections, 'GitHub');
  assert.ok(githubMatches.some((s) => s.id === 'contatti-diretti'));

  const aiMatches = filterLegalSections(itSections, 'AI Act');
  assert.ok(aiMatches.some((s) => s.id === 'trasparenza-ai'));

  const ccpaMatches = filterLegalSections(itSections, 'CCPA');
  assert.ok(ccpaMatches.some((s) => s.id === 'requisiti-usa'));

  const donationMatches = filterLegalSections(itSections, '783');
  assert.ok(donationMatches.some((s) => s.id === 'donazioni-volontarie'));
});
