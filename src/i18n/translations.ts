import { JurisdictionCode, LanguageCode, LocaleRegionOption } from '../types/orbit';
import { readStorage, STORAGE_KEYS, writeStorage } from '../utils/storage';

export interface UiDictionary {
  searchPlaceholder: string;
  searchAriaLabel: string;
  searchSubmitAria: string;
  clearHistoryLabel: string;
  settingsAria: string;
  settingsTitle: string;
  settingsSubtitle: string;
  themeLabel: string;
  themeDark: string;
  themeLight: string;
  accentLabel: string;
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
    settingsSubtitle: 'Personalizza aspetto, colore fluo e collegamenti rapidi salvati localmente.',
    themeLabel: 'Tema interfaccia',
    themeDark: 'Scuro',
    themeLight: 'Chiaro',
    accentLabel: 'Colore di accento Fluo',
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
    legalJurisdictionBadge: 'Giurisdizione attiva',
    legalSearchPlaceholder: 'Cerca nel documento (es. cookie, GitHub, open-source, AI, CCPA)...',
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
    cookieFunctionalToggle: 'Suggerimenti di ricerca esterni (Wikipedia / DuckDuckGo API)',
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
  },
  en: {
    searchPlaceholder: 'Search or enter a web address',
    searchAriaLabel: 'Search or enter a web address',
    searchSubmitAria: 'Submit search',
    clearHistoryLabel: 'Clear history',
    settingsAria: 'Open settings',
    settingsTitle: 'Orbit Settings',
    settingsSubtitle: 'Customize theme, neon accent color, and quick links saved locally on your device.',
    themeLabel: 'Interface Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    accentLabel: 'Fluo Accent Color',
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
    legalJurisdictionBadge: 'Active Jurisdiction',
    legalSearchPlaceholder: 'Search document (e.g. cookie, GitHub, open-source, AI, CCPA)...',
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
    cookieFunctionalToggle: 'External search autocomplete suggestions (Wikipedia / DuckDuckGo API)',
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
  },
  fr: {
    searchPlaceholder: 'Rechercher ou saisir une adresse web',
    searchAriaLabel: 'Rechercher ou saisir une adresse web',
    searchSubmitAria: 'Lancer la recherche',
    clearHistoryLabel: 'Effacer l’historique',
    settingsAria: 'Ouvrir les paramètres',
    settingsTitle: 'Paramètres Orbit',
    settingsSubtitle: 'Personnalisez le thème, la couleur fluo et vos raccourcis enregistrés localement.',
    themeLabel: 'Thème de l’interface',
    themeDark: 'Sombre',
    themeLight: 'Clair',
    accentLabel: 'Couleur d’accent Fluo',
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
    legalJurisdictionBadge: 'Juridiction active',
    legalSearchPlaceholder: 'Rechercher (ex. cookie, GitHub, open-source, IA, CCPA)...',
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
    cookieFunctionalToggle: 'Suggestions de recherche externes (API Wikipedia / DuckDuckGo)',
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
  },
  de: {
    searchPlaceholder: 'Suchen oder Webadresse eingeben',
    searchAriaLabel: 'Suchen oder Webadresse eingeben',
    searchSubmitAria: 'Suche starten',
    clearHistoryLabel: 'Verlauf löschen',
    settingsAria: 'Einstellungen öffnen',
    settingsTitle: 'Orbit-Einstellungen',
    settingsSubtitle: 'Design, Neon-Akzentfarbe und lokal gespeicherte Schnellzugriffe anpassen.',
    themeLabel: 'Erscheinungsbild',
    themeDark: 'Dunkel',
    themeLight: 'Hell',
    accentLabel: 'Fluo-Akzentfarbe',
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
    legalJurisdictionBadge: 'Aktiver Rechtsraum',
    legalSearchPlaceholder: 'Dokument durchsuchen (z. B. Cookie, GitHub, Open-Source, KI, CCPA)...',
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
    cookieFunctionalToggle: 'Externe Suchvorschläge (Wikipedia / DuckDuckGo API)',
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
  },
  es: {
    searchPlaceholder: 'Buscar o escribir una dirección web',
    searchAriaLabel: 'Buscar o escribir una dirección web',
    searchSubmitAria: 'Iniciar búsqueda',
    clearHistoryLabel: 'Borrar historial',
    settingsAria: 'Abrir configuración',
    settingsTitle: 'Configuración de Orbit',
    settingsSubtitle: 'Personaliza el tema, el color flúor y los enlaces rápidos guardados localmente.',
    themeLabel: 'Tema de interfaz',
    themeDark: 'Oscuro',
    themeLight: 'Claro',
    accentLabel: 'Color de acento Flúor',
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
    legalJurisdictionBadge: 'Jurisdicción activa',
    legalSearchPlaceholder: 'Buscar en el documento (ej. cookie, GitHub, código abierto, IA, CCPA)...',
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
    cookieFunctionalToggle: 'Sugerencias de búsqueda externas (API Wikipedia / DuckDuckGo)',
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
  const cacheKey = `${lang}:${jurisdiction}:v4`;
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
    const cacheKey = `${opt.lang}:${opt.jurisdiction}:v4`;
    const dict = DICTIONARIES[opt.lang] ?? DICTIONARIES.en;
    memoryCache.set(cacheKey, dict);
    bundle[cacheKey] = dict;
  }
  writeStorage(STORAGE_KEYS.i18nCache, bundle);
}
