import type { JurisdictionCode, LanguageCode, LegalSection } from '../src/types/orbit.ts';

function buildItalianLegalSections(jurisdiction: JurisdictionCode): LegalSection[] {
  const jurisdictionNotice =
    jurisdiction === 'IT'
      ? 'La presente informativa è redatta in piena conformità al Regolamento (UE) 2016/679 (GDPR), al D.Lgs. 196/2003 (Codice Privacy novellato dal D.Lgs. 101/2018) e alle Linee Guida del Garante per la protezione dei dati personali. (1) Natura del trattamento reale dell’applicazione: Orbit è un’applicazione web priva di database di profilazione e priva di account utente; le preferenze di tema, colore fluo, link rapidi, lingua, cronologia di ricerca locale e stato del consenso sono salvate nella memoria locale del dispositivo (localStorage) sotto il pieno controllo dell’utente. (2) Trasferimento verso motori di ricerca: solo su azione esplicita di invio o clic da parte dell’utente il browser apre l’URL o inoltra la query al motore di ricerca selezionato (Google, Bing o DuckDuckGo), il quale opera come titolare autonomo. (3) Diritti dell’interessato: ai sensi degli artt. 15–22 GDPR puoi accedere, rettificare, cancellare i dati locali in qualsiasi momento tramite le Impostazioni o la pulizia del browser, nonché proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).'
      : 'Informativa conforme al GDPR (UE) 2016/679 per l’area SEE/UE: (1) Orbit elabora le preferenze di personalizzazione esclusivamente nel browser (localStorage) senza profilazione su server remoti; (2) Nessun dato personale viene venduto o ceduto a intermediari terzi; (3) L’utente gode dei diritti di accesso, rettifica, cancellazione, limitazione e opposizione ai sensi degli artt. 15–22 GDPR.';

  return [
    {
      id: 'privacy-giurisdizione',
      number: '0',
      title: 'Informativa Privacy Specifica per Giurisdizione (Audit Reale Pagina)',
      body: jurisdictionNotice,
    },
    {
      id: 'titolare-progetto',
      number: '1',
      title: 'Titolare del Progetto e Natura Open-Source',
      body:
        'Orbit è un progetto web personale, gratuito, non commerciale e open-source ideato e mantenuto da un privato cittadino (Daniele Mastrorilli). (1) Assenza di forma societaria: Orbit non fa capo ad alcuna S.r.l., società di capitali, impresa commerciale né soggetto dotato di Partita IVA, REA o capitale sociale; (2) Progetto open-source su GitHub: il codice sorgente è pubblicato pubblicamente su GitHub così da consentire a chiunque di ispezionare in totale trasparenza il funzionamento dell’applicazione e l’assenza di tracciamento remoto; (3) Finalità non commerciale: la pagina è offerta gratuitamente alla community senza pubblicità, abbonamenti né vendite.',
    },
    {
      id: 'contatti-diretti',
      number: '2',
      title: 'Contatti Diretti e Canale GitHub',
      body:
        'Trattandosi di un progetto privato open-source gestito da Daniele Mastrorilli, non è prevista una casella PEC aziendale né un ufficio commerciale. Per richieste relative alla privacy (GDPR, UK GDPR, CCPA/CPRA, LGPD, PIPEDA), segnalazioni di bug, feedback sull’accessibilità o comunicazioni formali puoi contattare direttamente lo sviluppatore tramite la repository pubblica del progetto su GitHub (sezione Issues / Discussions o profilo del maintainer Daniele Mastrorilli). Le segnalazioni ricevute vengono prese in carico nel minor tempo possibile e comunque entro i termini di legge applicabili.',
    },
    {
      id: 'cookie-policy',
      number: '3',
      title: 'Cookie Policy, Blocco Preventivo e Gestione Consensi (2026)',
      body:
        'Orbit adotta un’architettura privacy-by-default pienamente conforme alle direttive ePrivacy e alle linee guida 2026 contro i dark pattern: (1) Blocco preventivo: all’apertura della pagina nessuna richiesta verso API di completamento esterne (DuckDuckGo / Google Suggest) viene eseguita senza il tuo consenso preventivo esplicito, restando attive esclusivamente le chiavi tecniche in localStorage necessarie a tema, colore fluo, link rapidi, lingua e stato del consenso; (2) Pari visibilità senza dark pattern: i pulsanti Accetta tutti, Rifiuta non essenziali e Personalizza scelte sono presentati con identico peso visivo, contrasto e accessibilità immediata; (3) Diritto di revoca continua: puoi rivedere, modificare o revocare le tue scelte in qualunque momento utilizzando i controlli interattivi sottostanti o il collegamento nel footer.',
      hasCookieControls: true,
    },
    {
      id: 'termini-condizioni',
      number: '4',
      title: 'Termini e Condizioni d’Uso e Licenza Open-Source',
      body:
        'L’accesso e l’utilizzo dell’interfaccia Orbit sono disciplinati dalle presenti condizioni d’uso: (1) Utilizzo gratuito e lecito: Orbit è reso disponibile gratuitamente da Daniele Mastrorilli come pagina iniziale interattiva di ricerca e navigazione rapida per uso personale o professionale lecito; (2) Codice sorgente open-source su GitHub: il codice sorgente e le modalità di riutilizzo, modifica e distribuzione seguono la licenza open-source indicata nella repository ufficiale su GitHub; (3) Assenza di attività e-commerce: la pagina non effettua vendite online, non gestisce pagamenti né raccoglie dati di fatturazione; (4) Limitazione di responsabilità: i collegamenti rapidi configurati dall’utente e i risultati dei motori di ricerca esterni appartengono a siti terzi indipendenti sui quali l’autore del progetto non esercita alcun controllo editoriale né garanzia di disponibilità.',
    },
    {
      id: 'accessibilita',
      number: '5',
      title: 'Accessibilità (WCAG 2.1 / 2.2 AA ed European Accessibility Act)',
      body:
        'In conformità all’European Accessibility Act (Direttiva UE 2019/882, recepita dal D.Lgs. 82/2022) e agli standard internazionali WCAG 2.1 e 2.2 livello AA: (1) Contrasto e leggibilità: ogni combinazione cromatico-fluo dei temi Chiaro e Scuro applica testi e icone ad alto contrasto verificato con soglia minima 4.5:1; (2) Navigazione da tastiera e lettori di schermo: tutti i controlli interattivi utilizzano elementi HTML nativi semantici, anelli di messa a fuoco visibili (focus-visible), attributi ARIA descrittivi e chiusura modale tramite tasto Esc; (3) Rispetto delle preferenze motorie: l’interfaccia rileva la media query prefers-reduced-motion riducendo le animazioni continue; (4) Segnalazioni di Accessibilità: eventuali barriere riscontrate possono essere segnalate direttamente nella repository GitHub del progetto curato da Daniele Mastrorilli.',
    },
    {
      id: 'trasparenza-ai',
      number: '6',
      title: 'Trasparenza sull’Intelligenza Artificiale (EU AI Act 2024/1689)',
      body:
        'Ai sensi degli obblighi di trasparenza previsti dal Regolamento (UE) 2024/1689 (EU AI Act, Art. 50): (1) Avviso esplicito sulla natura dell’assistente visivo: la mascotte animata Orbit presente al centro della pagina utilizza un motore geometrico deterministico gestito lato server (tracciamento matematico dello sguardo rispetto al cursore o al cursore di testo, reazioni predefinite al clic ed espressioni fisiche simulate) e nella versione attuale NON integra un modello linguistico generativo autonomo (LLM); (2) Contenuti e ricerche esterne: qualora l’utente invii una query verso motori di ricerca esterni o servizi terzi dotati di funzionalità di IA generativa, tali sistemi operano al di fuori di Orbit sotto le rispettive informative e marcature di trasparenza ai sensi dell’AI Act.',
    },
    {
      id: 'sicurezza',
      number: '7',
      title: 'Sicurezza delle Connessioni e Protezione dei Dati',
      body:
        'La sicurezza tecnica del servizio si fonda su principi di minimizzazione e cifratura: (1) Trasporto cifrato HTTPS/TLS (SSL): ogni sessione di caricamento della pagina e ogni eventuale richiesta autorizzata avvengono su canale cifrato HTTPS con protocolli TLS aggiornati per prevenire intercettazioni o manomissioni in transito; (2) Isolamento locale: i collegamenti rapidi e le preferenze visive non vengono mai trasmessi a database centrali di profilazione; (3) Validazione degli URL: tutti gli indirizzi inseriti dall’utente nei link rapidi vengono sanitizzati per impedire schemi pericolosi (es. javascript:).',
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
    GLOBAL: 'International Privacy Notice (LGPD Brazil, PIPEDA Canada & Global Frameworks): Orbit minimizes data processing to strictly local preferences. Any cross-border request to an external search engine occurs exclusively at your explicit navigation command, respecting LGPD (Art. 18), PIPEDA fair information principles, and international transfer safeguards.',
  };

  return [
    {
      id: 'privacy-giurisdizione',
      number: '0',
      title: `Jurisdiction-Specific Privacy Notice (${jurisdiction}) — Live Audit`,
      body: `${jurisdictionLead[jurisdiction]} (1) Real application data audit: Orbit runs without user registration, remote analytics trackers, or e-commerce payment forms; (2) Local storage items are limited to theme mode, neon accent selection, custom quick links (max 4), locale/jurisdiction choice, translation cache, local search history, and cookie consent status; (3) External search suggestions are only proxied when you explicitly opt in to third-party autocomplete.`,
    },
    {
      id: 'titolare-progetto',
      number: '1',
      title: 'Project Ownership & Open-Source Attribution',
      body:
        'Orbit is a free, non-commercial, open-source personal web project created and maintained privately by an individual developer (Daniele Mastrorilli). (1) No Corporate Entity: Orbit is NOT operated by an S.r.l., limited liability company, commercial firm, or VAT-registered business; (2) Open-Source on GitHub: the project source code is openly published on GitHub so anyone can inspect its architecture and zero-tracking privacy guarantees; (3) Non-Commercial Purpose: Orbit runs ad-free with zero paid subscriptions, purchases, or tracking databases.',
    },
    {
      id: 'contatti-diretti',
      number: '2',
      title: 'Direct Contact & GitHub Repository',
      body:
        'Because Orbit is an independent open-source project maintained by Daniele Mastrorilli rather than a commercial company, there is no corporate PEC address or sales office. For privacy inquiries (GDPR, UK GDPR, CCPA/CPRA, LGPD, PIPEDA), accessibility feedback, bug reports, or legal notices, please reach the maintainer Daniele Mastrorilli directly through the public GitHub repository (Issues, Discussions, or maintainer profile). Verified requests are addressed promptly within applicable statutory response timeframes.',
    },
    {
      id: 'cookie-policy',
      number: '3',
      title: 'Cookie Policy, Preventive Blocking & Equal-Prominence Consent (2026)',
      body:
        'Orbit enforces privacy-by-default rules compliant with ePrivacy and 2026 anti-dark-pattern guidelines: (1) Preventive blocking: before explicit user consent, all non-essential external suggestion requests (DuckDuckGo / Google Suggest) are blocked by code, while strictly technical localStorage keys remain active to render your chosen UI state; (2) Equal visual prominence: Accept All, Reject Non-Essential, and Customize Choices are displayed with equal visual weight and zero manipulative design; (3) Continuous right to review: you can revisit, update, or withdraw consent anytime below or via the footer link.',
      hasCookieControls: true,
    },
    {
      id: 'termini-condizioni',
      number: '4',
      title: 'Terms & Conditions and Open-Source License',
      body:
        'Access to and use of Orbit is governed by these terms: (1) Permitted Use: Orbit is provided free of charge by Daniele Mastrorilli as an interactive startpage and search launcher for lawful personal or professional browsing; (2) Open-Source License on GitHub: the source code and permissions to inspect, fork, modify, or redistribute are governed by the open-source license published in the official GitHub repository; (3) No E-Commerce Activity: Orbit processes zero paid transactions, online sales, or billing data; (4) Limitation of Liability: third-party websites reached via quick links or external search engines operate independently with no warranty or editorial control from the maintainer.',
    },
    {
      id: 'accessibilita',
      number: '5',
      title: 'Accessibility Statement (WCAG 2.1 / 2.2 AA & European Accessibility Act)',
      body:
        'Aligned with the European Accessibility Act (Directive (EU) 2019/882) and W3C WCAG 2.1 / 2.2 Level AA: (1) Contrast & Typography: light and dark palettes and all fluo accents pair foreground text with verified contrast ratios of at least 4.5:1; (2) Keyboard & Assistive Tech: every control uses semantic native HTML elements, visible focus indicators, descriptive ARIA labels, and Escape key modal dismissal; (3) Motion Safety: idle animations automatically respect prefers-reduced-motion; (4) Accessibility Feedback: please report any barrier in the public GitHub repository maintained by Daniele Mastrorilli for prompt remediation.',
    },
    {
      id: 'trasparenza-ai',
      number: '6',
      title: 'AI Transparency Disclosure (EU AI Act 2024/1689)',
      body:
        'Pursuant to Article 50 of Regulation (EU) 2024/1689 (EU AI Act): (1) Explicit System Notice: the animated Orbit mascot at the center of the page is powered purely by deterministic server-assisted procedural math (cursor and text-caret eye tracking, click-triggered reactions, and damped spring physics) and in its current release is NOT an autonomous generative Large Language Model (LLM); (2) Third-Party AI Search Engines: any query you choose to send to an external search provider that displays AI-generated summaries is governed by that provider’s own AI Act transparency disclosures.',
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
      '1. Propriétaire du Projet et Nature Open-Source (GitHub)',
      '2. Contact Direct et Dépôt GitHub',
      '3. Politique Cookies, Blocage Préventif et Consentement (2026)',
      '4. Conditions d’Utilisation et Licence Open-Source',
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
          ? `Conformité RGPD (UE) 2016/679 : (1) Orbit stocke vos préférences localement via localStorage sans base de données de profilage ; (2) Aucune requête de suggestion externe n’est envoyée sans consentement explicite ; (3) Vous disposez des droits d’accès, de rectification et d’effacement.`
          : idx === 1
            ? `Orbit est un projet personnel gratuit, non commercial et open-source créé et maintenu à titre privé par Daniele Mastrorilli (aucune société ou S.r.l.), avec code source public hébergé sur GitHub.`
            : idx === 2
              ? `Pour toute question relative à la confidentialité, à l’accessibilité ou au projet open-source, vous pouvez contacter directement Daniele Mastrorilli via le dépôt public sur GitHub.`
              : idx === 3
                ? `Architecture sans dark pattern conforme 2026 : (1) Blocage préventif des API de suggestions tierces avant consentement ; (2) Boutons Accepter, Refuser et Personnaliser de visibilité strictement égale ; (3) Modification possible à tout moment ci-dessous.`
                : sec.body,
    }));
  }
  if (lang === 'de') {
    const titles = [
      `Datenschutzhinweise nach Rechtsraum (${jurisdiction})`,
      '1. Projektinhaber & Open-Source-Status (GitHub)',
      '2. Direkter Kontakt über GitHub',
      '3. Cookie-Richtlinie, Präventives Blockieren & Einwilligung (2026)',
      '4. Nutzungsbedingungen & Open-Source-Lizenz',
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
          : idx === 1
            ? `Orbit ist ein privates, kostenloses, nicht-kommerzielles Open-Source-Projekt von Daniele Mastrorilli (keine S.r.l. oder Firma), dessen Quellcode öffentlich auf GitHub verfügbar ist.`
            : idx === 2
              ? `Für Datenschutzanfragen, Barrierefreiheits-Feedback oder Fehlerberichte wenden Sie sich bitte direkt über das öffentliche GitHub-Repository an Daniele Mastrorilli.`
              : idx === 3
                ? `Cookie- und Einwilligungsmanagement ohne Dark Patterns (2026): (1) Präventive Blockierung nicht notwendiger externer Anfragen; (2) Gleichwertige Schaltflächen für Akzeptieren, Ablehnen und Anpassen; (3) Jederzeitige Widerrufsmöglichkeit unten.`
                : sec.body,
    }));
  }
  const titles = [
    `Política de Privacidad por Jurisdicción (${jurisdiction})`,
    '1. Titular del Proyecto y Naturaleza Open-Source (GitHub)',
    '2. Contacto Directo y Repositorio GitHub',
    '3. Política de Cookies, Bloqueo Preventivo y Consentimiento (2026)',
    '4. Términos de Uso y Licencia de Código Abierto',
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
        : idx === 1
          ? `Orbit es un proyecto personal gratuito, sin fines de lucro y de código abierto desarrollado de forma privada por Daniele Mastrorilli (sin entidad empresarial ni S.r.l.), con su código publicado en GitHub.`
          : idx === 2
            ? `Para consultas de privacidad, accesibilidad o avisos sobre el proyecto open-source, puedes contactar directamente con Daniele Mastrorilli a través del repositorio público en GitHub.`
            : idx === 3
              ? `Gestión de consentimiento sin patrones oscuros (2026): (1) Bloqueo preventivo de APIs externas no esenciales; (2) Botones de igual visibilidad para Aceptar, Rechazar y Personalizar; (3) Modificación disponible en cualquier instante abajo.`
              : sec.body,
  }));
}

const VALID_LANGS = new Set<LanguageCode>(['it', 'en', 'fr', 'de', 'es']);
const VALID_JURISDICTIONS = new Set<JurisdictionCode>(['IT', 'EU', 'UK', 'US', 'GLOBAL']);

export function getLegalSections(rawLang: unknown, rawJurisdiction: unknown): LegalSection[] {
  const lang: LanguageCode =
    typeof rawLang === 'string' && VALID_LANGS.has(rawLang as LanguageCode)
      ? (rawLang as LanguageCode)
      : 'en';
  const jurisdiction: JurisdictionCode =
    typeof rawJurisdiction === 'string' && VALID_JURISDICTIONS.has(rawJurisdiction as JurisdictionCode)
      ? (rawJurisdiction as JurisdictionCode)
      : 'EU';

  if (lang === 'it') return buildItalianLegalSections(jurisdiction);
  if (lang === 'en') return buildEnglishLegalSections(jurisdiction);
  return buildLocalizedSummaryLegalSections(lang, jurisdiction);
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
