import { DiagnosticEntry, DiagnosticLevel, DiagnosticSource, HealthProbeResult } from '../types/orbit';
import { readStorage, STORAGE_KEYS, writeStorage } from './storage';

const MAX_CLIENT_LOGS = 80;
let listenersInstalled = false;

function scrubClientText(raw: string): string {
  return String(raw || '')
    .replace(/AIza[0-9A-Za-z_-]{12,}/g, 'AIza[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .slice(0, 320);
}

export function readClientDiagnostics(): DiagnosticEntry[] {
  const stored = readStorage<unknown>(STORAGE_KEYS.diagnosticsLog, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter(
    (item): item is DiagnosticEntry =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof (item as DiagnosticEntry).id === 'string' &&
      typeof (item as DiagnosticEntry).ts === 'string' &&
      typeof (item as DiagnosticEntry).message === 'string'
  );
}

export function recordClientDiagnostic(input: {
  level: DiagnosticLevel;
  source?: DiagnosticSource;
  event: string;
  message: string;
  durationMs?: number;
  shipToServer?: boolean;
}): DiagnosticEntry {
  const entry: DiagnosticEntry = {
    id: `cli-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ts: new Date().toISOString(),
    level: input.level,
    source: input.source ?? 'client',
    event: scrubClientText(input.event).slice(0, 80) || 'client.event',
    message: scrubClientText(input.message),
    ...(typeof input.durationMs === 'number' ? { durationMs: Math.round(input.durationMs) } : {}),
  };

  const existing = readClientDiagnostics();
  const next = [entry, ...existing].slice(0, MAX_CLIENT_LOGS);
  writeStorage(STORAGE_KEYS.diagnosticsLog, next);

  if (input.shipToServer && typeof fetch === 'function') {
    void fetch('/api/diagnostics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'OrbitSearch',
      },
      body: JSON.stringify({
        level: entry.level,
        source: entry.source,
        event: entry.event,
        message: entry.message,
        durationMs: entry.durationMs,
      }),
      keepalive: true,
    }).catch(() => {
      // Ignore offline ship error silently
    });
  }

  return entry;
}

export function clearClientDiagnostics(): void {
  writeStorage(STORAGE_KEYS.diagnosticsLog, []);
}

export function installGlobalDiagnosticListeners(): void {
  if (typeof window === 'undefined' || listenersInstalled) return;
  listenersInstalled = true;

  recordClientDiagnostic({
    level: 'info',
    source: 'client',
    event: 'client.session.start',
    message: `Client UI ready (${window.innerWidth}x${window.innerHeight}).`,
  });

  window.addEventListener('error', (ev) => {
    const loc = ev.filename ? ` (${ev.filename.split('/').pop()}:${ev.lineno})` : '';
    recordClientDiagnostic({
      level: 'error',
      source: 'client',
      event: 'window.error',
      message: `${ev.message || 'Unhandled runtime error'}${loc}`,
      shipToServer: true,
    });
  });

  window.addEventListener('unhandledrejection', (ev) => {
    const reason =
      ev.reason instanceof Error
        ? ev.reason.message
        : typeof ev.reason === 'string'
          ? ev.reason
          : 'Unhandled promise rejection';
    recordClientDiagnostic({
      level: 'error',
      source: 'client',
      event: 'window.unhandledrejection',
      message: reason,
      shipToServer: true,
    });
  });
}

async function timedFetchProbe(
  id: string,
  label: string,
  url: string,
  formatDetail: (payload: Record<string, unknown>, ms: number) => string
): Promise<HealthProbeResult> {
  const start = performance.now();
  try {
    const res = await fetch(url);
    const ms = Math.round(performance.now() - start);
    if (!res.ok) {
      return {
        id,
        label,
        ok: false,
        latencyMs: ms,
        detail: `HTTP ${res.status}`,
      };
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      id,
      label,
      ok: true,
      latencyMs: ms,
      detail: formatDetail(data, ms),
    };
  } catch (err) {
    return {
      id,
      label,
      ok: false,
      latencyMs: Math.round(performance.now() - start),
      detail: err instanceof Error ? err.message : 'Network error',
    };
  }
}

export async function runSystemHealthCheck(): Promise<HealthProbeResult[]> {
  const probes = await Promise.all([
    timedFetchProbe('api-health', 'Backend Core (/api/health)', '/api/health', (data, ms) => {
      const up = typeof data.uptimeSec === 'number' ? data.uptimeSec : 0;
      return `HTTP 200 · uptime ${up}s (${ms}ms)`;
    }),
    timedFetchProbe('ai-vault', 'BYOK Vault (/api/ai/status)', '/api/ai/status', (data, ms) => {
      return data.connected
        ? `Connected (${data.layersActive ?? 5} layers · ${ms}ms)`
        : `Ready · no key linked (${ms}ms)`;
    }),
    timedFetchProbe('weather', 'Weather Service (/api/weather)', '/api/weather', (data, ms) => {
      return `${String(data.city || 'OK')} · ${String(data.tempC ?? '--')}°C (${ms}ms)`;
    }),
    (async (): Promise<HealthProbeResult> => {
      const start = performance.now();
      let storageOk = false;
      let cryptoOk = false;
      try {
        const probeKey = '__orbit_probe__';
        window.localStorage.setItem(probeKey, '1');
        storageOk = window.localStorage.getItem(probeKey) === '1';
        window.localStorage.removeItem(probeKey);
      } catch {
        storageOk = false;
      }
      cryptoOk = Boolean(typeof crypto !== 'undefined' && crypto.subtle);
      const ms = Math.round(performance.now() - start);
      return {
        id: 'browser-capabilities',
        label: 'Browser Storage & WebCrypto',
        ok: storageOk && cryptoOk,
        latencyMs: ms,
        detail: `localStorage=${storageOk ? 'OK' : 'FAIL'} · WebCrypto=${cryptoOk ? 'OK' : 'FAIL'}`,
      };
    })(),
  ]);

  const failures = probes.filter((p) => !p.ok).length;
  recordClientDiagnostic({
    level: failures > 0 ? 'warn' : 'info',
    source: 'network',
    event: 'healthcheck.run',
    message: `Health check finished: ${probes.length - failures}/${probes.length} checks healthy.`,
    shipToServer: true,
  });

  return probes;
}
