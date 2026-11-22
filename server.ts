import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAudioProfilePayload } from './server/orbPersonality.ts';
import { stepOrbEngine } from './server/orbMotionEngine.ts';
import { fetchFreeUnlimitedSuggestions } from './server/suggestProxy.ts';
import { getLocalWeather } from './server/weatherService.ts';
import { getLegalSections } from './server/legalContentServer.ts';
import type { OrbStepRequest } from './src/types/orbit.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '16kb' }));

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
      event: body.event ?? null,
    });
    res.json(result);
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
