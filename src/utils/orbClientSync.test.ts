import test from 'node:test';
import assert from 'node:assert/strict';
import { OrbPollController } from './orbClientSync';
import type { OrbStepRequest, OrbStepResponse } from '../types/orbit';

function makeDummyPayload(nowMs = 1000): OrbStepRequest {
  return {
    sessionId: 'test-session',
    variant: 'main',
    nowMs,
    botSize: 180,
    bootReady: true,
    menuOpen: false,
    standbyMode: false,
    supportMode: false,
    hasQuery: false,
    isFocused: false,
    caretRatio: 0,
    drag: false,
    reduceMotion: false,
    isTouchMode: false,
    pointerOutside: false,
    pointerDx: 0,
    pointerDy: 0,
    lastActivityAgoMs: 0,
    lastPtrAgoMs: 0,
  };
}

const okResponseBody: OrbStepResponse = {
  presenceState: 'awake',
  activeReaction: 'idle',
  thinkActive: false,
  stopAllAnimations: false,
  poseTarget: {
    dx: 0,
    dy: 0,
    tRot: 0,
    tScX: 1,
    tScY: 1,
    tLW: 1,
    tLH: 1,
    tRW: 1,
    tRH: 1,
    tLY: 0,
    tRY: 0,
    tArcBottom: 0,
    tLFlatTop: 0,
    tRFlatTop: 0,
    tLTBias: 0,
    tRTBias: 0,
    tBobY: 0,
    followPointerLive: true,
    allowNaturalBlink: true,
  },
  soundCue: null,
};

test('OrbPollController immediately suspends retries on permanent 404 (no infinite loop)', async () => {
  let calls = 0;
  let now = 1000;
  const controller = new OrbPollController({
    baseIntervalMs: 1000,
    nowFn: () => now,
    fetchImpl: async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    },
  });

  await controller.step(() => makeDummyPayload(now), { urgent: true });
  assert.equal(calls, 1);
  assert.equal(controller.getSnapshot().suspended, true);
  assert.equal(controller.getSnapshot().lastErrorStatus, 404);

  // Subsequent heartbeats and urgent clicks must make zero further network calls
  now += 60_000;
  assert.equal(controller.shouldPollHeartbeat(now), false);
  await controller.step(() => makeDummyPayload(now), { urgent: true });
  assert.equal(calls, 1);
});

test('OrbPollController applies exponential backoff on 503/429 and resets on 200', async () => {
  let calls = 0;
  let now = 1000;
  let nextStatus = 503;
  const controller = new OrbPollController({
    baseIntervalMs: 1000,
    maxBackoffMs: 16000,
    nowFn: () => now,
    fetchImpl: async () => {
      calls += 1;
      if (nextStatus >= 400) {
        return new Response('{}', { status: nextStatus });
      }
      return new Response(JSON.stringify(okResponseBody), { status: 200 });
    },
  });

  // First failure: backoff 2000ms (until t=3000)
  await controller.step(() => makeDummyPayload(now), { urgent: true });
  assert.equal(calls, 1);
  assert.equal(controller.getSnapshot().consecutiveFailures, 1);
  assert.equal(controller.getSnapshot().suspended, false);

  now += 1500; // t = 2500 < 3000
  await controller.step(() => makeDummyPayload(now), { urgent: true });
  assert.equal(calls, 1, 'Must wait out exponential backoff window');

  // Second failure (429): backoff 4000ms (until t=7000)
  now += 600; // t = 3100
  nextStatus = 429;
  await controller.step(() => makeDummyPayload(now));
  assert.equal(calls, 2);
  assert.equal(controller.getSnapshot().consecutiveFailures, 2);

  // Recovery on 200 resets failure counter cleanly
  now += 4100; // t = 7200
  nextStatus = 200;
  const ok = await controller.step(() => makeDummyPayload(now));
  assert.ok(ok);
  assert.equal(controller.getSnapshot().consecutiveFailures, 0);
  assert.equal(controller.getSnapshot().lastErrorStatus, null);
});

test('OrbPollController prevents overlapping in-flight requests and stops after dispose', async () => {
  let calls = 0;
  let resolveFetch: (res: Response) => void = () => {};
  const controller = new OrbPollController({
    baseIntervalMs: 1000,
    fetchImpl: async (_url, init) => {
      calls += 1;
      return new Promise<Response>((resolve, reject) => {
        resolveFetch = resolve;
        init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
      });
    },
  });

  const p1 = controller.step(() => makeDummyPayload(), { urgent: true });
  const p2 = controller.step(() => makeDummyPayload(), { urgent: true });
  assert.equal(calls, 1, 'Second concurrent call must not spawn another fetch while first is in flight');

  controller.dispose();
  assert.equal(controller.getSnapshot().disposed, true);
  assert.equal(controller.shouldPollHeartbeat(), false);

  // Settle any pending handles cleanly
  resolveFetch(new Response(JSON.stringify(okResponseBody), { status: 200 }));
  await Promise.all([p1, p2]);
});
