import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAudioProfilePayload } from './server/orbPersonality.ts';
import { stepOrbEngine } from './server/orbMotionEngine.ts';
import { fetchFreeUnlimitedSuggestions } from './server/suggestProxy.ts';
import { getLocalWeather } from './server/weatherService.ts';
import { getLegalSections } from './server/legalContentServer.ts';
import {
  clearSealedVaultCookie,
  isValidGeminiKeyFormat,
  maskApiKey,
  readVaultFromRequest,
  sealApiKeyMultiLayer,
  setSealedVaultCookie,
  unpackClientTransportEnvelope,
  verifySameOriginRequest,
} from './server/aiVault.ts';
import {
  askOrbitGemini,
  generateOrEditOrbitImage,
  type GeminiAskError,
} from './server/geminiService.ts';
import type {
  GeminiRoleId,
  ImageAspectRatio,
  LanguageCode,
  OrbStepRequest,
} from './src/types/orbit.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const defaultJson = express.json({ limit: '32kb' });
  const imageJson = express.json({ limit: '10mb' });
  app.use((req, res, next) => {
    if (req.path === '/api/ai/image') {
      imageJson(req, res, next);
      return;
    }
    defaultJson(req, res, next);
  });

  // Basic security headers for backend responses
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
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

  // Seal user-supplied Gemini API key in 5-layer cascade (Split-XOR + AES-256-GCM + ChaCha20-Poly1305 + HMAC) HttpOnly cookie
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

  // Server-side @google/genai multi-turn chatbot endpoint using ONLY user's sealed Gemini key
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

  // Server-side @google/genai Nano Banana 2.1 image create & edit endpoint using ONLY user's sealed Gemini key
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
    const sourceImageBase64 =
      typeof body?.sourceImageBase64 === 'string' ? body.sourceImageBase64 : undefined;
    const sourceMimeType =
      typeof body?.sourceMimeType === 'string' ? body.sourceMimeType : undefined;

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

  if (isProduction) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Orbit server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Orbit server:', err);
  process.exit(1);
});
