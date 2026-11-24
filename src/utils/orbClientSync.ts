import type { OrbStepEvent, OrbStepRequest, OrbStepResponse } from '../types/orbit';

export interface OrbPollControllerConfig {
  endpoint?: string;
  baseIntervalMs?: number;
  maxBackoffMs?: number;
  fetchImpl?: typeof fetch;
  nowFn?: () => number;
}

export interface OrbPollSnapshot {
  suspended: boolean;
  consecutiveFailures: number;
  lastErrorStatus: number | null;
  nextAllowedSyncAt: number;
  inFlight: boolean;
  disposed: boolean;
}

/**
 * Coordinates /api/orb/step requests safely without request storms:
 * - Prevents overlapping in-flight requests
 * - Enforces a sensible steady heartbeat interval (>= 1000ms)
 * - Coalesces discrete urgent events (click, mode change, pointer exit/enter)
 * - Immediately suspends polling on permanent errors (404, 401, 403, 400)
 * - Applies exponential backoff on transient errors (429, 5xx, offline)
 * - Aborts pending requests cleanly on unmount
 */
export class OrbPollController {
  private readonly endpoint: string;
  private readonly baseIntervalMs: number;
  private readonly maxBackoffMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly nowFn: () => number;

  private inFlight = false;
  private disposed = false;
  private suspended = false;
  private consecutiveFailures = 0;
  private lastErrorStatus: number | null = null;
  private nextAllowedSyncAt = 0;
  private lastSuccessAt = 0;
  private pendingUrgent = false;
  private pendingEvent: OrbStepEvent | null = null;
  private abortController: AbortController | null = null;

  constructor(config: OrbPollControllerConfig = {}) {
    this.endpoint = config.endpoint ?? '/api/orb/step';
    this.baseIntervalMs = Math.max(500, config.baseIntervalMs ?? 1100);
    this.maxBackoffMs = Math.max(2000, config.maxBackoffMs ?? 30000);
    this.fetchImpl = config.fetchImpl ?? ((...args) => fetch(...args));
    this.nowFn = config.nowFn ?? (() => Date.now());
  }

  getSnapshot(): OrbPollSnapshot {
    return {
      suspended: this.suspended,
      consecutiveFailures: this.consecutiveFailures,
      lastErrorStatus: this.lastErrorStatus,
      nextAllowedSyncAt: this.nextAllowedSyncAt,
      inFlight: this.inFlight,
      disposed: this.disposed,
    };
  }

  queueEvent(event: OrbStepEvent | null): void {
    if (!event || this.disposed || this.suspended) return;
    this.pendingEvent = event;
    this.pendingUrgent = true;
  }

  markUrgent(): void {
    if (this.disposed || this.suspended) return;
    this.pendingUrgent = true;
  }

  shouldPollHeartbeat(nowMs = this.nowFn()): boolean {
    if (this.disposed || this.suspended || this.inFlight) return false;
    if (this.consecutiveFailures > 0) {
      return nowMs >= this.nextAllowedSyncAt;
    }
    return nowMs >= this.nextAllowedSyncAt;
  }

  async step(
    buildPayload: (event: OrbStepEvent | null) => OrbStepRequest,
    options: { urgent?: boolean } = {}
  ): Promise<OrbStepResponse | null> {
    if (this.disposed || this.suspended) return null;

    const now = this.nowFn();
    const isUrgent = Boolean(options.urgent || this.pendingUrgent);

    // Respect backoff window even on urgent clicks after transient failures,
    // and never pile concurrent requests on top of an active flight.
    if (this.inFlight) {
      if (isUrgent) this.pendingUrgent = true;
      return null;
    }
    if (this.consecutiveFailures > 0 && now < this.nextAllowedSyncAt) {
      return null;
    }
    if (!isUrgent && now < this.nextAllowedSyncAt) {
      return null;
    }

    this.inFlight = true;
    this.pendingUrgent = false;
    const eventToSend = this.pendingEvent;
    this.pendingEvent = null;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    this.abortController = controller;

    try {
      const res = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(eventToSend)),
        signal: controller?.signal,
      });

      if (this.disposed) return null;

      if (!res.ok) {
        this.lastErrorStatus = res.status;
        // Permanent route / client auth errors suspend polling immediately (zero infinite 404 loops)
        if (res.status === 404 || res.status === 400 || res.status === 401 || res.status === 403 || res.status === 405) {
          this.suspended = true;
          this.pendingEvent = null;
          this.pendingUrgent = false;
          this.nextAllowedSyncAt = Number.POSITIVE_INFINITY;
          return null;
        }

        // Transient rate-limit (429) or server errors (5xx) trigger exponential backoff
        this.consecutiveFailures += 1;
        const retryAfterHeader = res.headers?.get?.('Retry-After');
        const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : NaN;
        const backoffDelay = Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? Math.min(this.maxBackoffMs, retryAfterSec * 1000)
          : Math.min(this.maxBackoffMs, this.baseIntervalMs * Math.pow(2, this.consecutiveFailures));
        this.nextAllowedSyncAt = this.nowFn() + backoffDelay;
        return null;
      }

      const data = (await res.json()) as OrbStepResponse;
      if (this.disposed) return null;

      this.consecutiveFailures = 0;
      this.lastErrorStatus = null;
      this.lastSuccessAt = this.nowFn();
      this.nextAllowedSyncAt = this.lastSuccessAt + this.baseIntervalMs;
      return data;
    } catch {
      if (this.disposed) return null;
      this.consecutiveFailures += 1;
      const backoffDelay = Math.min(
        this.maxBackoffMs,
        this.baseIntervalMs * Math.pow(2, this.consecutiveFailures)
      );
      this.nextAllowedSyncAt = this.nowFn() + backoffDelay;
      return null;
    } finally {
      this.inFlight = false;
      this.abortController = null;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.pendingUrgent = false;
    this.pendingEvent = null;
    try {
      this.abortController?.abort();
    } catch {
      // Ignore abort errors
    }
    this.abortController = null;
  }
}
