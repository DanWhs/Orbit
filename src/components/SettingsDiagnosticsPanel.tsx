import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { UiDictionary } from '../i18n/translations';
import {
  DiagnosticEntry,
  DiagnosticLevel,
  DiagnosticsSnapshot,
  HealthProbeResult,
} from '../types/orbit';
import {
  clearClientDiagnostics,
  readClientDiagnostics,
  runSystemHealthCheck,
} from '../utils/diagnostics';
import { BubbleButton } from './LiquidBubble';

interface SettingsDiagnosticsPanelProps {
  dict: UiDictionary;
  onUserModify?: () => void;
}

export const SettingsDiagnosticsPanel = memo(function SettingsDiagnosticsPanel({
  dict,
  onUserModify,
}: SettingsDiagnosticsPanelProps) {
  const [snapshot, setSnapshot] = useState<DiagnosticsSnapshot | null>(null);
  const [clientLogs, setClientLogs] = useState<DiagnosticEntry[]>(() => readClientDiagnostics());
  const [healthProbes, setHealthProbes] = useState<HealthProbeResult[]>([]);
  const [runningHealth, setRunningHealth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState<'all' | DiagnosticLevel>('all');

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    setClientLogs(readClientDiagnostics());
    try {
      const res = await fetch('/api/diagnostics');
      if (res.ok) {
        setSnapshot((await res.json()) as DiagnosticsSnapshot);
      }
    } catch {
      // Keep client logs visible even if server unreachable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);

  const handleRunHealth = async () => {
    setRunningHealth(true);
    try {
      const results = await runSystemHealthCheck();
      setHealthProbes(results);
      await fetchSnapshot();
      onUserModify?.();
    } finally {
      setRunningHealth(false);
    }
  };

  const handleClear = async () => {
    clearClientDiagnostics();
    setClientLogs([]);
    try {
      const res = await fetch('/api/diagnostics', {
        method: 'DELETE',
        headers: { 'X-Requested-With': 'OrbitSearch' },
      });
      if (res.ok) {
        setSnapshot((await res.json()) as DiagnosticsSnapshot);
      }
    } catch {
      // Ignore offline clear error
    }
    onUserModify?.();
  };

  const mergedLogs = useMemo(() => {
    const serverEntries = snapshot?.entries ?? [];
    const seen = new Set<string>();
    const combined: DiagnosticEntry[] = [];
    for (const item of [...clientLogs, ...serverEntries]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      combined.push(item);
    }
    combined.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    if (levelFilter === 'all') return combined;
    return combined.filter((item) => item.level === levelFilter);
  }, [clientLogs, snapshot, levelFilter]);

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      serverSnapshot: snapshot,
      clientLogs,
      healthProbes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbit-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section
      id="settings-tabpanel-diagnostics"
      role="tabpanel"
      data-testid="settings-panel-diagnostics"
      className="space-y-5 pb-6"
    >
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--acc-text)' }}>
          <Activity className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{dict.settingsTabDiagnostics}</span>
        </div>
        <h3 className="m-0 text-base font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
          {dict.diagSectionTitle}
        </h3>
        <p className="m-0 text-xs leading-relaxed" style={{ color: 'var(--mut)' }}>
          {dict.diagSubtitle}
        </p>
      </div>

      {/* Live Server Metrics */}
      <div className="grid grid-cols-3 gap-2.5">
        <div
          className="rounded-2xl p-3 space-y-1"
          style={{
            backgroundColor: 'var(--glass)',
            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
          }}
        >
          <div className="text-[11px]" style={{ color: 'var(--mut)' }}>
            {dict.diagMetricUptime}
          </div>
          <div data-testid="diag-metric-uptime" className="text-sm font-semibold tabular-nums">
            {snapshot ? `${snapshot.uptimeSec}s` : '—'}
          </div>
        </div>

        <div
          className="rounded-2xl p-3 space-y-1"
          style={{
            backgroundColor: 'var(--glass)',
            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
          }}
        >
          <div className="text-[11px]" style={{ color: 'var(--mut)' }}>
            {dict.diagMetricMemory}
          </div>
          <div data-testid="diag-metric-memory" className="text-sm font-semibold tabular-nums">
            {snapshot ? `${snapshot.heapUsedMb} MB` : '—'}
          </div>
        </div>

        <div
          className="rounded-2xl p-3 space-y-1"
          style={{
            backgroundColor: 'var(--glass)',
            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
          }}
        >
          <div className="text-[11px]" style={{ color: 'var(--mut)' }}>
            {dict.diagMetricTotal}
          </div>
          <div data-testid="diag-metric-total" className="text-sm font-semibold tabular-nums">
            {mergedLogs.length}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <BubbleButton
          variant="solid"
          tabIndex={0}
          disabled={runningHealth}
          data-testid="diagnostics-healthcheck-btn"
          onClick={() => void handleRunHealth()}
          contentClassName="inline-flex items-center gap-2"
          className="h-9 px-4 rounded-full text-xs font-semibold cursor-pointer active:scale-95"
          style={{
            backgroundColor: 'var(--acc)',
            color: 'var(--acc-fg)',
          }}
        >
          <Activity className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{runningHealth ? dict.diagRunningHealth : dict.diagRunHealthBtn}</span>
        </BubbleButton>

        <BubbleButton
          variant="glass"
          tabIndex={0}
          disabled={loading}
          data-testid="diagnostics-refresh-btn"
          onClick={() => void fetchSnapshot()}
          contentClassName="inline-flex items-center gap-1.5"
          className="h-9 px-3.5 rounded-full text-xs font-medium cursor-pointer hover:bg-[var(--glass2)]"
          style={{
            backgroundColor: 'var(--glass)',
            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>{dict.diagRefreshBtn}</span>
        </BubbleButton>

        <BubbleButton
          variant="glass"
          tabIndex={0}
          data-testid="diagnostics-export-btn"
          onClick={handleExportJson}
          contentClassName="inline-flex items-center gap-1.5"
          className="h-9 px-3.5 rounded-full text-xs font-medium cursor-pointer hover:bg-[var(--glass2)]"
          style={{
            backgroundColor: 'var(--glass)',
            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
          }}
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{dict.diagExportBtn}</span>
        </BubbleButton>

        <BubbleButton
          variant="glass"
          tabIndex={0}
          data-testid="diagnostics-clear-btn"
          onClick={() => void handleClear()}
          contentClassName="inline-flex items-center gap-1.5"
          className="h-9 px-3.5 rounded-full text-xs font-medium cursor-pointer hover:bg-red-500/15 hover:text-red-500"
          style={{
            backgroundColor: 'var(--glass)',
            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
          }}
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{dict.diagClearBtn}</span>
        </BubbleButton>
      </div>

      {/* Live Health Probes */}
      {healthProbes.length > 0 && (
        <div
          data-testid="diagnostics-health-results"
          className="rounded-2xl overflow-hidden divide-y"
          style={{
            backgroundColor: 'var(--glass)',
            boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {healthProbes.map((probe) => (
            <div
              key={probe.id}
              data-testid={`health-probe-${probe.id}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {probe.ok ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" aria-hidden="true" />
                ) : (
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" aria-hidden="true" />
                )}
                <span className="font-medium truncate">{probe.label}</span>
              </div>
              <span className="text-[11px] font-mono shrink-0" style={{ color: 'var(--mut)' }}>
                {probe.detail}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Severity Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            ['all', dict.diagFilterAll],
            ['info', dict.diagFilterInfo],
            ['warn', dict.diagFilterWarn],
            ['error', dict.diagFilterError],
          ] as const
        ).map(([lvl, label]) => {
          const active = levelFilter === lvl;
          return (
            <button
              key={lvl}
              type="button"
              tabIndex={0}
              data-testid={`diag-filter-${lvl}`}
              onClick={() => setLevelFilter(lvl)}
              className="h-8 px-3 rounded-full text-xs font-medium cursor-pointer transition-colors"
              style={{
                backgroundColor: active ? 'var(--acc)' : 'var(--glass)',
                color: active ? 'var(--acc-fg)' : 'var(--fg)',
                boxShadow: active ? 'none' : 'inset 0 0 0 1px var(--border-subtle)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Live Stream */}
      <div
        data-testid="diagnostics-log-list"
        className="rounded-2xl overflow-hidden divide-y max-h-[300px] overflow-y-auto orbit-scroll"
        style={{
          backgroundColor: 'var(--glass)',
          boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {mergedLogs.length === 0 ? (
          <p className="m-0 p-4 text-xs" style={{ color: 'var(--mut)' }}>
            {dict.diagEmptyLogs}
          </p>
        ) : (
          mergedLogs.slice(0, 60).map((entry) => (
            <div
              key={entry.id}
              className="px-3.5 py-2.5 space-y-1 text-xs"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      entry.level === 'error'
                        ? 'bg-red-500/20 text-red-400'
                        : entry.level === 'warn'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/15 text-emerald-400'
                    }`}
                  >
                    {entry.level === 'warn' && <AlertTriangle className="inline w-2.5 h-2.5 mr-0.5" />}
                    {entry.level}
                  </span>
                  <span className="text-[10px] font-mono uppercase opacity-65">{entry.source}</span>
                  <span className="font-mono font-medium truncate">{entry.event}</span>
                </div>
                <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--mut)' }}>
                  {entry.ts.replace('T', ' ').slice(0, 19)}
                  {typeof entry.durationMs === 'number' ? ` · ${entry.durationMs}ms` : ''}
                </span>
              </div>
              <p className="m-0 text-[11.5px] leading-snug break-words" style={{ color: 'var(--mut)' }}>
                {entry.message}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
});
