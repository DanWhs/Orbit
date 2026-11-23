import type { NextFunction, Request, Response } from 'express';
import type {
  DiagnosticEntry,
  DiagnosticLevel,
  DiagnosticSource,
  DiagnosticsSnapshot,
} from '../src/types/orbit.ts';

const MAX_LOG_ENTRIES = 220;
const SERVER_STARTED_AT = new Date().toISOString();

const entries: DiagnosticEntry[] = [];
let totalRecorded = 0;

export function scrubSensitiveText(raw: string): string {
  return String(raw || '')
    .replace(/AIza[0-9A-Za-z_-]{12,}/g, 'AIza[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/(api[_-]?key|token|secret|cookie|signature)=([^&\s;]+)/gi, '$1=[REDACTED]')
    .slice(0, 420);
}

export function isValidDiagnosticLevel(val: unknown): val is DiagnosticLevel {
  return val === 'info' || val === 'warn' || val === 'error';
}

export function isValidDiagnosticSource(val: unknown): val is DiagnosticSource {
  return val === 'server' || val === 'client' || val === 'ai' || val === 'network';
}

export function recordServerDiagnostic(input: {
  level: DiagnosticLevel;
  source: DiagnosticSource;
  event: string;
  message: string;
  statusCode?: number;
  durationMs?: number;
}): DiagnosticEntry {
  totalRecorded += 1;
  const entry: DiagnosticEntry = {
    id: `srv-${Date.now()}-${totalRecorded}`,
    ts: new Date().toISOString(),
    level: isValidDiagnosticLevel(input.level) ? input.level : 'info',
    source: isValidDiagnosticSource(input.source) ? input.source : 'server',
    event: scrubSensitiveText(input.event).slice(0, 80) || 'event',
    message: scrubSensitiveText(input.message),
    ...(typeof input.statusCode === 'number' && Number.isFinite(input.statusCode)
      ? { statusCode: Math.round(input.statusCode) }
      : {}),
    ...(typeof input.durationMs === 'number' && Number.isFinite(input.durationMs)
      ? { durationMs: Math.max(0, Math.round(input.durationMs)) }
      : {}),
  };

  entries.unshift(entry);
  if (entries.length > MAX_LOG_ENTRIES) {
    entries.length = MAX_LOG_ENTRIES;
  }
  return entry;
}

export function getDiagnosticsSnapshot(): DiagnosticsSnapshot {
  const mem = process.memoryUsage();
  return {
    serverStartedAt: SERVER_STARTED_AT,
    uptimeSec: Math.round(process.uptime()),
    nodeVersion: process.version,
    platform: process.platform,
    memoryRssMb: Math.round((mem.rss / (1024 * 1024)) * 10) / 10,
    heapUsedMb: Math.round((mem.heapUsed / (1024 * 1024)) * 10) / 10,
    totalRecorded,
    entries: entries.slice(),
  };
}

export function clearDiagnostics(): void {
  entries.length = 0;
  recordServerDiagnostic({
    level: 'info',
    source: 'server',
    event: 'diagnostics.cleared',
    message: 'Server diagnostic ring buffer reset by user request.',
  });
}

const HIGH_FREQ_PATHS = new Set(['/api/orb/step', '/api/diagnostics', '/api/health']);

export function diagnosticsMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.path.startsWith('/api/')) {
      next();
      return;
    }
    const startNs = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
      const status = res.statusCode;

      // Skip high-frequency mascot frames and log reads unless anomalous or errored
      if (HIGH_FREQ_PATHS.has(req.path) && status < 400 && durationMs < 1200) {
        return;
      }

      const source: DiagnosticSource = req.path.startsWith('/api/ai/') ? 'ai' : 'server';
      const level: DiagnosticLevel =
        status >= 500 ? 'error' : status >= 400 || durationMs > 1800 ? 'warn' : 'info';

      recordServerDiagnostic({
        level,
        source,
        event: `${req.method} ${req.path}`,
        message: `${req.method} ${req.path} completed with HTTP ${status} in ${Math.round(durationMs)}ms`,
        statusCode: status,
        durationMs,
      });
    });
    next();
  };
}

recordServerDiagnostic({
  level: 'info',
  source: 'server',
  event: 'server.boot',
  message: 'Orbit diagnostics subsystem initialized.',
});
