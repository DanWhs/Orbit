import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { getAudioProfilePayload } from './orbPersonality.ts';
import { stepOrbEngine } from './orbMotionEngine.ts';
import { fetchFreeUnlimitedSuggestions } from './suggestProxy.ts';
import { getLocalWeather } from './weatherService.ts';
import { getLegalSections } from './legalContentServer.ts';
import {
  clearSealedVaultCookie,
  isValidGeminiKeyFormat,
  maskApiKey,
  readVaultFromRequest,
  sealApiKeyMultiLayer,
  setSealedVaultCookie,
  unpackClientTransportEnvelope,
  verifySameOriginRequest,
} from './aiVault.ts';
import {
  askOrbitGemini,
  generateOrEditOrbitImage,
  type GeminiAskError,
} from './geminiService.ts';
import type {
  GeminiRoleId,
  ImageAspectRatio,
  LanguageCode,
  OrbStepRequest,
} from '../src/types/orbit.ts';

function jsonBodyMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  const defaultJson = express.json({ limit: '32kb' });
  const imageJson = express.json({ limit: '10mb' });

  return (req, res, next) => {
    // Vercel Serverless Functions may pre-parse req.body before invoking Express; skip stream parsing if already present.
    if (req.body !== undefined && typeof req.body === 'object' && req.body !== null) {
      next();
      return;
    }
    if (req.path === '/api/ai/image') {
      imageJson(req, res, next);
      return;
    }
    defaultJson(req, res, next);
  };
}

export function createApiApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(jsonBodyMiddleware());

  // Basic security headers for backend responses
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      uptimeSec: Math.round(process.uptime()),
      serverTime: new Date().toISOString(),
    });
  });

  // Proprietary Orb mascot audio recipes (not bundled in client JS)
  app.get('/api/orb/audio-profile', (_req, res) => {
    res.json(getAudioProfilePayload());
  });

  // Proprietary Orb mascot state machine & expression choreography step
  app.post('/api/orb/step', (req, res) => {
    const body = req.body as Partial<OrbStepRequest> | null;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }
    const result = stepOrbEngine({
      sessionId: typeof body.sessionId === 'string' ? body.sessionId : 'default',
      variant: body.variant === 'mini' ? 'mini' : 'main',
      nowMs: typeof body.nowMs === 'number' ? body.nowMs : Date.now(),
      botSize: typeof body.botSize === 'number' ? body.botSize : 180,
      bootReady: Boolean(body.bootReady),
      menuOpen: Boolean(body.menuOpen),
      standbyMode: Boolean(body.standbyMode),
      supportMode: Boolean(body.supportMode),
      hasQuery: Boolean(body.hasQuery),
      isFocused: Boolean(body.isFocused),
      caretRatio: typeof body.caretRatio === 'number' ? body.caretRatio : 0,
      drag: Boolean(body.drag),
      reduceMotion: Boolean(body.reduceMotion),
      isTouchMode: Boolean(body.isTouchMode),
      pointerOutside: Boolean(body.pointerOutside),
      pointerDx: typeof body.pointerDx === 'number' ? body.pointerDx : 0,
      pointerDy: typeof body.pointerDy === 'number' ? body.pointerDy : 0,
      lastActivityAgoMs: typeof body.lastActivityAgoMs === 'number' ? body.lastActivityAgoMs : 0,
      lastPtrAgoMs: typeof body.lastPtrAgoMs === 'number' ? body.lastPtrAgoMs : 0,
      lastTypedAgoMs: typeof body.lastTypedAgoMs === 'number' ? body.lastTypedAgoMs : 999999,
      event: body.event ?? null,
    });
    res.json(result);
  });

  // Encrypted Gemini BYOK status (never returns raw API key)
  app.get('/api/ai/status', (req, res) => {
    const entry = readVaultFromRequest(req);
    res.json({
      connected: Boolean(entry),
      maskedHint: entry ? entry.maskedHint : null,
      layersActive: entry ? 5 : 0,
    });
  });

  // Seal user-supplied Gemini API key inside 5-layer cascade HttpOnly cookie
  app.post('/api/ai/key', (req, res) => {
    if (!verifySameOriginRequest(req)) {
      res.status(403).json({ error: 'Invalid request origin' });
      return;
    }
    const body = req.body as { apiKey?: unknown; clientEnvelope?: unknown } | null;
    const unpackedFromEnvelope = unpackClientTransportEnvelope(body?.clientEnvelope);
    const candidate = unpackedFromEnvelope ?? body?.apiKey;
    if (!isValidGeminiKeyFormat(candidate)) {
      res.status(400).json({ error: 'Invalid API key format' });
      return;
    }
    const clean = candidate.trim();
    const sealed = sealApiKeyMultiLayer(clean);
    setSealedVaultCookie(req, res, sealed);
    res.json({
      connected: true,
      maskedHint: maskApiKey(clean),
      layersActive: 5,
    });
  });

  // Wipe sealed Gemini API key vault cookie
  app.delete('/api/ai/key', (req, res) => {
    if (!verifySameOriginRequest(req)) {
      res.status(403).json({ error: 'Invalid request origin' });
      return;
    }
    clearSealedVaultCookie(req, res);
    res.json({
      connected: false,
      maskedHint: null,
      layersActive: 0,
    });
  });

  // Server-side @google/genai multi-turn chatbot endpoint using ONLY decrypted user BYOK Gemini key
  app.post('/api/ai/ask', async (req, res) => {
    if (!verifySameOriginRequest(req)) {
      res.status(403).json({ error: 'Invalid request origin' });
      return;
    }
    const vaultEntry = readVaultFromRequest(req);
    if (!vaultEntry) {
      res.status(401).json({
        error: 'No Gemini API key connected yet.',
        code: 'KEY_MISSING',
      });
      return;
    }
    const body = req.body as {
      prompt?: unknown;
      lang?: unknown;
      role?: unknown;
      history?: unknown;
    } | null;
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required', code: 'EMPTY_PROMPT' });
      return;
    }
    const validLangs = new Set<LanguageCode>(['it', 'en', 'fr', 'de', 'es']);
    const lang: LanguageCode =
      typeof body?.lang === 'string' && validLangs.has(body.lang as LanguageCode)
        ? (body.lang as LanguageCode)
        : 'en';
    const validRoles = new Set<GeminiRoleId>([
      'auto',
      'assistant',
      'fast',
      'interactive',
      'reasoning',
    ]);
    const role: GeminiRoleId =
      typeof body?.role === 'string' && validRoles.has(body.role as GeminiRoleId)
        ? (body.role as GeminiRoleId)
        : 'auto';
    const history = Array.isArray(body?.history)
      ? (body.history as Array<{ role: 'user' | 'model'; text: string }>)
      : undefined;

    try {
      const result = await askOrbitGemini({
        apiKey: vaultEntry.apiKey,
        prompt,
        lang,
        role,
        history,
      });
      res.json(result);
    } catch (err: unknown) {
      const geminiErr = err as Partial<GeminiAskError>;
      res.status(geminiErr.statusCode || 502).json({
        error: geminiErr.message || 'AI request failed',
        code: geminiErr.code || 'UPSTREAM_ERROR',
      });
    }
  });

  // Server-side @google/genai Nano Banana 2.1 image create & edit endpoint using ONLY decrypted user BYOK Gemini key
  app.post('/api/ai/image', async (req, res) => {
    if (!verifySameOriginRequest(req)) {
      res.status(403).json({ error: 'Invalid request origin' });
      return;
    }
    const vaultEntry = readVaultFromRequest(req);
    if (!vaultEntry) {
      res.status(401).json({
        error: 'No Gemini API key connected yet.',
        code: 'KEY_MISSING',
      });
      return;
    }
    const body = req.body as {
      prompt?: unknown;
      aspectRatio?: unknown;
      sourceImageBase64?: unknown;
      sourceMimeType?: unknown;
      imageBase64?: unknown;
      mimeType?: unknown;
    } | null;
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required', code: 'EMPTY_PROMPT' });
      return;
    }

    const aspectRatio =
      typeof body?.aspectRatio === 'string'
        ? (body.aspectRatio as ImageAspectRatio)
        : '1:1';
    const rawSource = body?.sourceImageBase64 ?? body?.imageBase64;
    const rawMime = body?.sourceMimeType ?? body?.mimeType;
    const sourceImageBase64 = typeof rawSource === 'string' ? rawSource : undefined;
    const sourceMimeType = typeof rawMime === 'string' ? rawMime : undefined;

    try {
      const result = await generateOrEditOrbitImage({
        apiKey: vaultEntry.apiKey,
        prompt,
        aspectRatio,
        sourceImageBase64,
        sourceMimeType,
      });
      res.json(result);
    } catch (err: unknown) {
      const geminiErr = err as Partial<GeminiAskError>;
      res.status(geminiErr.statusCode || 502).json({
        error: geminiErr.message || 'Image generation failed',
        code: geminiErr.code || 'UPSTREAM_ERROR',
      });
    }
  });

  // Free unlimited keyless autocomplete suggestions (DuckDuckGo + Google Suggest)
  app.get('/api/suggest', async (req, res) => {
    const suggestions = await fetchFreeUnlimitedSuggestions(req.query.q, req.query.lang);
    res.json({ suggestions });
  });

  // Free unlimited keyless local weather (Open-Meteo + GeoJS/timezone fallback)
  app.get('/api/weather', async (req, res) => {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.socket.remoteAddress || '';
    const weather = await getLocalWeather(clientIp, req.query.tz);
    res.json(weather);
  });

  // Legal & Privacy 2026 sections served dynamically from backend
  app.get('/api/legal', (req, res) => {
    const sections = getLegalSections(req.query.lang, req.query.jurisdiction);
    res.json({ sections });
  });

  // Clean JSON 404 for unknown /api/* routes (so unknown API requests return structured 404, not SPA HTML)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found', code: 'NOT_FOUND' });
  });

  return app;
}
