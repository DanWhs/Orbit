import {
  ChangelogEntry,
  JurisdictionCode,
  LanguageCode,
  LocaleRegionOption,
  SupportPillar,
} from '../types/orbit';
import { readStorage, STORAGE_KEYS, writeStorage } from '../utils/storage';

export interface UiDictionary {
  searchPlaceholder: string;
  searchAriaLabel: string;
  searchSubmitAria: string;
  clearHistoryLabel: string;
  settingsAria: string;
  settingsTitle: string;
  settingsBreadcrumbLabel: string;
  settingsSubtitle: string;
  settingsTabAppearance: string;
  settingsTabExperience: string;
  settingsTabQuickLinks: string;
  settingsTabAi: string;
  settingsTabAccessibility: string;
  settingsTabChangelog: string;
  settingsTabSupport: string;
  settingsTabPrivacy: string;
  themeLabel: string;
  themeSystem: string;
  themeDark: string;
  themeLight: string;
  accentLabel: string;
  accentCustomLabel: string;
  accentCustomHint: string;
  betaTag: string;
  introSectionLabel: string;
  alwaysShowIntroLabel: string;
  alwaysShowIntroHint: string;
  languageRegionSectionLabel: string;
  quickLinksLabel: string;
  quickLinksLimitNote: string;
  quickLinkTitlePlaceholder: string;
  quickLinkUrlPlaceholder: string;
  addQuickLink: string;
  saveChanges: string;
  cancelEdit: string;
  editLabel: string;
  deleteLabel: string;
  resetDefaults: string;
  invalidQuickLink: string;
  closeModal: string;
  footerPrefix: string;
  footerLegalLink: string;
  regionSelectorAria: string;
  legalModalTitle: string;
  legalBreadcrumbLabel: string;
  legalJurisdictionBadge: string;
  legalSearchPlaceholder: string;
  legalSearchClear: string;
  legalSearchResultsCount: string;
  legalNoMatches: string;
  legalTocTitle: string;
  cookieStatusLabel: string;
  cookieStatusEssentialOnly: string;
  cookieStatusAllAccepted: string;
  cookieStatusCustom: string;
  cookieAcceptAll: string;
  cookieRejectAll: string;
  cookieCustomize: string;
  cookieSaveCustom: string;
  cookieFunctionalToggle: string;
  cookieAnalyticsToggle: string;
  cookieRevisitHint: string;
  usDoNotSellLabel: string;
  usDoNotSellActive: string;
  usDoNotSellInactive: string;
  usGpcDetected: string;
  usGpcNotDetected: string;
  cookieNoticeBadge: string;
  cookieNoticeTitle: string;
  cookieNoticeBody: string;
  cookieNoticeOpenPolicy: string;
  settingsCookieTitle: string;
  settingsCookieSubtitle: string;
  botAriaLabel: string;
  aiComingSoonTitle: string;
  aiComingSoonDesc: string;
  aiServerDisclaimer: string;
  aiGuideTitle: string;
  aiGuideStep1: string;
  aiGuideStep2: string;
  aiGuideStep3: string;
  aiGuideOpenStudio: string;
  aiKeyLabel: string;
  aiKeyPlaceholder: string;
  aiKeySaveBtn: string;
  aiKeySaving: string;
  aiKeyConnectedLabel: string;
  aiKeyDisconnectBtn: string;
  aiKeyRememberDevice: string;
  aiKeySecurityLayers: string;
  aiKeyInvalidError: string;
  aiAskOrbBtn: string;
  aiAskOrbAria: string;
  aiAnswerTitle: string;
  aiAnswerClose: string;
  aiAnswerLoading: string;
  aiAnswerNeedKey: string;
  aiChatTitle: string;
  aiChatBackToSearch: string;
  aiChatInputPlaceholder: string;
  aiChatSendAria: string;
  aiChatModeChat: string;
  aiChatModeImage: string;
  aiRoleLabel: string;
  aiRoleAuto: string;
  aiRoleAssistant: string;
  aiRoleFast: string;
  aiRoleInteractive: string;
  aiRoleReasoning: string;
  aiImagePlaceholder: string;
  aiImageUploadLabel: string;
  aiImageClearUpload: string;
  aiImageEditBtn: string;
  aiImageDownloadBtn: string;
  aiImageLoading: string;
  aiImageEditingBanner: string;
  aiImageRatioLabel: string;
  a11ySectionTitle: string;
  a11yMotionLabel: string;
  a11yMotionSystem: string;
  a11yMotionReduce: string;
  a11yMotionFull: string;
  a11yHighContrastLabel: string;
  a11yHighContrastDesc: string;
  a11yLargeTextLabel: string;
  a11yLargeTextDesc: string;
  a11yFocusRingsLabel: string;
  a11yFocusRingsDesc: string;
  a11yKeyboardHint: string;
  supportLetterTitle: string;
  supportLetterParagraphs: string[];
  supportPillars: SupportPillar[];
  supportLegalLinkLabel: string;
  changelogSectionTitle: string;
  changelogSubtitle: string;
  changelogCurrentTag: string;
  changelogEntries: ChangelogEntry[];
  donationPopupBadge: string;
  donationPopupTitle: string;
  donationPopupBody: string;
  donationPopupCtaCoffee: string;
  donationPopupCtaOpenSection: string;
  donationPopupLater: string;
  donationPopupNever: string;
  donationPopupLegalLink: string;
  standbyButtonLabel: string;
  standbyAriaLabel: string;
  standbyExitHint: string;
  weatherClear: string;
  weatherCloudy: string;
  weatherFog: string;
  weatherRain: string;
  weatherSnow: string;
  weatherStorm: string;
}

export const LOCALE_REGION_OPTIONS: LocaleRegionOption[] = [
  { id: 'it-IT', lang: 'it', jurisdiction: 'IT', shortLabel: 'IT · Italiano', fullLabel: 'Italia (IT · GDPR)' },
  { id: 'en-EU', lang: 'en', jurisdiction: 'EU', shortLabel: 'EU · English', fullLabel: 'European Union (GDPR)' },
  { id: 'en-UK', lang: 'en', jurisdiction: 'UK', shortLabel: 'UK · English', fullLabel: 'United Kingdom (UK GDPR)' },
  { id: 'en-US', lang: 'en', jurisdiction: 'US', shortLabel: 'US · English', fullLabel: 'United States (CCPA/CPRA)' },
  { id: 'fr-EU', lang: 'fr', jurisdiction: 'EU', shortLabel: 'EU · Français', fullLabel: 'France / UE (RGPD)' },
  { id: 'de-EU', lang: 'de', jurisdiction: 'EU', shortLabel: 'EU · Deutsch', fullLabel: 'Deutschland / EU (DSGVO)' },
  { id: 'es-EU', lang: 'es', jurisdiction: 'EU', shortLabel: 'EU · Español', fullLabel: 'España / UE (RGPD)' },
  { id: 'en-GLOBAL', lang: 'en', jurisdiction: 'GLOBAL', shortLabel: 'Global · EN', fullLabel: 'Rest of World (LGPD/PIPEDA)' },
];

const DICTIONARIES: Record<LanguageCode, UiDictionary> = {
  it: {
    searchPlaceholder: 'Cerca o scrivi un indirizzo',
    searchAriaLabel: 'Cerca o scrivi un indirizzo web',
    searchSubmitAria: 'Avvia ricerca',
    clearHistoryLabel: 'Cancella cronologia',
    settingsAria: 'Apri impostazioni',
    settingsTitle: 'Impostazioni Orbit',
    settingsBreadcrumbLabel: 'impostazioni',
    settingsSubtitle: 'Personalizza aspetto, esperienza d’avvio, collegamenti rapidi e privacy.',
    settingsTabAppearance: 'Aspetto',
    settingsTabExperience: 'Esperienza',
    settingsTabQuickLinks: 'Link rapidi',
    settingsTabAi: 'Features AI',
    settingsTabAccessibility: 'Accessibilità',
    settingsTabChangelog: 'Changelog',
    settingsTabSupport: 'Supporta Orb',
    settingsTabPrivacy: 'Privacy',
    themeLabel: 'Tema interfaccia',
    themeSystem: 'In base al dispositivo',
    themeDark: 'Scuro',
    themeLight: 'Chiaro',
    accentLabel: 'Colore di accento Fluo',
    accentCustomLabel: 'Colore personalizzato',
    accentCustomHint: 'Scegli qualsiasi tonalità per Orbit e i dettagli dell’interfaccia.',
    betaTag: 'BETA',
    introSectionLabel: 'Avvio e animazione',
    alwaysShowIntroLabel: 'Mostra sempre intro',
    alwaysShowIntroHint: 'Dopo il primo accesso e la scelta dei cookie l’intro si disattiva. Attiva per vederla ad ogni apertura.',
    languageRegionSectionLabel: 'Lingua e area legale',
    quickLinksLabel: 'Collegamenti rapidi',
    quickLinksLimitNote: 'Massimo 4 link rapidi sotto la barra di ricerca',
    quickLinkTitlePlaceholder: 'Titolo (es. GitHub)',
    quickLinkUrlPlaceholder: 'URL (es. https://github.com)',
    addQuickLink: 'Aggiungi link',
    saveChanges: 'Salva modifica',
    cancelEdit: 'Annulla',
    editLabel: 'Modifica',
    deleteLabel: 'Rimuovi',
    resetDefaults: 'Ripristina predefiniti',
    invalidQuickLink: 'Inserisci un titolo valido e un URL corretto (es. example.com).',
    closeModal: 'Chiudi pannello',
    footerPrefix: 'Utilizzando questo servizio accetti le nostre',
    footerLegalLink: 'Note Legali e Informativa Privacy',
    regionSelectorAria: 'Seleziona lingua e giurisdizione legale',
    legalModalTitle: 'Note Legali, Privacy e Conformità 2026',
    legalBreadcrumbLabel: 'Note legali',
    legalJurisdictionBadge: 'Giurisdizione attiva',
    legalSearchPlaceholder: 'Cerca nel documento (es. cookie, donazioni, GitHub, AI, CCPA)...',
    legalSearchClear: 'Pulisci ricerca',
    legalSearchResultsCount: 'sezioni corrispondenti',
    legalNoMatches: 'Nessuna sezione corrisponde alla parola chiave cercata.',
    legalTocTitle: 'Indice delle sezioni',
    cookieStatusLabel: 'Stato consenso attuale',
    cookieStatusEssentialOnly: 'Solo archiviazione tecnica necessaria (script esterni bloccati preventivamente)',
    cookieStatusAllAccepted: 'Tutti i servizi funzionali e analitici abilitati',
    cookieStatusCustom: 'Preferenze personalizzate salvate',
    cookieAcceptAll: 'Accetta tutti',
    cookieRejectAll: 'Rifiuta non essenziali',
    cookieCustomize: 'Personalizza scelte',
    cookieSaveCustom: 'Salva preferenze',
    cookieFunctionalToggle: 'Suggerimenti di ricerca esterni (DuckDuckGo / Google Suggest)',
    cookieAnalyticsToggle: 'Diagnostica anonima locale',
    cookieRevisitHint: 'Puoi modificare o revocare le tue scelte in qualsiasi momento da questo pannello senza alcuna penalizzazione.',
    usDoNotSellLabel: 'Do Not Sell or Share My Personal Information (Opt-Out USA)',
    usDoNotSellActive: 'Attivo — Nessuna vendita o condivisione consentita',
    usDoNotSellInactive: 'Disattivo — Clicca per attivare Opt-Out',
    usGpcDetected: 'Segnale browser Global Privacy Control (GPC) rilevato e rispettato automaticamente.',
    usGpcNotDetected: 'Segnale browser Global Privacy Control (GPC) non rilevato; supporto attivo.',
    cookieNoticeBadge: 'Orb · Privacy 2026',
    cookieNoticeTitle: 'Prima di iniziare, scegli le tue preferenze sui cookie',
    cookieNoticeBody: 'Orb usa lo storage locale necessario per tema, colore e link rapidi. Puoi attivare i suggerimenti esterni e la diagnostica anonima ora o modificarli quando vuoi nelle Impostazioni.',
    cookieNoticeOpenPolicy: 'Leggi informativa completa',
    settingsCookieTitle: 'Preferenze Cookie e Privacy',
    settingsCookieSubtitle: 'Modifica in qualsiasi momento le scelte sui cookie salvate localmente.',
    botAriaLabel: 'Assistente Orbit interattivo, clicca per una reazione',
    aiComingSoonTitle: 'coming soon...',
    aiComingSoonDesc:
      'Orb non sarà più soltanto una mascotte interattiva, ma diventerà anche un vero segretario personale e aiutante intelligente in tutte le tue attività quotidiane, conversazioni multi-turno e creazione immagini.',
    aiServerDisclaimer:
      'Al momento Orbit non possiede un proprio server dedicato per ospitare un modello AI proprietario. Tutte le funzioni Gemini (chat multi-ruolo e creazione/modifica immagini) utilizzano esclusivamente la tua API key personale: nessun collegamento diretto a chiavi condivise.',
    aiGuideTitle: 'Guida ufficiale per ottenere e collegare Gemini',
    aiGuideStep1: '1. Apri Google AI Studio con il tuo account Google e accetta i termini.',
    aiGuideStep2: '2. Clicca su "Create API key" per generare la tua chiave personale Gemini.',
    aiGuideStep3: '3. Incolla qui la chiave: viene protetta con 5 livelli crittografici (Split-XOR + AES-256-GCM + ChaCha20-Poly1305 + HMAC-SHA256 in cookie HttpOnly isolato).',
    aiGuideOpenStudio: 'Apri Google AI Studio (ufficiale)',
    aiKeyLabel: 'La tua API key personale di Gemini',
    aiKeyPlaceholder: 'AIzaSy...',
    aiKeySaveBtn: 'Cifra e collega chiave',
    aiKeySaving: 'Cifratura e salvataggio...',
    aiKeyConnectedLabel: 'Chiave Gemini cifrata attiva (5 livelli)',
    aiKeyDisconnectBtn: 'Rimuovi e distruggi chiave',
    aiKeyRememberDevice: 'Conserva copia locale frammentata e cifrata (Web Crypto + PBKDF2)',
    aiKeySecurityLayers: 'Protezione a 5 livelli: frammentazione Split-XOR, cascata AES-256-GCM + ChaCha20-Poly1305, HMAC-SHA256 e cookie HttpOnly Partitioned; busta di trasporto offuscata e zero chiavi in chiaro.',
    aiKeyInvalidError: 'Formato chiave API non valido. Controlla di aver copiato l’intera chiave da Google AI Studio.',
    aiAskOrbBtn: 'Chiedi a Orb',
    aiAskOrbAria: 'Chiedi risposta AI a Orb tramite Gemini',
    aiAnswerTitle: 'Risposta Orb AI',
    aiAnswerClose: 'Chiudi risposta AI',
    aiAnswerLoading: 'Orb sta elaborando con Gemini...',
    aiAnswerNeedKey: 'Collega la tua API key personale di Gemini in Impostazioni -> Features AI (BETA) per usare chat e immagini.',
    aiChatTitle: 'Orb AI',
    aiChatBackToSearch: 'Torna alla ricerca',
    aiChatInputPlaceholder: 'Scrivi un messaggio a Orb...',
    aiChatSendAria: 'Invia messaggio a Orb AI',
    aiChatModeChat: 'Chat',
    aiChatModeImage: 'Immagini',
    aiRoleLabel: 'Ruolo & Modello',
    aiRoleAuto: 'Auto',
    aiRoleAssistant: 'Generale · Hydrogen',
    aiRoleFast: 'Rapido · Flash Lite',
    aiRoleInteractive: 'Interattivo · Neon',
    aiRoleReasoning: 'Ragionamento · Carbon',
    aiImagePlaceholder: 'Descrivi un’immagine da creare o come modificare quella allegata...',
    aiImageUploadLabel: 'Carica immagine da modificare',
    aiImageClearUpload: 'Rimuovi allegato',
    aiImageEditBtn: 'Modifica immagine',
    aiImageDownloadBtn: 'Scarica',
    aiImageLoading: 'Generazione con Nano Banana 2.1...',
    aiImageEditingBanner: 'Modalità modifica immagine attiva',
    aiImageRatioLabel: 'Formato',
    a11ySectionTitle: 'Accessibilità e Navigazione',
    a11yMotionLabel: 'Movimento e animazioni',
    a11yMotionSystem: 'Sistema',
    a11yMotionReduce: 'Riduci animazioni',
    a11yMotionFull: 'Complete',
    a11yHighContrastLabel: 'Contrasto elevato',
    a11yHighContrastDesc: 'Aumenta il contrasto di bordi, pulsanti e testi secondari su temi chiari e scuri.',
    a11yLargeTextLabel: 'Testo ingrandito',
    a11yLargeTextDesc: 'Scala la leggibilità di pannelli, impostazioni, note legali e suggerimenti.',
    a11yFocusRingsLabel: 'Indicatori di focus evidenti',
    a11yFocusRingsDesc: 'Evidenzia con contorno ad alto contrasto l’elemento selezionato tramite tasto Tab.',
    a11yKeyboardHint: 'Ordine di tabulazione semantico (tabindex) attivo su tutta la pagina, barra, collegamenti e pannelli.',
    supportLetterTitle: 'Un messaggio da Orb',
    supportLetterParagraphs: [
      'Ehi, allora...',
      'Sono Orb. Un minuscolo essere sferico vivente con un’immaginazione fin troppo grande e piani MOLTO ambiziosi.',
      'Stiamo costruendo qualcosa di GRANDE: nuove idee, progetti folli e un intero universo di possibilità.',
      'Purtroppo i sogni non vanno avanti a magia. (Ci ho provato.)',
      'Offrimi un caffè e aiutami a finanziare la mia discutibile esistenza, così posso continuare a essere un piccolo Orb vivente.',
      'Resta orb-some. 💜',
    ],
    supportPillars: [
      {
        title: 'Zero pubblicità',
        desc: 'Nessun tracker invasivo o banner: l’interfaccia resta leggera e tua.',
      },
      {
        title: 'Mascotte vivente',
        desc: 'Animazioni fluide, audio procedurale e nuove espressioni interattive.',
      },
      {
        title: 'Futuro Orb AI',
        desc: 'Finanzia ricerca, sviluppo e futuri server dedicati al progetto.',
      },
    ],
    supportLegalLinkLabel: 'Leggi la sezione legale sulle donazioni volontarie',
    changelogSectionTitle: 'Cronologia delle versioni',
    changelogSubtitle: 'Scopri cosa è stato aggiunto e migliorato in Orbit nel tempo.',
    changelogCurrentTag: 'Attuale',
    changelogEntries: [
      {
        version: 'v2.5.0',
        dateLabel: 'Novembre 2026',
        title: 'Gemini Studio Multi-Modello, VFX & Smart Home',
        isCurrent: true,
        items: [
          'Chatbot multi-turno con selezione ruolo/modello: Gemini 4 Carbon (ragionamento), Gemini 4 Neon (interattivo), Gemini 4 Hydrogen (generale) e Gemini 3.1 Flash Lite (veloce).',
          'Creazione e modifica immagini direttamente in chat con Gemini Nano Banana 2.1 usando esclusivamente la tua API key personale.',
          'Cassaforte API key potenziata a 5 livelli crittografici (Split-XOR, cascata AES-256-GCM + ChaCha20-Poly1305, HMAC-SHA256, frammentazione browser e trasporto offuscato).',
          'Sfondo con bagliore accento leggermente animato e più trasparente, nuovi VFX sulla pagina Supporta Orb tradotta in 5 lingue, layout adattivo per display Smart Home e Changelog nelle impostazioni.',
        ],
      },
      {
        version: 'v2.4.0',
        dateLabel: 'Novembre 2026',
        title: 'Vista Chatbot dedicata & Accessibilità',
        items: [
          'Vista conversazione affiancata ad Orb con freccia di ritorno alla ricerca.',
          'Controlli di accessibilità completi (riduzione movimento, testo grande, alto contrasto, focus ring) e tabindex su tutta l’interfaccia.',
          'Sezione Supporta Orb e informativa legale sulle donazioni volontarie.',
        ],
      },
      {
        version: 'v2.3.0',
        dateLabel: 'Ottobre 2026',
        title: 'Modalità Standby Desktop & Link Rapidi',
        items: [
          'Modalità Standby con orologio gigante, data e meteo locale senza ripetizioni.',
          'Animazioni idle ed espressioni reattive alla digitazione con motore server-side.',
          'Aggiornamento link rapidi predefiniti con Threads e Instagram.',
        ],
      },
      {
        version: 'v2.0.0',
        dateLabel: 'Settembre 2026',
        title: 'Orbit Design System & Conformità 2026',
        items: [
          'Nuova estetica vetro satinato, 10 colori Fluo + picker personalizzato BETA.',
          'Note legali multigiurisdizione (IT/UE/UK/US/Global) ricercabili istantaneamente.',
        ],
      },
    ],
    donationPopupBadge: 'Supporta il progetto Orbit',
    donationPopupTitle: 'Ti sta piacendo l’esperienza su Orbit?',
    donationPopupBody: 'Orbit è gratuito, senza pubblicità e open-source. Se ti piace usarlo ogni giorno, considera una donazione volontaria per aiutare lo sviluppo futuro di Orb.',
    donationPopupCtaCoffee: 'Buy me a coffee',
    donationPopupCtaOpenSection: 'Scopri perché',
    donationPopupLater: 'Più tardi',
    donationPopupNever: 'Non mostrare più',
    donationPopupLegalLink: 'Nota legale sulle donazioni volontarie',
    standbyButtonLabel: 'Modalità standby',
    standbyAriaLabel: 'Attiva modalità standby desktop',
    standbyExitHint: 'Clicca per uscire',
    weatherClear: 'Sereno',
    weatherCloudy: 'Nuvoloso',
    weatherFog: 'Nebbia',
    weatherRain: 'Pioggia',
    weatherSnow: 'Neve',
    weatherStorm: 'Temporale',
  },
  en: {
    searchPlaceholder: 'Search or enter a web address',
    searchAriaLabel: 'Search or enter a web address',
    searchSubmitAria: 'Submit search',
    clearHistoryLabel: 'Clear history',
    settingsAria: 'Open settings',
    settingsTitle: 'Orbit Settings',
    settingsBreadcrumbLabel: 'settings',
    settingsSubtitle: 'Customize appearance, startup experience, quick links, and privacy.',
    settingsTabAppearance: 'Appearance',
    settingsTabExperience: 'Experience',
    settingsTabQuickLinks: 'Quick Links',
    settingsTabAi: 'AI Features',
    settingsTabAccessibility: 'Accessibility',
    settingsTabChangelog: 'Changelog',
    settingsTabSupport: 'Support Orb',
    settingsTabPrivacy: 'Privacy',
    themeLabel: 'Interface Theme',
    themeSystem: 'Match device',
    themeDark: 'Dark',
    themeLight: 'Light',
    accentLabel: 'Fluo Accent Color',
    accentCustomLabel: 'Custom color',
    accentCustomHint: 'Pick any hue for Orbit and interface highlights.',
    betaTag: 'BETA',
    introSectionLabel: 'Startup & Animation',
    alwaysShowIntroLabel: 'Always show intro',
    alwaysShowIntroHint: 'After your first visit and cookie choice, the intro turns off automatically. Enable to show it every time.',
    languageRegionSectionLabel: 'Language & Region',
    quickLinksLabel: 'Quick Links',
    quickLinksLimitNote: 'Up to 4 quick links displayed below the search bar',
    quickLinkTitlePlaceholder: 'Title (e.g. GitHub)',
    quickLinkUrlPlaceholder: 'URL (e.g. https://github.com)',
    addQuickLink: 'Add Link',
    saveChanges: 'Save Changes',
    cancelEdit: 'Cancel',
    editLabel: 'Edit',
    deleteLabel: 'Remove',
    resetDefaults: 'Reset Defaults',
    invalidQuickLink: 'Please enter a valid title and web address (e.g. example.com).',
    closeModal: 'Close modal',
    footerPrefix: 'By using this service you agree to our',
    footerLegalLink: 'Legal Notice & Privacy Policy',
    regionSelectorAria: 'Select language and legal jurisdiction',
    legalModalTitle: 'Legal Notice, Privacy & 2026 Compliance',
    legalBreadcrumbLabel: 'Legal Notice',
    legalJurisdictionBadge: 'Active Jurisdiction',
    legalSearchPlaceholder: 'Search document (e.g. cookie, donations, GitHub, AI, CCPA)...',
    legalSearchClear: 'Clear search',
    legalSearchResultsCount: 'matching sections',
    legalNoMatches: 'No legal sections match your search query.',
    legalTocTitle: 'Table of Contents',
    cookieStatusLabel: 'Current consent status',
    cookieStatusEssentialOnly: 'Strictly necessary local storage only (external requests blocked preventively)',
    cookieStatusAllAccepted: 'All functional and diagnostic preferences enabled',
    cookieStatusCustom: 'Custom preferences saved',
    cookieAcceptAll: 'Accept All',
    cookieRejectAll: 'Reject Non-Essential',
    cookieCustomize: 'Customize Choices',
    cookieSaveCustom: 'Save Preferences',
    cookieFunctionalToggle: 'External search autocomplete suggestions (DuckDuckGo / Google Suggest)',
    cookieAnalyticsToggle: 'Local diagnostic metrics',
    cookieRevisitHint: 'You may review, modify, or withdraw your consent at any time from this panel with zero friction.',
    usDoNotSellLabel: 'Do Not Sell or Share My Personal Information (US Opt-Out)',
    usDoNotSellActive: 'Active — No selling or sharing permitted',
    usDoNotSellInactive: 'Inactive — Click to enable Opt-Out',
    usGpcDetected: 'Browser Global Privacy Control (GPC) signal detected and automatically honored.',
    usGpcNotDetected: 'Browser Global Privacy Control (GPC) signal not detected; automatic honoring active.',
    cookieNoticeBadge: 'Orb · Privacy 2026',
    cookieNoticeTitle: 'Before we start, choose your cookie preferences',
    cookieNoticeBody: 'Orb uses strictly necessary local storage for theme, accent color, and quick links. You can enable external suggestions and local diagnostics now or change them anytime in Settings.',
    cookieNoticeOpenPolicy: 'Read full privacy policy',
    settingsCookieTitle: 'Cookie & Privacy Preferences',
    settingsCookieSubtitle: 'Update your locally saved cookie preferences at any time.',
    botAriaLabel: 'Interactive Orbit mascot, click for a reaction',
    aiComingSoonTitle: 'coming soon...',
    aiComingSoonDesc:
      'Orb will evolve beyond being just an interactive mascot — becoming a personal secretary and dedicated assistant across multi-turn conversations, image creation, and daily searches.',
    aiServerDisclaimer:
      'Orbit does not currently operate its own dedicated server to host a proprietary AI model. All Gemini features (multi-role chat and image creation/editing) run strictly with your own personal API key — never connected to any shared key.',
    aiGuideTitle: 'Official guide to connect Google Gemini',
    aiGuideStep1: '1. Open Google AI Studio with your Google account and accept the API terms.',
    aiGuideStep2: '2. Click "Create API key" to generate your personal Gemini key.',
    aiGuideStep3: '3. Paste it below: it is sealed across 5 cryptographic layers (Split-XOR + AES-256-GCM + ChaCha20-Poly1305 + HMAC-SHA256 in an isolated HttpOnly cookie).',
    aiGuideOpenStudio: 'Open Google AI Studio (official)',
    aiKeyLabel: 'Your personal Gemini API key',
    aiKeyPlaceholder: 'AIzaSy...',
    aiKeySaveBtn: 'Encrypt & connect key',
    aiKeySaving: 'Encrypting & saving...',
    aiKeyConnectedLabel: '5-layer encrypted Gemini key active',
    aiKeyDisconnectBtn: 'Disconnect & wipe key',
    aiKeyRememberDevice: 'Keep split-shard encrypted device backup (Web Crypto + PBKDF2)',
    aiKeySecurityLayers: '5-layer vault: Split-XOR share blinding, AES-256-GCM + ChaCha20-Poly1305 cascade, HMAC-SHA256 commitment, obfuscated transport shards, and an HttpOnly Partitioned cookie.',
    aiKeyInvalidError: 'Invalid API key format. Make sure you copied the full key from Google AI Studio.',
    aiAskOrbBtn: 'Ask Orb',
    aiAskOrbAria: 'Ask Orb AI powered by Gemini',
    aiAnswerTitle: 'Orb AI Answer',
    aiAnswerClose: 'Close AI answer',
    aiAnswerLoading: 'Orb is thinking with Gemini...',
    aiAnswerNeedKey: 'Connect your personal Gemini API key under Settings -> AI Features (BETA) to use chat & images.',
    aiChatTitle: 'Orb AI',
    aiChatBackToSearch: 'Back to search',
    aiChatInputPlaceholder: 'Message Orb...',
    aiChatSendAria: 'Send message to Orb AI',
    aiChatModeChat: 'Chat',
    aiChatModeImage: 'Images',
    aiRoleLabel: 'Role & Model',
    aiRoleAuto: 'Auto',
    aiRoleAssistant: 'General · Hydrogen',
    aiRoleFast: 'Fast · Flash Lite',
    aiRoleInteractive: 'Interactive · Neon',
    aiRoleReasoning: 'Deep · Carbon',
    aiImagePlaceholder: 'Describe an image to create or how to edit the attached one...',
    aiImageUploadLabel: 'Upload image to edit',
    aiImageClearUpload: 'Remove attachment',
    aiImageEditBtn: 'Edit image',
    aiImageDownloadBtn: 'Download',
    aiImageLoading: 'Generating with Nano Banana 2.1...',
    aiImageEditingBanner: 'Image editing mode active',
    aiImageRatioLabel: 'Ratio',
    a11ySectionTitle: 'Accessibility & Keyboard Navigation',
    a11yMotionLabel: 'Motion & animations',
    a11yMotionSystem: 'System',
    a11yMotionReduce: 'Reduce motion',
    a11yMotionFull: 'Full motion',
    a11yHighContrastLabel: 'High contrast',
    a11yHighContrastDesc: 'Strengthens contrast on borders, controls, and secondary text across light and dark themes.',
    a11yLargeTextLabel: 'Larger text',
    a11yLargeTextDesc: 'Increases base typography scale across panels, settings, suggestions, and legal pages.',
    a11yFocusRingsLabel: 'Enhanced focus indicators',
    a11yFocusRingsDesc: 'Displays high-visibility accent focus rings when navigating via keyboard Tab.',
    a11yKeyboardHint: 'Logical tabindex ordering is enabled across controls, links, settings, and dialogs.',
    supportLetterTitle: 'A note from Orb',
    supportLetterParagraphs: [
      'Heyyyy, sooo...',
      'I’m Orb. A tiny living Orb being with an unnecessarily big imagination and some VERY ambitious plans.',
      'We’re building something BIG. New ideas, crazy projects and an entire universe of possibilities.',
      'Unfortunately, dreams don’t run on magic. (I’ve tried.)',
      'So, buy me a coffee and help me fund my questionable existence. Help me continue being a living Orb being.',
      'Stay orb-some. 💜',
    ],
    supportPillars: [
      {
        title: 'Zero Ads',
        desc: 'No intrusive trackers or banners — your startpage stays clean and fast.',
      },
      {
        title: 'Living Mascot',
        desc: 'Fluid animations, procedural audio cues, and expressive reactions.',
      },
      {
        title: 'Future Orb AI',
        desc: 'Supports ongoing research, polish, and future dedicated AI hosting.',
      },
    ],
    supportLegalLinkLabel: 'Read legal notice on voluntary donations',
    changelogSectionTitle: 'Version Changelog',
    changelogSubtitle: 'Track every Orbit release, new feature, and refinement.',
    changelogCurrentTag: 'Current',
    changelogEntries: [
      {
        version: 'v2.5.0',
        dateLabel: 'November 2026',
        title: 'Multi-Model Gemini Studio, VFX & Smart Home Polish',
        isCurrent: true,
        items: [
          'Multi-turn chatbot with role & model routing across Gemini 4 Carbon (deep reasoning), Gemini 4 Neon (complex interactive), Gemini 4 Hydrogen (general), and Gemini 3.1 Flash Lite (fast).',
          'Text-to-image creation and image editing with Gemini Nano Banana 2.1 powered strictly by your own personal API key.',
          'Upgraded 5-layer API key vault (Split-XOR blinding, AES-256-GCM + ChaCha20-Poly1305 cascade, HMAC-SHA256 commitment, split-shard device storage & obfuscated transport).',
          'Softer animated ambient accent background, themed Support Orb VFX translated in all 5 languages, Smart Home display layout improvements, and Settings Changelog.',
        ],
      },
      {
        version: 'v2.4.0',
        dateLabel: 'November 2026',
        title: 'Dedicated AI Chat View & Full Accessibility',
        items: [
          'Side-by-side Gemini chat view with Orb shifting left and back-to-search navigation.',
          'Full accessibility preferences (reduced motion, large text, high contrast, focus rings) and semantic tabindex.',
          'Voluntary donations notice and coherent Buy me a coffee integration.',
        ],
      },
      {
        version: 'v2.3.0',
        dateLabel: 'October 2026',
        title: 'Standby Mode & Updated Quick Links',
        items: [
          'Desktop & smart-display Standby Mode with oversized clock, date, and local weather.',
          'Restored idle & typing mascot reactions via server choreography.',
          'Updated default quick links with Threads and Instagram.',
        ],
      },
      {
        version: 'v2.0.0',
        dateLabel: 'September 2026',
        title: 'Orbit Liquid Glass & 2026 Legal Compliance',
        items: [
          'Frosted glass UI, 10 Fluo presets + custom color picker BETA.',
          'Searchable multi-jurisdiction 2026 legal & privacy compliance suite.',
        ],
      },
    ],
    donationPopupBadge: 'Support Orbit',
    donationPopupTitle: 'Enjoying your experience on Orbit?',
    donationPopupBody: 'Orbit is completely free, ad-free, and open-source. If it brightens your daily browsing, please consider a voluntary donation to support ongoing development.',
    donationPopupCtaCoffee: 'Buy me a coffee',
    donationPopupCtaOpenSection: 'Read Orb’s note',
    donationPopupLater: 'Maybe later',
    donationPopupNever: 'Don’t ask again',
    donationPopupLegalLink: 'Voluntary donations legal notice',
    standbyButtonLabel: 'Standby mode',
    standbyAriaLabel: 'Enter desktop standby mode',
    standbyExitHint: 'Click to exit',
    weatherClear: 'Clear',
    weatherCloudy: 'Cloudy',
    weatherFog: 'Fog',
    weatherRain: 'Rain',
    weatherSnow: 'Snow',
    weatherStorm: 'Storm',
  },
  fr: {
    searchPlaceholder: 'Rechercher ou saisir une adresse web',
    searchAriaLabel: 'Rechercher ou saisir une adresse web',
    searchSubmitAria: 'Lancer la recherche',
    clearHistoryLabel: 'Effacer l’historique',
    settingsAria: 'Ouvrir les paramètres',
    settingsTitle: 'Paramètres Orbit',
    settingsBreadcrumbLabel: 'paramètres',
    settingsSubtitle: 'Personnalisez l’apparence, le démarrage, vos raccourcis et la confidentialité.',
    settingsTabAppearance: 'Apparence',
    settingsTabExperience: 'Expérience',
    settingsTabQuickLinks: 'Accès rapides',
    settingsTabAi: 'Fonctionnalités IA',
    settingsTabAccessibility: 'Accessibilité',
    settingsTabChangelog: 'Nouveautés',
    settingsTabSupport: 'Soutenir Orb',
    settingsTabPrivacy: 'Confidentialité',
    themeLabel: 'Thème de l’interface',
    themeSystem: 'Selon l’appareil',
    themeDark: 'Sombre',
    themeLight: 'Clair',
    accentLabel: 'Couleur d’accent Fluo',
    accentCustomLabel: 'Couleur personnalisée',
    accentCustomHint: 'Choisissez n’importe quelle nuance pour Orbit et l’interface.',
    betaTag: 'BETA',
    introSectionLabel: 'Démarrage et animation',
    alwaysShowIntroLabel: 'Toujours afficher l’intro',
    alwaysShowIntroHint: 'Après votre premier accès et le choix des cookies, l’intro se désactive. Activez pour la revoir toujours.',
    languageRegionSectionLabel: 'Langue et région',
    quickLinksLabel: 'Accès rapides',
    quickLinksLimitNote: 'Maximum 4 liens rapides sous la barre de recherche',
    quickLinkTitlePlaceholder: 'Titre (ex. GitHub)',
    quickLinkUrlPlaceholder: 'URL (ex. https://github.com)',
    addQuickLink: 'Ajouter',
    saveChanges: 'Enregistrer',
    cancelEdit: 'Annuler',
    editLabel: 'Modifier',
    deleteLabel: 'Supprimer',
    resetDefaults: 'Réinitialiser',
    invalidQuickLink: 'Saisissez un titre et une URL valides (ex. example.com).',
    closeModal: 'Fermer',
    footerPrefix: 'En utilisant ce service, vous acceptez nos',
    footerLegalLink: 'Mentions Légales et Confidentialité',
    regionSelectorAria: 'Sélectionner la langue et la juridiction',
    legalModalTitle: 'Mentions Légales, Confidentialité et Conformité 2026',
    legalBreadcrumbLabel: 'Mentions légales',
    legalJurisdictionBadge: 'Juridiction active',
    legalSearchPlaceholder: 'Rechercher (ex. cookie, dons, GitHub, IA, CCPA)...',
    legalSearchClear: 'Effacer',
    legalSearchResultsCount: 'sections correspondantes',
    legalNoMatches: 'Aucune section ne correspond à votre recherche.',
    legalTocTitle: 'Sommaire',
    cookieStatusLabel: 'État actuel du consentement',
    cookieStatusEssentialOnly: 'Stockage technique nécessaire uniquement (requêtes externes bloquées)',
    cookieStatusAllAccepted: 'Toutes les préférences fonctionnelles activées',
    cookieStatusCustom: 'Préférences personnalisées enregistrées',
    cookieAcceptAll: 'Tout accepter',
    cookieRejectAll: 'Tout refuser',
    cookieCustomize: 'Personnaliser',
    cookieSaveCustom: 'Enregistrer',
    cookieFunctionalToggle: 'Suggestions de recherche externes (DuckDuckGo / Google Suggest)',
    cookieAnalyticsToggle: 'Métriques de diagnostic locales',
    cookieRevisitHint: 'Vous pouvez modifier ou retirer votre consentement à tout moment ici.',
    usDoNotSellLabel: 'Do Not Sell or Share My Personal Information',
    usDoNotSellActive: 'Actif — Aucune vente ou partage autorisé',
    usDoNotSellInactive: 'Inactif — Cliquer pour activer',
    usGpcDetected: 'Signal Global Privacy Control (GPC) détecté et respecté automatiquement.',
    usGpcNotDetected: 'Signal Global Privacy Control (GPC) non détecté ; prise en charge active.',
    cookieNoticeBadge: 'Orb · Confidentialité 2026',
    cookieNoticeTitle: 'Avant de commencer, choisissez vos préférences de cookies',
    cookieNoticeBody: 'Orb utilise le stockage local nécessaire pour le thème, la couleur et les raccourcis. Vous pouvez activer les suggestions externes maintenant ou les modifier à tout moment dans les Paramètres.',
    cookieNoticeOpenPolicy: 'Lire la politique complète',
    settingsCookieTitle: 'Préférences Cookies & Confidentialité',
    settingsCookieSubtitle: 'Modifiez à tout moment vos choix enregistrés localement.',
    botAriaLabel: 'Mascotte Orbit interactive, cliquer pour une réaction',
    aiComingSoonTitle: 'coming soon...',
    aiComingSoonDesc:
      'Orb ne sera pas seulement une mascotte, mais aussi un véritable secrétaire personnel et assistant dans vos échanges multi-tours et la création d’images.',
    aiServerDisclaimer:
      'Orbit ne dispose pas actuellement de son propre serveur pour héberger un modèle IA dédié. Toutes les fonctions Gemini utilisent exclusivement votre clé API personnelle sans aucun lien vers une clé partagée.',
    aiGuideTitle: 'Guide officiel pour connecter Gemini',
    aiGuideStep1: '1. Ouvrez Google AI Studio avec votre compte Google et acceptez les conditions.',
    aiGuideStep2: '2. Cliquez sur "Create API key" pour générer votre clé personnelle.',
    aiGuideStep3: '3. Collez-la ici : elle est protégée sur 5 couches (Split-XOR + AES-256-GCM + ChaCha20-Poly1305 + HMAC-SHA256 en cookie HttpOnly).',
    aiGuideOpenStudio: 'Ouvrir Google AI Studio (officiel)',
    aiKeyLabel: 'Votre clé API Gemini personnelle',
    aiKeyPlaceholder: 'AIzaSy...',
    aiKeySaveBtn: 'Chiffrer et connecter',
    aiKeySaving: 'Chiffrement...',
    aiKeyConnectedLabel: 'Clé Gemini chiffrée active (5 couches)',
    aiKeyDisconnectBtn: 'Supprimer la clé',
    aiKeyRememberDevice: 'Conserver une sauvegarde fragmentée et chiffrée (Web Crypto + PBKDF2)',
    aiKeySecurityLayers: 'Protection à 5 couches : masquage Split-XOR, cascade AES-256-GCM + ChaCha20-Poly1305, HMAC-SHA256 et cookie HttpOnly Partitioned.',
    aiKeyInvalidError: 'Format de clé API invalide.',
    aiAskOrbBtn: 'Demander à Orb',
    aiAskOrbAria: 'Poser la question à Orb IA via Gemini',
    aiAnswerTitle: 'Réponse Orb IA',
    aiAnswerClose: 'Fermer la réponse IA',
    aiAnswerLoading: 'Orb réfléchit avec Gemini...',
    aiAnswerNeedKey: 'Connectez votre clé API Gemini personnelle dans Paramètres -> Fonctionnalités IA (BETA).',
    aiChatTitle: 'Orb IA',
    aiChatBackToSearch: 'Retour à la recherche',
    aiChatInputPlaceholder: 'Écrire un message à Orb...',
    aiChatSendAria: 'Envoyer un message à Orb IA',
    aiChatModeChat: 'Discussion',
    aiChatModeImage: 'Images',
    aiRoleLabel: 'Rôle & Modèle',
    aiRoleAuto: 'Auto',
    aiRoleAssistant: 'Général · Hydrogen',
    aiRoleFast: 'Rapide · Flash Lite',
    aiRoleInteractive: 'Interactif · Neon',
    aiRoleReasoning: 'Raisonnement · Carbon',
    aiImagePlaceholder: 'Décrivez une image à créer ou comment modifier celle jointe...',
    aiImageUploadLabel: 'Importer une image à modifier',
    aiImageClearUpload: 'Retirer la pièce jointe',
    aiImageEditBtn: 'Modifier l’image',
    aiImageDownloadBtn: 'Télécharger',
    aiImageLoading: 'Génération avec Nano Banana 2.1...',
    aiImageEditingBanner: 'Mode retouche d’image actif',
    aiImageRatioLabel: 'Format',
    a11ySectionTitle: 'Accessibilité et Navigation Clavier',
    a11yMotionLabel: 'Mouvement et animations',
    a11yMotionSystem: 'Système',
    a11yMotionReduce: 'Réduire',
    a11yMotionFull: 'Complètes',
    a11yHighContrastLabel: 'Contraste élevé',
    a11yHighContrastDesc: 'Renforce le contraste des bordures, boutons et textes en mode clair et sombre.',
    a11yLargeTextLabel: 'Texte agrandi',
    a11yLargeTextDesc: 'Augmente la taille de lecture dans les panneaux, réglages et mentions légales.',
    a11yFocusRingsLabel: 'Contours de focus visibles',
    a11yFocusRingsDesc: 'Met en évidence l’élément ciblé lors de la navigation au clavier (Tab).',
    a11yKeyboardHint: 'Ordre de tabulation logique (tabindex) actif sur toute l’interface.',
    supportLetterTitle: 'Un mot d’Orb',
    supportLetterParagraphs: [
      'Coucouuu, alors...',
      'Je suis Orb. Un tout petit être sphérique vivant avec une imagination démesurée et des projets TRÈS ambitieux.',
      'Nous construisons quelque chose de GRAND : de nouvelles idées, des projets fous et tout un univers de possibilités.',
      'Malheureusement, les rêves ne fonctionnent pas à la magie. (J’ai essayé.)',
      'Alors offre-moi un café pour soutenir mon existence douteuse et m’aider à rester un petit Orb bien vivant.',
      'Reste orb-some. 💜',
    ],
    supportPillars: [
      {
        title: 'Zéro publicité',
        desc: 'Aucun traceur ni bannière : votre page reste rapide et épurée.',
      },
      {
        title: 'Mascotte vivante',
        desc: 'Animations fluides, sons subtils et réactions interactives.',
      },
      {
        title: 'Futur Orb IA',
        desc: 'Soutient la R&D et l’arrivée future de serveurs IA dédiés.',
      },
    ],
    supportLegalLinkLabel: 'Lire la section légale sur les dons volontaires',
    changelogSectionTitle: 'Historique des versions',
    changelogSubtitle: 'Découvrez les nouveautés et améliorations ajoutées à Orbit.',
    changelogCurrentTag: 'Actuelle',
    changelogEntries: [
      {
        version: 'v2.5.0',
        dateLabel: 'Novembre 2026',
        title: 'Studio Gemini Multi-Modèles, VFX & Écrans Connectés',
        isCurrent: true,
        items: [
          'Chat multi-tours avec rôles dédiés : Gemini 4 Carbon (raisonnement profond), Gemini 4 Neon (interactif), Gemini 4 Hydrogen (général) et Gemini 3.1 Flash Lite (rapide).',
          'Création et édition d’images avec Gemini Nano Banana 2.1 uniquement via votre clé API personnelle.',
          'Coffre-fort 5 couches (Split-XOR, cascade AES-256-GCM + ChaCha20-Poly1305, HMAC-SHA256 et transport obfusqué).',
          'Arrière-plan animé plus doux, page Soutenir Orb avec VFX traduite en 5 langues, mise en page optimisée pour écrans Smart Home et onglet Nouveautés.',
        ],
      },
      {
        version: 'v2.4.0',
        dateLabel: 'Novembre 2026',
        title: 'Vue Chatbot dédiée & Accessibilité',
        items: [
          'Interface conversationnelle dédiée avec flèche de retour vers la recherche.',
          'Paramètres d’accessibilité complets et navigation clavier tabindex.',
        ],
      },
      {
        version: 'v2.3.0',
        dateLabel: 'Octobre 2026',
        title: 'Mode Veille Bureau & Accès rapides',
        items: [
          'Mode veille avec grande horloge, date et météo locale.',
          'Liens rapides mis à jour avec Threads et Instagram.',
        ],
      },
    ],
    donationPopupBadge: 'Soutenir Orbit',
    donationPopupTitle: 'L’expérience sur Orbit vous plaît ?',
    donationPopupBody: 'Orbit est gratuit, sans publicité et open-source. Si vous appréciez l’utiliser, envisagez un don volontaire pour aider au développement.',
    donationPopupCtaCoffee: 'Buy me a coffee',
    donationPopupCtaOpenSection: 'En savoir plus',
    donationPopupLater: 'Plus tard',
    donationPopupNever: 'Ne plus demander',
    donationPopupLegalLink: 'Mentions légales sur les dons',
    standbyButtonLabel: 'Mode veille',
    standbyAriaLabel: 'Activer le mode veille bureau',
    standbyExitHint: 'Cliquez pour quitter',
    weatherClear: 'Dégagé',
    weatherCloudy: 'Nuageux',
    weatherFog: 'Brouillard',
    weatherRain: 'Pluie',
    weatherSnow: 'Neige',
    weatherStorm: 'Orage',
  },
  de: {
    searchPlaceholder: 'Suchen oder Webadresse eingeben',
    searchAriaLabel: 'Suchen oder Webadresse eingeben',
    searchSubmitAria: 'Suche starten',
    clearHistoryLabel: 'Verlauf löschen',
    settingsAria: 'Einstellungen öffnen',
    settingsTitle: 'Orbit-Einstellungen',
    settingsBreadcrumbLabel: 'einstellungen',
    settingsSubtitle: 'Design, Start-Erlebnis, Schnellzugriffe und Datenschutz anpassen.',
    settingsTabAppearance: 'Design',
    settingsTabExperience: 'Erlebnis',
    settingsTabQuickLinks: 'Schnellzugriffe',
    settingsTabAi: 'KI-Funktionen',
    settingsTabAccessibility: 'Barrierefreiheit',
    settingsTabChangelog: 'Changelog',
    settingsTabSupport: 'Orbit unterstützen',
    settingsTabPrivacy: 'Datenschutz',
    themeLabel: 'Erscheinungsbild',
    themeSystem: 'Wie Gerät',
    themeDark: 'Dunkel',
    themeLight: 'Hell',
    accentLabel: 'Fluo-Akzentfarbe',
    accentCustomLabel: 'Eigene Farbe',
    accentCustomHint: 'Wähle einen beliebigen Farbton für Orbit und Akzente.',
    betaTag: 'BETA',
    introSectionLabel: 'Start & Animation',
    alwaysShowIntroLabel: 'Intro immer anzeigen',
    alwaysShowIntroHint: 'Nach dem ersten Besuch und der Cookie-Wahl wird das Intro deaktiviert. Aktivieren für jedes Öffnen.',
    languageRegionSectionLabel: 'Sprache & Region',
    quickLinksLabel: 'Schnellzugriffe',
    quickLinksLimitNote: 'Maximal 4 Schnellzugriffe unter der Suchleiste',
    quickLinkTitlePlaceholder: 'Titel (z. B. GitHub)',
    quickLinkUrlPlaceholder: 'URL (z. B. https://github.com)',
    addQuickLink: 'Hinzufügen',
    saveChanges: 'Speichern',
    cancelEdit: 'Abbrechen',
    editLabel: 'Bearbeiten',
    deleteLabel: 'Entfernen',
    resetDefaults: 'Zurücksetzen',
    invalidQuickLink: 'Bitte gültigen Titel und gültige URL eingeben (z. B. example.com).',
    closeModal: 'Schließen',
    footerPrefix: 'Mit der Nutzung akzeptieren Sie unsere',
    footerLegalLink: 'Rechtliche Hinweise & Datenschutz',
    regionSelectorAria: 'Sprache und Rechtsraum wählen',
    legalModalTitle: 'Rechtliche Hinweise, Datenschutz & Compliance 2026',
    legalBreadcrumbLabel: 'Rechtliches',
    legalJurisdictionBadge: 'Aktiver Rechtsraum',
    legalSearchPlaceholder: 'Dokument durchsuchen (z. B. Cookie, Spenden, GitHub, KI, CCPA)...',
    legalSearchClear: 'Suche löschen',
    legalSearchResultsCount: 'passende Abschnitte',
    legalNoMatches: 'Keine Abschnitte für diesen Suchbegriff gefunden.',
    legalTocTitle: 'Inhaltsverzeichnis',
    cookieStatusLabel: 'Aktueller Einwilligungsstatus',
    cookieStatusEssentialOnly: 'Nur technisch notwendiger Speicher (externe Abfragen präventiv blockiert)',
    cookieStatusAllAccepted: 'Alle funktionalen Präferenzen aktiviert',
    cookieStatusCustom: 'Benutzerdefinierte Einstellungen gespeichert',
    cookieAcceptAll: 'Alle akzeptieren',
    cookieRejectAll: 'Nicht notwendige ablehnen',
    cookieCustomize: 'Anpassen',
    cookieSaveCustom: 'Auswahl speichern',
    cookieFunctionalToggle: 'Externe Suchvorschläge (DuckDuckGo / Google Suggest)',
    cookieAnalyticsToggle: 'Lokale Diagnosedaten',
    cookieRevisitHint: 'Sie können Ihre Einwilligung jederzeit hier einsehen oder widerrufen.',
    usDoNotSellLabel: 'Do Not Sell or Share My Personal Information',
    usDoNotSellActive: 'Aktiv — Kein Verkauf oder Teilen erlaubt',
    usDoNotSellInactive: 'Inaktiv — Klicken zum Aktivieren',
    usGpcDetected: 'Global Privacy Control (GPC) Signal erkannt und automatisch berücksichtigt.',
    usGpcNotDetected: 'Kein GPC-Signal erkannt; automatische Unterstützung aktiv.',
    cookieNoticeBadge: 'Orb · Datenschutz 2026',
    cookieNoticeTitle: 'Bevor wir starten: Cookie-Einstellungen wählen',
    cookieNoticeBody: 'Orb nutzt lokal notwendigen Speicher für Design, Akzentfarbe und Schnellzugriffe. Externe Suchvorschläge und lokale Diagnose kannst du jetzt aktivieren oder jederzeit in den Einstellungen ändern.',
    cookieNoticeOpenPolicy: 'Vollständige Hinweise lesen',
    settingsCookieTitle: 'Cookie- & Datenschutzeinstellungen',
    settingsCookieSubtitle: 'Passe deine lokal gespeicherte Einwilligung jederzeit an.',
    botAriaLabel: 'Interaktives Orbit-Maskottchen, klicken für eine Reaktion',
    aiComingSoonTitle: 'coming soon...',
    aiComingSoonDesc:
      'Orb wird nicht nur ein Maskottchen bleiben, sondern auch dein persönlicher Helfer für mehrstufige Chats und Bilderstellung sein.',
    aiServerDisclaimer:
      'Orbit betreibt derzeit keinen eigenen Server für ein proprietäres KI-Modell. Alle Gemini-Funktionen nutzen ausschließlich deinen eigenen persönlichen API-Schlüssel.',
    aiGuideTitle: 'Offizielle Anleitung für Google Gemini',
    aiGuideStep1: '1. Öffne Google AI Studio mit deinem Google-Konto und akzeptiere die Bedingungen.',
    aiGuideStep2: '2. Klicke auf "Create API key", um deinen persönlichen Schlüssel zu erstellen.',
    aiGuideStep3: '3. Füge ihn hier ein: Er wird in 5 Ebenen geschützt (Split-XOR + AES-256-GCM + ChaCha20-Poly1305 + HMAC-SHA256 im HttpOnly Cookie).',
    aiGuideOpenStudio: 'Google AI Studio öffnen (offiziell)',
    aiKeyLabel: 'Dein persönlicher Gemini API-Schlüssel',
    aiKeyPlaceholder: 'AIzaSy...',
    aiKeySaveBtn: 'Verschlüsseln & verbinden',
    aiKeySaving: 'Verschlüsseln...',
    aiKeyConnectedLabel: '5-Ebenen-Schlüssel aktiv',
    aiKeyDisconnectBtn: 'Schlüssel löschen',
    aiKeyRememberDevice: 'Geteilte verschlüsselte Gerätesicherung behalten (Web Crypto + PBKDF2)',
    aiKeySecurityLayers: '5-Ebenen-Schutz: Split-XOR-Maskierung, AES-256-GCM + ChaCha20-Poly1305 Kaskade, HMAC-SHA256 und HttpOnly Partitioned Cookie.',
    aiKeyInvalidError: 'Ungültiges API-Schlüsselformat.',
    aiAskOrbBtn: 'Orb fragen',
    aiAskOrbAria: 'Orb KI mit Gemini fragen',
    aiAnswerTitle: 'Orb KI-Antwort',
    aiAnswerClose: 'KI-Antwort schließen',
    aiAnswerLoading: 'Orb denkt mit Gemini nach...',
    aiAnswerNeedKey: 'Verbinde deinen persönlichen Gemini-Schlüssel unter Einstellungen -> KI-Funktionen (BETA).',
    aiChatTitle: 'Orb KI',
    aiChatBackToSearch: 'Zurück zur Suche',
    aiChatInputPlaceholder: 'Nachricht an Orb schreiben...',
    aiChatSendAria: 'Nachricht an Orb KI senden',
    aiChatModeChat: 'Chat',
    aiChatModeImage: 'Bilder',
    aiRoleLabel: 'Rolle & Modell',
    aiRoleAuto: 'Auto',
    aiRoleAssistant: 'Allgemein · Hydrogen',
    aiRoleFast: 'Schnell · Flash Lite',
    aiRoleInteractive: 'Interaktiv · Neon',
    aiRoleReasoning: 'Tiefgang · Carbon',
    aiImagePlaceholder: 'Beschreibe ein Bild zum Erstellen oder zum Bearbeiten...',
    aiImageUploadLabel: 'Bild zum Bearbeiten hochladen',
    aiImageClearUpload: 'Anhang entfernen',
    aiImageEditBtn: 'Bild bearbeiten',
    aiImageDownloadBtn: 'Herunterladen',
    aiImageLoading: 'Erstellung mit Nano Banana 2.1...',
    aiImageEditingBanner: 'Bildbearbeitungsmodus aktiv',
    aiImageRatioLabel: 'Format',
    a11ySectionTitle: 'Barrierefreiheit & Tastaturnavigation',
    a11yMotionLabel: 'Bewegung & Animationen',
    a11yMotionSystem: 'System',
    a11yMotionReduce: 'Reduzieren',
    a11yMotionFull: 'Vollständig',
    a11yHighContrastLabel: 'Hoher Kontrast',
    a11yHighContrastDesc: 'Erhöht den Kontrast von Rahmen, Buttons und Sekundärtexten.',
    a11yLargeTextLabel: 'Größerer Text',
    a11yLargeTextDesc: 'Vergrößert die Basisschrift in Menüs, Einstellungen und Rechtshinweisen.',
    a11yFocusRingsLabel: 'Deutliche Fokus-Ringe',
    a11yFocusRingsDesc: 'Hebt das per Tab-Taste gewählte Element kontraststark hervor.',
    a11yKeyboardHint: 'Logische Tab-Reihenfolge (tabindex) ist auf allen Bedienelementen aktiv.',
    supportLetterTitle: 'Eine Nachricht von Orb',
    supportLetterParagraphs: [
      'Heyyyy, alsooo...',
      'Ich bin Orb. Ein winziges lebendiges Orb-Wesen mit einer unnötig großen Fantasie und SEHR ambitionierten Plänen.',
      'Wir bauen etwas GROSSES: neue Ideen, verrückte Projekte und ein ganzes Universum voller Möglichkeiten.',
      'Leider laufen Träume nicht mit Magie. (Ich habe es versucht.)',
      'Spendiere mir also einen Kaffee und hilf mir, meine fragwürdige Existenz zu finanzieren, damit ich ein lebendiger kleiner Orb bleiben kann.',
      'Bleib orb-some. 💜',
    ],
    supportPillars: [
      {
        title: 'Keine Werbung',
        desc: 'Keine Tracker oder Banner — deine Startseite bleibt sauber und schnell.',
      },
      {
        title: 'Lebendiges Maskottchen',
        desc: 'Flüssige Animationen, prozeduraler Sound und ausdrucksstarke Reaktionen.',
      },
      {
        title: 'Zukunft von Orb KI',
        desc: 'Unterstützt Weiterentwicklung und künftige eigene KI-Server.',
      },
    ],
    supportLegalLinkLabel: 'Rechtliche Hinweise zu freiwilligen Spenden lesen',
    changelogSectionTitle: 'Versionsverlauf',
    changelogSubtitle: 'Alle Orbit-Updates, neuen Funktionen und Verbesserungen.',
    changelogCurrentTag: 'Aktuell',
    changelogEntries: [
      {
        version: 'v2.5.0',
        dateLabel: 'November 2026',
        title: 'Multi-Modell Gemini Studio, VFX & Smart Home',
        isCurrent: true,
        items: [
          'Multi-Turn-Chatbot mit Rollenwahl: Gemini 4 Carbon, Gemini 4 Neon, Gemini 4 Hydrogen und Gemini 3.1 Flash Lite.',
          'Bilderstellung und -bearbeitung mit Gemini Nano Banana 2.1 ausschließlich mit eigenem API-Schlüssel.',
          '5-Schichten-Tresor (Split-XOR, AES-256-GCM + ChaCha20-Poly1305, HMAC-SHA256 und Transport-Verschleierung).',
          'Sanfter animierter Hintergrund, übersetzte Spenden-Seite mit VFX, Smart-Home-Layout-Optimierung und Changelog.',
        ],
      },
      {
        version: 'v2.4.0',
        dateLabel: 'November 2026',
        title: 'Eigene Chatbot-Ansicht & Barrierefreiheit',
        items: [
          'Dedizierte Chat-Ansicht mit Zurück-Pfeil zur Suche.',
          'Vollständige Barrierefreiheit und Tabindex-Navigation.',
        ],
      },
      {
        version: 'v2.3.0',
        dateLabel: 'Oktober 2026',
        title: 'Standby-Modus & Schnellzugriffe',
        items: [
          'Standby-Uhr mit lokalem Wetter und neuen Schnellzugriffen (Threads & Instagram).',
        ],
      },
    ],
    donationPopupBadge: 'Orbit unterstützen',
    donationPopupTitle: 'Gefällt dir das Erlebnis auf Orbit?',
    donationPopupBody: 'Orbit ist kostenlos, werbefrei und Open Source. Wenn es dir täglich hilft, ziehe eine freiwillige Spende zur Weiterentwicklung in Betracht.',
    donationPopupCtaCoffee: 'Buy me a coffee',
    donationPopupCtaOpenSection: 'Mehr erfahren',
    donationPopupLater: 'Später',
    donationPopupNever: 'Nicht mehr fragen',
    donationPopupLegalLink: 'Rechtliches zu freiwilligen Spenden',
    standbyButtonLabel: 'Standby-Modus',
    standbyAriaLabel: 'Desktop-Standby-Modus aktivieren',
    standbyExitHint: 'Klicken zum Beenden',
    weatherClear: 'Klar',
    weatherCloudy: 'Bewölkt',
    weatherFog: 'Nebel',
    weatherRain: 'Regen',
    weatherSnow: 'Schnee',
    weatherStorm: 'Gewitter',
  },
  es: {
    searchPlaceholder: 'Buscar o escribir una dirección web',
    searchAriaLabel: 'Buscar o escribir una dirección web',
    searchSubmitAria: 'Iniciar búsqueda',
    clearHistoryLabel: 'Borrar historial',
    settingsAria: 'Abrir configuración',
    settingsTitle: 'Configuración de Orbit',
    settingsBreadcrumbLabel: 'ajustes',
    settingsSubtitle: 'Personaliza el aspecto, el inicio, los enlaces rápidos y la privacidad.',
    settingsTabAppearance: 'Apariencia',
    settingsTabExperience: 'Experiencia',
    settingsTabQuickLinks: 'Enlaces rápidos',
    settingsTabAi: 'Funciones IA',
    settingsTabAccessibility: 'Accesibilidad',
    settingsTabChangelog: 'Changelog',
    settingsTabSupport: 'Apoyar a Orb',
    settingsTabPrivacy: 'Privacidad',
    themeLabel: 'Tema de interfaz',
    themeSystem: 'Según el dispositivo',
    themeDark: 'Oscuro',
    themeLight: 'Claro',
    accentLabel: 'Color de acento Flúor',
    accentCustomLabel: 'Color personalizado',
    accentCustomHint: 'Elige cualquier tono para Orbit y los detalles de la interfaz.',
    betaTag: 'BETA',
    introSectionLabel: 'Inicio y animación',
    alwaysShowIntroLabel: 'Mostrar siempre la intro',
    alwaysShowIntroHint: 'Tras el primer acceso y la elección de cookies, la intro se desactiva. Actívala para verla siempre.',
    languageRegionSectionLabel: 'Idioma y región',
    quickLinksLabel: 'Enlaces rápidos',
    quickLinksLimitNote: 'Máximo 4 enlaces rápidos bajo la barra de búsqueda',
    quickLinkTitlePlaceholder: 'Título (ej. GitHub)',
    quickLinkUrlPlaceholder: 'URL (ej. https://github.com)',
    addQuickLink: 'Añadir enlace',
    saveChanges: 'Guardar cambios',
    cancelEdit: 'Cancelar',
    editLabel: 'Editar',
    deleteLabel: 'Eliminar',
    resetDefaults: 'Restablecer',
    invalidQuickLink: 'Introduce un título válido y una URL correcta (ej. example.com).',
    closeModal: 'Cerrar',
    footerPrefix: 'Al usar este servicio aceptas nuestras',
    footerLegalLink: 'Notas Legales y Política de Privacidad',
    regionSelectorAria: 'Seleccionar idioma y jurisdicción legal',
    legalModalTitle: 'Notas Legales, Privacidad y Cumplimiento 2026',
    legalBreadcrumbLabel: 'Aviso legal',
    legalJurisdictionBadge: 'Jurisdicción activa',
    legalSearchPlaceholder: 'Buscar en el documento (ej. cookie, donaciones, GitHub, IA, CCPA)...',
    legalSearchClear: 'Limpiar',
    legalSearchResultsCount: 'secciones coincidentes',
    legalNoMatches: 'Ninguna sección coincide con tu búsqueda.',
    legalTocTitle: 'Índice de secciones',
    cookieStatusLabel: 'Estado actual del consentimiento',
    cookieStatusEssentialOnly: 'Solo almacenamiento técnico necesario (peticiones externas bloqueadas preventivamente)',
    cookieStatusAllAccepted: 'Todas las preferencias funcionales habilitadas',
    cookieStatusCustom: 'Preferencias personalizadas guardadas',
    cookieAcceptAll: 'Aceptar todas',
    cookieRejectAll: 'Rechazar no esenciales',
    cookieCustomize: 'Personalizar',
    cookieSaveCustom: 'Guardar preferencias',
    cookieFunctionalToggle: 'Sugerencias de búsqueda externas (DuckDuckGo / Google Suggest)',
    cookieAnalyticsToggle: 'Métricas locales de diagnóstico',
    cookieRevisitHint: 'Puedes revisar o revocar tus elecciones en cualquier momento desde este panel.',
    usDoNotSellLabel: 'Do Not Sell or Share My Personal Information',
    usDoNotSellActive: 'Activo — No se permite venta ni compartición',
    usDoNotSellInactive: 'Inactivo — Pulsar para activar Opt-Out',
    usGpcDetected: 'Señal Global Privacy Control (GPC) detectada y respetada automáticamente.',
    usGpcNotDetected: 'Señal GPC no detectada; compatibilidad automática activa.',
    cookieNoticeBadge: 'Orb · Privacidad 2026',
    cookieNoticeTitle: 'Antes de empezar, elige tus preferencias de cookies',
    cookieNoticeBody: 'Orb usa almacenamiento local necesario para el tema, el color y los enlaces rápidos. Puedes activar sugerencias externas y diagnóstico local ahora o cambiarlo cuando quieras en Configuración.',
    cookieNoticeOpenPolicy: 'Leer política completa',
    settingsCookieTitle: 'Preferencias de Cookies y Privacidad',
    settingsCookieSubtitle: 'Modifica en cualquier momento tus preferencias guardadas localmente.',
    botAriaLabel: 'Mascota interactiva Orbit, haz clic para ver una reacción',
    aiComingSoonTitle: 'coming soon...',
    aiComingSoonDesc:
      'Orb dejará de ser solo una mascota interactiva para convertirse también en tu asistente inteligente con chat multi-turno y creación de imágenes.',
    aiServerDisclaimer:
      'Actualmente Orbit no dispone de un servidor propio para alojar un modelo de IA propietario. Todas las funciones de Gemini usan exclusivamente tu propia clave API personal.',
    aiGuideTitle: 'Guía oficial para conectar Gemini',
    aiGuideStep1: '1. Abre Google AI Studio con tu cuenta de Google y acepta los términos.',
    aiGuideStep2: '2. Pulsa en "Create API key" para generar tu clave personal.',
    aiGuideStep3: '3. Pégala aquí: se protege con 5 capas criptográficas (Split-XOR + AES-256-GCM + ChaCha20-Poly1305 + HMAC-SHA256 en cookie HttpOnly).',
    aiGuideOpenStudio: 'Abrir Google AI Studio (oficial)',
    aiKeyLabel: 'Tu clave API personal de Gemini',
    aiKeyPlaceholder: 'AIzaSy...',
    aiKeySaveBtn: 'Cifrar y conectar clave',
    aiKeySaving: 'Cifrando...',
    aiKeyConnectedLabel: 'Clave Gemini cifrada activa (5 capas)',
    aiKeyDisconnectBtn: 'Eliminar clave',
    aiKeyRememberDevice: 'Guardar respaldo fragmentado cifrado (Web Crypto + PBKDF2)',
    aiKeySecurityLayers: 'Protección de 5 capas: mezcla Split-XOR, cascada AES-256-GCM + ChaCha20-Poly1305, HMAC-SHA256 y cookie HttpOnly Partitioned.',
    aiKeyInvalidError: 'Formato de clave API no válido.',
    aiAskOrbBtn: 'Preguntar a Orb',
    aiAskOrbAria: 'Preguntar a Orb IA mediante Gemini',
    aiAnswerTitle: 'Respuesta de Orb IA',
    aiAnswerClose: 'Cerrar respuesta IA',
    aiAnswerLoading: 'Orb está pensando con Gemini...',
    aiAnswerNeedKey: 'Conecta tu clave API personal de Gemini en Configuración -> Funciones IA (BETA).',
    aiChatTitle: 'Orb IA',
    aiChatBackToSearch: 'Volver al buscador',
    aiChatInputPlaceholder: 'Escribe un mensaje a Orb...',
    aiChatSendAria: 'Enviar mensaje a Orb IA',
    aiChatModeChat: 'Chat',
    aiChatModeImage: 'Imágenes',
    aiRoleLabel: 'Rol & Modelo',
    aiRoleAuto: 'Auto',
    aiRoleAssistant: 'General · Hydrogen',
    aiRoleFast: 'Rápido · Flash Lite',
    aiRoleInteractive: 'Interactivo · Neon',
    aiRoleReasoning: 'Razonamiento · Carbon',
    aiImagePlaceholder: 'Describe una imagen para crear o cómo editar la adjunta...',
    aiImageUploadLabel: 'Subir imagen para editar',
    aiImageClearUpload: 'Quitar adjunto',
    aiImageEditBtn: 'Editar imagen',
    aiImageDownloadBtn: 'Descargar',
    aiImageLoading: 'Generando con Nano Banana 2.1...',
    aiImageEditingBanner: 'Modo de edición de imagen activo',
    aiImageRatioLabel: 'Formato',
    a11ySectionTitle: 'Accesibilidad y Navegación con Teclado',
    a11yMotionLabel: 'Movimiento y animaciones',
    a11yMotionSystem: 'Sistema',
    a11yMotionReduce: 'Reducir',
    a11yMotionFull: 'Completas',
    a11yHighContrastLabel: 'Alto contraste',
    a11yHighContrastDesc: 'Aumenta el contraste de bordes, controles y textos secundarios.',
    a11yLargeTextLabel: 'Texto ampliado',
    a11yLargeTextDesc: 'Incrementa el tamaño de lectura en paneles, ajustes y textos legales.',
    a11yFocusRingsLabel: 'Indicadores de foco visibles',
    a11yFocusRingsDesc: 'Destaca con mayor claridad el elemento seleccionado con la tecla Tab.',
    a11yKeyboardHint: 'Orden de tabulación lógico (tabindex) activo en toda la interfaz.',
    supportLetterTitle: 'Un mensaje de Orb',
    supportLetterParagraphs: [
      'Holaaaa, verás...',
      'Soy Orb. Un diminuto ser esférico vivo con una imaginación demasiado grande y planes MUY ambiciosos.',
      'Estamos construyendo algo GRANDE: nuevas ideas, proyectos locos y todo un universo de posibilidades.',
      'Por desgracia, los sueños no funcionan con magia. (Lo he intentado.)',
      'Así que invítame a un café y ayúdame a financiar mi cuestionable existencia para seguir siendo un pequeño Orb vivo.',
      'Sigue siendo orb-some. 💜',
    ],
    supportPillars: [
      {
        title: 'Cero anuncios',
        desc: 'Sin rastreadores ni banners: tu página de inicio sigue limpia y rápida.',
      },
      {
        title: 'Mascota viva',
        desc: 'Animaciones fluidas, audio procedural y reacciones expresivas.',
      },
      {
        title: 'Futuro Orb IA',
        desc: 'Impulsa el desarrollo y futuros servidores dedicados para Orb.',
      },
    ],
    supportLegalLinkLabel: 'Leer nota legal sobre donaciones voluntarias',
    changelogSectionTitle: 'Historial de versiones',
    changelogSubtitle: 'Descubre qué se ha añadido y mejorado en cada versión.',
    changelogCurrentTag: 'Actual',
    changelogEntries: [
      {
        version: 'v2.5.0',
        dateLabel: 'Noviembre 2026',
        title: 'Estudio Gemini Multi-Modelo, VFX y Smart Home',
        isCurrent: true,
        items: [
          'Chat multi-turno con roles y modelos: Gemini 4 Carbon, Gemini 4 Neon, Gemini 4 Hydrogen y Gemini 3.1 Flash Lite.',
          'Creación y edición de imágenes con Gemini Nano Banana 2.1 usando exclusivamente tu clave API personal.',
          'Bóveda de 5 capas (Split-XOR, cascada AES-256-GCM + ChaCha20-Poly1305, HMAC-SHA256 y transporte ofuscado).',
          'Fondo animado más suave y transparente, página de apoyo con VFX traducida a 5 idiomas, mejoras para pantallas Smart Home y Changelog.',
        ],
      },
      {
        version: 'v2.4.0',
        dateLabel: 'Noviembre 2026',
        title: 'Vista Chatbot dedicada y Accesibilidad',
        items: [
          'Vista de conversación dedicada con flecha de retorno al buscador.',
          'Preferencias de accesibilidad completas y navegación tabindex.',
        ],
      },
      {
        version: 'v2.3.0',
        dateLabel: 'Octubre 2026',
        title: 'Modo Espera y Enlaces rápidos',
        items: [
          'Reloj gigante y clima local en modo espera, con Threads e Instagram por defecto.',
        ],
      },
    ],
    donationPopupBadge: 'Apoya a Orbit',
    donationPopupTitle: '¿Estás disfrutando la experiencia en Orbit?',
    donationPopupBody: 'Orbit es gratuito, sin anuncios y de código abierto. Si te resulta útil cada día, considera hacer una donación voluntaria para impulsar el desarrollo.',
    donationPopupCtaCoffee: 'Buy me a coffee',
    donationPopupCtaOpenSection: 'Ver por qué',
    donationPopupLater: 'Más tarde',
    donationPopupNever: 'No volver a mostrar',
    donationPopupLegalLink: 'Nota legal sobre donaciones voluntarias',
    standbyButtonLabel: 'Modo espera',
    standbyAriaLabel: 'Activar modo espera de escritorio',
    standbyExitHint: 'Haz clic para salir',
    weatherClear: 'Despejado',
    weatherCloudy: 'Nublado',
    weatherFog: 'Niebla',
    weatherRain: 'Lluvia',
    weatherSnow: 'Nieve',
    weatherStorm: 'Tormenta',
  },
};

// In-memory + localStorage translation cache for zero-flicker instant switching
const memoryCache = new Map<string, UiDictionary>();

export function detectLocaleAndJurisdiction(
  browserLang?: string,
  timeZone?: string
): LocaleRegionOption {
  const rawLang = (
    browserLang ??
    (typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'it-IT')
  ).toLowerCase();

  const tz = (
    timeZone ??
    (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Europe/Rome')
  ).toLowerCase();

  // Timezone + browser language regional resolution
  if (tz === 'europe/rome' || rawLang.startsWith('it')) {
    return LOCALE_REGION_OPTIONS[0]; // it-IT
  }
  if (tz === 'europe/london' || rawLang === 'en-gb') {
    return LOCALE_REGION_OPTIONS[2]; // en-UK
  }
  if (
    rawLang === 'en-us' ||
    tz.startsWith('america/new_york') ||
    tz.startsWith('america/chicago') ||
    tz.startsWith('america/denver') ||
    tz.startsWith('america/los_angeles') ||
    tz.startsWith('america/phoenix') ||
    tz.startsWith('america/anchorage') ||
    tz.startsWith('pacific/honolulu')
  ) {
    return LOCALE_REGION_OPTIONS[3]; // en-US
  }
  if (rawLang.startsWith('fr')) return LOCALE_REGION_OPTIONS[4]; // fr-EU
  if (rawLang.startsWith('de')) return LOCALE_REGION_OPTIONS[5]; // de-EU
  if (rawLang.startsWith('es') && tz.startsWith('europe/')) return LOCALE_REGION_OPTIONS[6]; // es-EU
  if (tz.startsWith('europe/')) return LOCALE_REGION_OPTIONS[1]; // en-EU

  return LOCALE_REGION_OPTIONS[7]; // en-GLOBAL
}

export function getInitialLocaleOption(): LocaleRegionOption {
  const savedId = readStorage<string | null>(STORAGE_KEYS.localeRegion, null);
  if (savedId) {
    const found = LOCALE_REGION_OPTIONS.find((opt) => opt.id === savedId);
    if (found) return found;
  }
  return detectLocaleAndJurisdiction();
}

export function getCachedDictionary(lang: LanguageCode, jurisdiction: JurisdictionCode): UiDictionary {
  const cacheKey = `${lang}:${jurisdiction}:v11`;
  const memHit = memoryCache.get(cacheKey);
  if (memHit) return memHit;

  const storedCache = readStorage<Record<string, UiDictionary>>(STORAGE_KEYS.i18nCache, {});
  if (storedCache[cacheKey]) {
    memoryCache.set(cacheKey, storedCache[cacheKey]);
    return storedCache[cacheKey];
  }

  const dict = DICTIONARIES[lang] ?? DICTIONARIES.en;
  memoryCache.set(cacheKey, dict);
  storedCache[cacheKey] = dict;
  writeStorage(STORAGE_KEYS.i18nCache, storedCache);
  return dict;
}

export function prewarmTranslationCache(): void {
  const bundle: Record<string, UiDictionary> = {};
  for (const opt of LOCALE_REGION_OPTIONS) {
    const cacheKey = `${opt.lang}:${opt.jurisdiction}:v11`;
    const dict = DICTIONARIES[opt.lang] ?? DICTIONARIES.en;
    memoryCache.set(cacheKey, dict);
    bundle[cacheKey] = dict;
  }
  writeStorage(STORAGE_KEYS.i18nCache, bundle);
}
