import { JurisdictionCode, LanguageCode, LegalSection } from '../types/orbit';
import { readStorage, STORAGE_KEYS, writeStorage } from '../utils/storage';

const legalMemoryCache = new Map<string, LegalSection[]>();

function buildItalianLegalSections(jurisdiction: JurisdictionCode): LegalSection[] {
  const jurisdictionNotice =
    jurisdiction === 'IT'
      ? 'La presente informativa è redatta in piena conformità al Regolamento (UE) 2016/679 (GDPR), al D.Lgs. 196/2003 (Codice Privacy novellato dal D.Lgs. 101/2018) e alle Linee Guida del Garante per la protezione dei dati personali. (1) Natura del trattamento reale dell’applicazione: Orbit è un’applicazione web lato client priva di database remoto di profilazione e priva di account utente; le preferenze di tema, colore fluo, link rapidi, lingua, cronologia di ricerca locale e stato del consenso sono salvate esclusivamente nella memoria locale del dispositivo (localStorage) sotto il pieno controllo dell’utente. (2) Trasferimento verso motori di ricerca: solo su azione esplicita di invio o clic da parte dell’utente il browser apre l’URL o inoltra la query al motore di ricerca selezionato (Google, Bing o DuckDuckGo), il quale opera come titolare autonomo. (3) Diritti dell’interessato: ai sensi degli artt. 15–22 GDPR puoi accedere, rettificare, cancellare i dati locali in qualsiasi momento tramite le Impostazioni o la pulizia del browser, nonché proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).'
      : 'Informativa conforme al GDPR (UE) 2016/679 per l’area SEE/UE: (1) Orbit elabora le preferenze di personalizzazione esclusivamente lato client nel browser (localStorage) senza profilazione su server remoti; (2) Nessun dato personale viene venduto o ceduto a intermediari terzi; (3) L’utente gode dei diritti di accesso, rettifica, cancellazione, limitazione e opposizione ai sensi degli artt. 15–22 GDPR.';

  return [
    {
      id: 'privacy-giurisdizione',
      number: '0',
      title: 'Informativa Privacy Specifica per Giurisdizione (Audit Reale Pagina)',
      body: jurisdictionNotice,
    },
    {
      id: 'dati-societari',
      number: '1',
      title: 'Dati Societari e Fiscali',
      body:
        'Ai sensi dell’art. 2250 c.c., dell’art. 35 D.P.R. 633/1972 e della normativa europea sulle comunicazioni digitali trasparenti 2026: (1) Ragione sociale: Orbit Digital S.r.l.; (2) Sede legale: Via dell’Innovazione 42, 20121 Milano (MI), Italia; (3) Partita IVA: IT12345678901; (4) Codice Fiscale e numero di iscrizione al Registro delle Imprese di Milano-Monza-Brianza-Lodi: 12345678901; (5) Numero REA: MI-2684910; (6) Capitale sociale interamente versato: Euro 50.000,00 i.v.; (7) Stato della società: società attiva, non in stato di liquidazione né sottoposta a procedure concorsuali.',
    },
    {
      id: 'contatti-diretti',
      number: '2',
      title: 'Contatti Diretti (Email Ordinaria e PEC)',
      body:
        'Per comunicazioni legali, richieste esercizio diritti GDPR/CCPA/UK GDPR, segnalazioni di accessibilità o supporto tecnico sono disponibili i seguenti canali ufficiali diretti: (1) Posta elettronica ordinaria e supporto privacy: privacy@orbit-start.example e info@orbit-start.example; (2) Posta Elettronica Certificata (PEC) con valore legale per notifiche e comunicazioni formali: orbitdigital@pec.it; (3) Tempo medio di riscontro alle istanze degli interessati: entro 30 giorni dalla ricezione ai sensi dell’art. 12 par. 3 GDPR.',
    },
    {
      id: 'cookie-policy',
      number: '3',
      title: 'Cookie Policy, Blocco Preventivo e Gestione Consensi (2026)',
      body:
        'Orbit adotta un’architettura privacy-by-default pienamente conforme alle direttive ePrivacy e alle linee guida 2026 contro i dark pattern: (1) Blocco preventivo: all’apertura della pagina nessuna richiesta verso API esterne non essenziali (inclusi gli endpoint di completamento automatico di terze parti Wikipedia o DuckDuckGo) viene eseguita senza il tuo consenso preventivo esplicito, restando attive esclusivamente le chiavi tecniche in localStorage necessarie a tema, colore fluo, link rapidi, lingua e stato del consenso; (2) Pari visibilità senza dark pattern: i pulsanti Accetta tutti, Rifiuta non essenziali e Personalizza scelte sono presentati con identico peso visivo, contrasto e accessibilità immediata; (3) Diritto di revoca continua: puoi rivedere, modificare o revocare le tue scelte in qualunque momento utilizzando i controlli interattivi sottostanti o il collegamento nel footer.',
      hasCookieControls: true,
    },
    {
      id: 'termini-condizioni',
      number: '4',
      title: 'Termini e Condizioni d’Uso e Clausole E-Commerce & Consumatori',
      body:
        'L’accesso e l’utilizzo dell’interfaccia Orbit sono disciplinati dalle presenti condizioni generali: (1) Regole d’uso: Orbit è fornito gratuitamente come pagina iniziale interattiva di ricerca e navigazione rapida per uso personale o professionale lecito, con divieto di utilizzo automatizzato abusivo o alterazione malevola del codice; (2) Proprietà intellettuale: il marchio Orbit, l’animazione di avvio, il design dell’assistente orbitale, il codice sorgente e i testi legali appartengono ai rispettivi titolari e non possono essere riprodotti commercialmente senza autorizzazione scritta; (3) Limitazione di responsabilità: i collegamenti rapidi personalizzati dall’utente e i risultati dei motori di ricerca esterni appartengono a siti terzi sui quali Orbit non esercita alcun controllo né assume responsabilità editoriale o di disponibilità; (4) Clausole di trasparenza E-Commerce ex Direttiva Omnibus e Codice del Consumo (D.Lgs. 206/2005): sebbene l’attuale pagina Orbit Start sia interamente gratuita e non effettui vendite online né pagamenti elettronici, per qualunque eventuale servizio digitale a pagamento o modulo e-commerce integrato futuro si applicano la chiara indicazione anticipata del prezzo totale comprensivo di imposte e spese di spedizione prima dell’ordine, i tempi certi di consegna digitale o fisica, il diritto di recesso gratuito entro 14 giorni dalla conclusione del contratto o dalla consegna del bene salvo eccezioni di legge per contenuti digitali già avviati su consenso espresso, e la garanzia legale di conformità di 24 mesi a carico del venditore.',
    },
    {
      id: 'accessibilita',
      number: '5',
      title: 'Accessibilità (WCAG 2.1 / 2.2 AA ed European Accessibility Act)',
      body:
        'In conformità all’European Accessibility Act (Direttiva UE 2019/882, recepita dal D.Lgs. 82/2022) e agli standard internazionali WCAG 2.1 e 2.2 livello AA: (1) Contrasto e leggibilità: ogni combinazione cromatico-fluo dei temi Chiaro e Scuro applica testi e icone ad alto contrasto verificato con soglia minima 4.5:1; (2) Navigazione da tastiera e lettori di schermo: tutti i controlli interattivi utilizzano elementi HTML nativi semantici, anelli di messa a fuoco visibili (focus-visible), attributi ARIA descrittivi e chiusura modale tramite tasto Esc; (3) Rispetto delle preferenze motorie: l’interfaccia rileva la media query prefers-reduced-motion riducendo le animazioni orbitali continue; (4) Dichiarazione di Accessibilità e feedback: eventuali barriere riscontrate possono essere segnalate a privacy@orbit-start.example per la risoluzione prioritaria.',
    },
    {
      id: 'trasparenza-ai',
      number: '6',
      title: 'Trasparenza sull’Intelligenza Artificiale (EU AI Act 2024/1689)',
      body:
        'Ai sensi degli obblighi di trasparenza previsti dal Regolamento (UE) 2024/1689 (EU AI Act, Art. 50): (1) Avviso esplicito sulla natura dell’assistente visivo: la mascotte animata Orbit presente al centro della pagina utilizza un motore geometrico deterministico locale (tracciamento matematico dello sguardo rispetto al cursore o al cursore di testo, reazioni predefinite al clic ed espressioni fisiche simulate) e NON integra un modello linguistico generativo (LLM) né genera risposte autonome automatizzate; (2) Contenuti e ricerche esterne: qualora l’utente invii una query verso motori di ricerca esterni o servizi terzi dotati di funzionalità di IA generativa, tali sistemi operano al di fuori di Orbit sotto le rispettive informative e marcature di trasparenza ai sensi dell’AI Act.',
    },
    {
      id: 'sicurezza',
      number: '7',
      title: 'Sicurezza delle Connessioni e Protezione dei Dati',
      body:
        'La sicurezza tecnica del servizio si fonda su principi di minimizzazione e cifratura: (1) Trasporto cifrato HTTPS/TLS (SSL): ogni sessione di caricamento della pagina e ogni eventuale richiesta autorizzata avvengono su canale cifrato HTTPS con protocolli TLS aggiornati per prevenire intercettazioni o manomissioni in transito; (2) Isolamento locale: i collegamenti rapidi e le preferenze visive non vengono mai trasmessi a server centrali, eliminando il rischio di violazioni di banche dati cloud di profilazione; (3) Validazione degli URL: tutti gli indirizzi inseriti dall’utente nei link rapidi vengono sanitizzati per impedire schemi pericolosi (es. javascript:).',
    },
    {
      id: 'requisiti-usa',
      number: '8',
      title: 'Requisiti Stati Uniti (CCPA/CPRA, Global Privacy Control e COPPA)',
      body:
        'Per gli utenti residenti negli Stati Uniti d’America (inclusi California CCPA/CPRA, VCDPA, CPA e normativa federale): (1) Link e controllo interattivo Do Not Sell or Share My Personal Information: Orbit non vende né condivide dati personali a scopo di pubblicità comportamentale cross-contesto; è comunque disponibile il controllo immediato di Opt-Out sottostante per bloccare qualsiasi condivisione non tecnica; (2) Supporto al segnale Global Privacy Control (GPC): l’applicazione legge automaticamente l’intestazione/proprietà browser navigator.globalPrivacyControl all’avvio e, se attiva, imposta automaticamente l’Opt-Out e disattiva ogni richiesta esterna facoltativa; (3) Tutela dei minori COPPA (Children’s Online Privacy Protection Act): il servizio non è destinato a raccogliere informazioni personali da minori di 13 anni e non effettua alcuna raccolta anagrafica o profilazione comportamentale minorile.',
      hasUsPrivacyControls: true,
    },
    {
      id: 'requisiti-uk-extraue',
      number: '9',
      title: 'Requisiti Regno Unito (UK GDPR / ICO) e Giurisdizioni Extra-UE (LGPD / PIPEDA)',
      body:
        'Per gli utenti residenti nel Regno Unito e nelle principali giurisdizioni internazionali extra-SEE: (1) Regno Unito (UK GDPR e Data Protection Act 2018): il trattamento locale rispetta i principi di liceità e minimizzazione supervisionati dall’Information Commissioner’s Office (ICO, ico.org.uk), garantendo agli interessati UK i medesimi diritti di accesso, rettifica, cancellazione e portabilità; (2) Brasile (LGPD — Lei Geral de Proteção de Dados n. 13.709/2018): sono garantiti i diritti di conferma dell’esistenza del trattamento, revoca del consenso e anonimizzazione sotto vigilanza dell’ANPD; (3) Canada (PIPEDA) e altre aree internazionali: il consenso alle richieste esterne facoltative è sempre espresso, informato e revocabile, con eventuale trasferimento internazionale verso motori di ricerca scelti dall’utente eseguito unicamente su sua richiesta diretta o mediante adeguate garanzie contrattuali (Clausole Contrattuali Standard UE e UK IDTA).',
    },
  ];
}

function buildEnglishLegalSections(jurisdiction: JurisdictionCode): LegalSection[] {
  const jurisdictionLead: Record<JurisdictionCode, string> = {
    IT: 'Italian & EU GDPR Notice: Orbit operates under EU Regulation 2016/679 (GDPR) and Italian Legislative Decree 196/2003 as amended.',
    EU: 'European Union (GDPR 2016/679) Privacy Notice: Orbit processes interface preferences (theme, fluo accent, up to 4 quick links, locale, consent state, and optional local search history) strictly on your device via browser localStorage with zero remote profiling database. Search queries are only dispatched to your chosen search engine upon explicit submission.',
    UK: 'United Kingdom (UK GDPR & Data Protection Act 2018) Privacy Notice: Orbit processes customization settings strictly on your local device without server-side user profiling. UK residents retain full rights of access, erasure, restriction, and complaint to the Information Commissioner’s Office (ICO, ico.org.uk).',
    US: 'United States (CCPA/CPRA, State Privacy Laws & COPPA) Privacy Notice: Orbit does not sell or share personal information for cross-context behavioral advertising, does not maintain user accounts, honors browser Global Privacy Control (GPC) signals automatically, and does not knowingly collect personal information from children under 13 under COPPA.',
    GLOBAL: 'International Privacy Notice (LGPD Brazil, PIPEDA Canada & Global Frameworks): Orbit minimizes data processing to strictly client-side localStorage preferences. Any cross-border request to an external search engine occurs exclusively at your explicit navigation command, respecting LGPD (Art. 18), PIPEDA fair information principles, and international transfer safeguards.',
  };

  return [
    {
      id: 'privacy-giurisdizione',
      number: '0',
      title: `Jurisdiction-Specific Privacy Notice (${jurisdiction}) — Live Audit`,
      body: `${jurisdictionLead[jurisdiction]} (1) Real application data audit: Orbit runs entirely in your browser without user registration, remote analytics trackers, or e-commerce payment forms; (2) Local storage items are limited to theme mode, neon accent selection, custom quick links (max 4), locale/jurisdiction choice, translation cache, local search history, and cookie consent status; (3) External destinations are only contacted when you actively submit a search or explicitly opt in to third-party autocomplete suggestions.`,
    },
    {
      id: 'dati-societari',
      number: '1',
      title: 'Corporate & Fiscal Identification Details',
      body:
        'In accordance with 2026 European & international digital corporate transparency rules: (1) Legal Entity Name: Orbit Digital S.r.l.; (2) Registered Office: Via dell’Innovazione 42, 20121 Milan (MI), Italy; (3) VAT Number: IT12345678901; (4) Tax Code & Business Register ID: 12345678901; (5) Economic Administrative Index (REA): MI-2684910; (6) Paid-in Share Capital: EUR 50,000.00 fully paid in; (7) Liquidation Status: active operating company, not in liquidation or insolvency proceedings.',
    },
    {
      id: 'contatti-diretti',
      number: '2',
      title: 'Direct Contact Channels (Standard Email & Certified PEC)',
      body:
        'For privacy rights requests (GDPR, UK GDPR, CCPA/CPRA, LGPD, PIPEDA), accessibility inquiries, or legal notices: (1) Standard Contact & Data Protection Email: privacy@orbit-start.example and info@orbit-start.example; (2) Certified Electronic Mail (PEC — legally equivalent to registered mail in Italy/EU): orbitdigital@pec.it; (3) Standard response timeframe: within 30 calendar days of verified receipt.',
    },
    {
      id: 'cookie-policy',
      number: '3',
      title: 'Cookie Policy, Preventive Blocking & Equal-Prominence Consent (2026)',
      body:
        'Orbit enforces privacy-by-default rules compliant with ePrivacy and 2026 anti-dark-pattern guidelines: (1) Preventive blocking: before explicit user consent, all non-essential external suggestion requests (Wikipedia OpenSearch / DuckDuckGo API) are blocked by code, while strictly technical localStorage keys remain active to render your chosen UI state; (2) Equal visual prominence: Accept All, Reject Non-Essential, and Customize Choices are displayed with equal visual weight and zero manipulative design; (3) Continuous right to review: you can revisit, update, or withdraw consent anytime below or via the footer link.',
      hasCookieControls: true,
    },
    {
      id: 'termini-condizioni',
      number: '4',
      title: 'Terms & Conditions (Usage, IP, Liability & E-Commerce Clauses)',
      body:
        'Access to and use of Orbit is governed by the following terms: (1) Permitted Use: Orbit is provided free of charge as an interactive startpage and search launcher for lawful personal or professional browsing, prohibiting automated scraping or malicious tampering; (2) Intellectual Property: the Orbit wordmark, boot sequence, orbital mascot geometry, source code, and documentation are protected by copyright and trademark law; (3) Limitation of Liability: external websites reached via quick links or search engines are operated independently by third parties without warranty or editorial endorsement by Orbit; (4) E-Commerce & Consumer Protection Clauses (EU Omnibus Directive & Consumer Rights): while this startpage currently processes zero paid transactions or physical deliveries, any future commercial offering or integrated marketplace module will display full tax-inclusive pricing and delivery fees upfront prior to checkout, provide clear shipping timelines, honor the statutory 14-day right of withdrawal (subject to statutory digital-performance exceptions), and guarantee the mandatory 24-month legal conformity warranty.',
    },
    {
      id: 'accessibilita',
      number: '5',
      title: 'Accessibility Statement (WCAG 2.1 / 2.2 AA & European Accessibility Act)',
      body:
        'Aligned with the European Accessibility Act (Directive (EU) 2019/882) and W3C WCAG 2.1 / 2.2 Level AA: (1) Contrast & Typography: light and dark palettes and all 6 fluo accents pair foreground text with verified contrast ratios of at least 4.5:1; (2) Keyboard & Assistive Tech: every control uses semantic native HTML elements, visible focus indicators, descriptive ARIA labels, and Escape key modal dismissal; (3) Motion Safety: continuous orbital animations automatically respect prefers-reduced-motion; (4) Accessibility Feedback: report any barrier to privacy@orbit-start.example for prompt remediation.',
    },
    {
      id: 'trasparenza-ai',
      number: '6',
      title: 'AI Transparency Disclosure (EU AI Act 2024/1689)',
      body:
        'Pursuant to Article 50 of Regulation (EU) 2024/1689 (EU AI Act): (1) Explicit System Notice: the animated Orbit mascot at the center of the page is powered purely by deterministic local procedural math (cursor and text-caret eye tracking, click-triggered reactions, and damped spring physics) and is NOT a generative Large Language Model (LLM) nor an autonomous AI agent; (2) Third-Party AI Search Engines: any query you choose to send to an external search provider that displays AI-generated summaries is governed by that provider’s own AI Act transparency disclosures.',
    },
    {
      id: 'sicurezza',
      number: '7',
      title: 'Security Measures (HTTPS/TLS Encryption & Local Isolation)',
      body:
        'Orbit protects session integrity through layered technical safeguards: (1) Encrypted Transport: all connections and authorized external lookups use HTTPS/TLS (SSL) encryption in transit; (2) Zero Central Profiling Database: preferences stay isolated in your browser storage, removing central server breach exposure; (3) URL Sanitization: user-configured quick links are validated to permit only safe http:// and https:// protocols.',
    },
    {
      id: 'requisiti-usa',
      number: '8',
      title: 'United States Requirements (CCPA/CPRA, Global Privacy Control & COPPA)',
      body:
        'For residents of California and other US states with comprehensive privacy statutes: (1) Do Not Sell or Share My Personal Information: Orbit does not sell or share personal information for monetary or cross-context behavioral advertising purposes, and provides an interactive opt-out toggle below; (2) Global Privacy Control (GPC): Orbit inspects navigator.globalPrivacyControl on startup and automatically enforces opt-out and disables non-essential external fetches whenever a GPC signal is active; (3) COPPA Compliance: Orbit is a general-audience utility that does not knowingly collect personal information from children under 13 years of age.',
      hasUsPrivacyControls: true,
    },
    {
      id: 'requisiti-uk-extraue',
      number: '9',
      title: 'UK (UK GDPR / ICO) & Non-EU International Requirements (LGPD / PIPEDA)',
      body:
        'For users in the United Kingdom and jurisdictions outside the European Economic Area: (1) United Kingdom: Orbit aligns with the UK GDPR and Data Protection Act 2018 overseen by the ICO, granting UK residents equivalent data access, rectification, and erasure rights; (2) Brazil (LGPD Law No. 13.709/2018) and Canada (PIPEDA): users retain clear consent control, transparency over technical storage, and complaint avenues before ANPD or the Office of the Privacy Commissioner of Canada; (3) Cross-Border Transfers: any international data routing triggered by user-initiated searches relies on user-directed navigation or Standard Contractual Clauses (EU SCCs / UK IDTA).',
    },
  ];
}

function buildLocalizedSummaryLegalSections(
  lang: 'fr' | 'de' | 'es',
  jurisdiction: JurisdictionCode
): LegalSection[] {
  const base = buildEnglishLegalSections(jurisdiction);
  if (lang === 'fr') {
    const titles = [
      `Politique de Confidentialité par Juridiction (${jurisdiction})`,
      '1. Mentions Sociétaires et Fiscales',
      '2. Contacts Directs (Email et PEC)',
      '3. Politique Cookies, Blocage Préventif et Consentement (2026)',
      '4. Conditions Générales, E-Commerce et Droit de Rétractation',
      '5. Accessibilité (WCAG 2.1/2.2 AA & European Accessibility Act)',
      '6. Transparence IA (EU AI Act 2024/1689)',
      '7. Sécurité (HTTPS/TLS)',
      '8. Exigences États-Unis (CCPA/CPRA, GPC, COPPA)',
      '9. Exigences Royaume-Uni (UK GDPR / ICO) et Hors-UE (LGPD / PIPEDA)',
    ];
    return base.map((sec, idx) => ({
      ...sec,
      title: titles[idx] ?? sec.title,
      body:
        idx === 0
          ? `Conformité RGPD (UE) 2016/679 : (1) Orbit fonctionne entièrement côté client via localStorage sans base de données de profilage ; (2) Aucune requête externe non essentielle n’est envoyée sans consentement explicite ; (3) Vous disposez des droits d’accès, de rectification et d’effacement.`
          : idx === 3
            ? `Architecture sans dark pattern conforme 2026 : (1) Blocage préventif des API de suggestions tierces avant consentement ; (2) Boutons Accepter, Refuser et Personnaliser de visibilité strictement égale ; (3) Modification possible à tout moment ci-dessous.`
            : sec.body,
    }));
  }
  if (lang === 'de') {
    const titles = [
      `Datenschutzhinweise nach Rechtsraum (${jurisdiction})`,
      '1. Unternehmens- und Steuerdaten',
      '2. Direkte Kontakte (E-Mail & PEC)',
      '3. Cookie-Richtlinie, Präventives Blockieren & Einwilligung (2026)',
      '4. Nutzungsbedingungen, E-Commerce & 14-Tage-Widerrufsrecht',
      '5. Barrierefreiheit (WCAG 2.1/2.2 AA & European Accessibility Act)',
      '6. KI-Transparenz (EU AI Act 2024/1689)',
      '7. Sicherheit (HTTPS/TLS)',
      '8. US-Anforderungen (CCPA/CPRA, GPC, COPPA)',
      '9. UK- (UK GDPR / ICO) & Nicht-EU-Anforderungen (LGPD / PIPEDA)',
    ];
    return base.map((sec, idx) => ({
      ...sec,
      title: titles[idx] ?? sec.title,
      body:
        idx === 0
          ? `DSGVO-Konformität (EU) 2016/679: (1) Orbit speichert Einstellungen ausschließlich lokal im Browser (localStorage) ohne zentrales Tracking; (2) Externe Suchvorschläge werden präventiv blockiert, bis Sie zustimmen; (3) Auskunfts-, Berichtigungs- und Löschrechte gemäß Art. 15–22 DSGVO bleiben jederzeit gewahrt.`
          : idx === 3
            ? `Cookie- und Einwilligungsmanagement ohne Dark Patterns (2026): (1) Präventive Blockierung nicht notwendiger externer Anfragen; (2) Gleichwertige Schaltflächen für Akzeptieren, Ablehnen und Anpassen; (3) Jederzeitige Widerrufsmöglichkeit unten.`
            : sec.body,
    }));
  }
  const titles = [
    `Política de Privacidad por Jurisdicción (${jurisdiction})`,
    '1. Datos Societarios y Fiscales',
    '2. Contactos Directos (Email y PEC)',
    '3. Política de Cookies, Bloqueo Preventivo y Consentimiento (2026)',
    '4. Términos y Condiciones, Comercio Electrónico y Desistimiento',
    '5. Accesibilidad (WCAG 2.1/2.2 AA y European Accessibility Act)',
    '6. Transparencia de IA (EU AI Act 2024/1689)',
    '7. Seguridad (HTTPS/TLS)',
    '8. Requisitos EE. UU. (CCPA/CPRA, GPC, COPPA)',
    '9. Requisitos Reino Unido (UK GDPR / ICO) y Fuera de la UE (LGPD / PIPEDA)',
  ];
  return base.map((sec, idx) => ({
    ...sec,
    title: titles[idx] ?? sec.title,
    body:
      idx === 0
        ? `Cumplimiento RGPD (UE) 2016/679: (1) Orbit guarda tus preferencias localmente en localStorage sin bases de datos de perfilado; (2) Las sugerencias externas quedan bloqueadas preventivamente hasta obtener consentimiento expreso; (3) Puedes ejercer tus derechos de acceso, rectificación y supresión en cualquier momento.`
        : idx === 3
          ? `Gestión de consentimiento sin patrones oscuros (2026): (1) Bloqueo preventivo de APIs externas no esenciales; (2) Botones de igual visibilidad para Aceptar, Rechazar y Personalizar; (3) Modificación disponible en cualquier instante abajo.`
          : sec.body,
  }));
}

export function getLegalSections(lang: LanguageCode, jurisdiction: JurisdictionCode): LegalSection[] {
  const key = `legal:${lang}:${jurisdiction}:v2`;
  const mem = legalMemoryCache.get(key);
  if (mem) return mem;

  const stored = readStorage<Record<string, LegalSection[]>>(`${STORAGE_KEYS.i18nCache}_legal`, {});
  if (stored[key]) {
    legalMemoryCache.set(key, stored[key]);
    return stored[key];
  }

  let sections: LegalSection[];
  if (lang === 'it') {
    sections = buildItalianLegalSections(jurisdiction);
  } else if (lang === 'en') {
    sections = buildEnglishLegalSections(jurisdiction);
  } else {
    sections = buildLocalizedSummaryLegalSections(lang, jurisdiction);
  }

  legalMemoryCache.set(key, sections);
  stored[key] = sections;
  writeStorage(`${STORAGE_KEYS.i18nCache}_legal`, stored);
  return sections;
}

export function filterLegalSections(sections: LegalSection[], query: string): LegalSection[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return sections;
  return sections.filter(
    (s) =>
      s.title.toLowerCase().includes(trimmed) ||
      s.body.toLowerCase().includes(trimmed) ||
      s.number.toLowerCase().includes(trimmed)
  );
}
