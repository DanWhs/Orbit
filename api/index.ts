import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApiApp } from '../server/createApiApp.ts';

const apiApp = createApiApp();

/**
 * Vercel Serverless Function entrypoint for all /api/* requests.
 * Normalizes rewritten /api/index?__orbit_api_path=... requests back to /api/...
 * while preserving original query parameters and request body.
 */
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  const rawUrl = req.url || '/api';
  try {
    const parsed = new URL(rawUrl, 'http://localhost');
    const rewrittenPath = parsed.searchParams.get('__orbit_api_path');
    if (rewrittenPath !== null) {
      parsed.searchParams.delete('__orbit_api_path');
      const cleanSuffix = rewrittenPath.replace(/^\/+/, '');
      const qs = parsed.searchParams.toString();
      req.url = `/api${cleanSuffix ? `/${cleanSuffix}` : ''}${qs ? `?${qs}` : ''}`;
    } else if (!rawUrl.startsWith('/api')) {
      req.url = `/api${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
    }
  } catch {
    // Keep original req.url if URL parsing fails
  }

  apiApp(req as Parameters<typeof apiApp>[0], res as Parameters<typeof apiApp>[1]);
}
