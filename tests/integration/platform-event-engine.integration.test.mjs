import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { createTestDatabase, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { publishCoreEvent, retryCoreEventDeliveries } from "../../functions/_lib/platform-event-engine.ts";

const NOW = Date.UTC(2026, 6, 19, 12);

function event(overrides = {}) {
  return {
    eventId: "quiz:attempt:attempt-1:finished",
    eventType: "GAME_FINISHED",
    occurredAt: NOW,
    organizationId: "org-1",
    userId: "player",
    source: { kind: "game", service: "quiz-attempt-service", gameId: "quiz-biblico", sourceId: "attempt-1" },
    payload: { status: "completed", score: 800 },
    version: 1,
    correlationId: "attempt-1",
    ...overrides,
  };
}

function eventV2(overrides = {}) {
  return event({
    version: 2,
    payload: {
      status: "completed",
      score: 800,
      mode: "official",
      correctAnswers: 8,
      questionsAnswered: 10,
      completedAt: NOW,
      attemptId: "attempt-1",
      gameVersion: "1.0.0",
    },
    ...overrides,
  });
}

function consumer(id, handle, eventTypes = ["GAME_FINISHED"]) {
  return { id, handlerVersion: 1, eventTypes, handle };
}

function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedOrganization(ctx, { id: "org-2" });
  seedUser(ctx, { id: "player" });
  seedUser(ctx, { id: "other", organizationId: "org-2" });
  return ctx;
}

test("a valid server event is persisted and dispatched to independent consumers", async t => {
  const ctx = setup(t);
  const consumers = [
    consumer("statistics", async (received, env) => env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES(?1,?2,?3,'event.statistics','event',?4,'{}',?5)").bind(crypto.randomUUID(), received.organizationId, received.userId, received.eventId, NOW).run()),
    consumer("missions", async (received, env) => env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES(?1,?2,?3,'event.missions','event',?4,'{}',?5)").bind(crypto.randomUUID(), received.organizationId, received.userId, received.eventId, NOW).run()),
  ];
  const result = await publishCoreEvent(ctx.env, event(), consumers, NOW);
  assert.equal(result.status, "completed");
  assert.equal(result.accepted, true);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_event_processing WHERE state='completed'").get().total, 2);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM audit_logs WHERE action LIKE 'event.%'").get().total, 2);
});

test("Event Engine accepts both GAME_FINISHED v1 and v2 with immutable envelope relations", async t => {
  const ctx = setup(t);
  const legacy = event({ eventId: "legacy-finished", source: { kind: "game", service: "quiz-attempt-service", gameId: "quiz-biblico", sourceId: "legacy-attempt" } });
  const current = eventV2();
  assert.equal((await publishCoreEvent(ctx.env, legacy, [], NOW)).status, "completed");
  assert.equal((await publishCoreEvent(ctx.env, current, [], NOW)).status, "completed");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events WHERE event_type='GAME_FINISHED'").get().total, 2);
  assert.deepEqual(ctx.raw.prepare("SELECT event_version version FROM core_platform_events ORDER BY event_version").all().map(row => row.version), [1, 2]);
  await assert.rejects(
    () => publishCoreEvent(ctx.env, eventV2({ payload: { ...current.payload, completedAt: NOW - 1 } }), [], NOW),
    /event_completion_timestamp_conflict/,
  );
  await assert.rejects(
    () => publishCoreEvent(ctx.env, eventV2({ payload: { ...current.payload, attemptId: "another-attempt" } }), [], NOW),
    /event_attempt_source_conflict/,
  );
});

test("repeated and concurrent delivery converges to one event and one consumer effect", async t => {
  const ctx = setup(t);
  let effects = 0;
  const slow = consumer("once", async () => { await new Promise(resolve => setTimeout(resolve, 10)); effects += 1; });
  const results = await Promise.all([
    publishCoreEvent(ctx.env, event(), [slow], NOW),
    publishCoreEvent(ctx.env, event(), [slow], NOW),
    publishCoreEvent(ctx.env, event(), [slow], NOW),
  ]);
  assert.equal(results.filter(item => item.accepted).length, 1);
  assert.equal(effects, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_event_processing").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT state FROM core_platform_event_processing").get().state, "completed");
});

test("an event id cannot be reused for a different immutable fact", async t => {
  const ctx = setup(t);
  await publishCoreEvent(ctx.env, event(), [], NOW);
  await assert.rejects(() => publishCoreEvent(ctx.env, event({ payload: { status: "completed", score: 200 } }), [], NOW), /event_id_conflict/);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events").get().total, 1);
  assert.match(ctx.raw.prepare("SELECT payload_json payload FROM core_platform_events").get().payload, /"score":800/);
});

test("producer, payload, timestamp and tenant validation reject unsafe events without writes", async t => {
  const ctx = setup(t);
  const invalid = [
    event({ source: { kind: "auth", service: "auth-service", sourceId: "attempt-1" } }),
    event({ source: { kind: "game", service: "quiz-attempt-service", gameId: "wordle-biblico", sourceId: "attempt-1" } }),
    event({ payload: { status: "abandoned", score: 800 } }),
    event({ payload: { status: "completed", score: 800, points: 999999 } }),
    event({ occurredAt: NOW + 6 * 60_000 }),
    event({ userId: "other" }),
  ];
  for (const item of invalid) await assert.rejects(() => publishCoreEvent(ctx.env, item, [], NOW));
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events").get().total, 0);
});

test("a failed consumer is checkpointed and retried without repeating completed consumers", async t => {
  const ctx = setup(t);
  let stableEffects = 0, attempts = 0;
  const stable = consumer("stable", async () => { stableEffects += 1; });
  const recovering = consumer("recovering", async () => { attempts += 1; if (attempts === 1) throw new Error("temporary_failure"); });
  const first = await publishCoreEvent(ctx.env, event(), [stable, recovering], NOW);
  assert.equal(first.status, "partial_failed");
  assert.equal(ctx.raw.prepare("SELECT state FROM core_platform_event_processing WHERE consumer_id='recovering'").get().state, "retryable_failed");
  const waiting = await publishCoreEvent(ctx.env, event(), [stable, recovering], NOW + 1000);
  assert.equal(waiting.status, "partial_failed");
  assert.equal(attempts, 1);
  const retrySummary = await retryCoreEventDeliveries(ctx.env, [stable, recovering], { now: NOW + 5000 });
  assert.deepEqual(retrySummary, { scanned: 1, completed: 1, partialFailed: 0 });
  const retried = await publishCoreEvent(ctx.env, event(), [stable, recovering], NOW + 5000);
  assert.equal(retried.status, "completed");
  assert.equal(stableEffects, 1);
  assert.equal(attempts, 2);
  assert.equal(ctx.raw.prepare("SELECT attempt_count FROM core_platform_event_processing WHERE consumer_id='recovering'").get().attempt_count, 2);
});

test("operational retries use backoff and move repeated failures to dead letter", async t => {
  const ctx = setup(t);
  let attempts = 0;
  const failing = consumer("always-fails", async () => { attempts += 1; throw new Error("temporary_failure"); });
  await publishCoreEvent(ctx.env, event(), [failing], NOW);
  for (const elapsed of [5_000, 15_000, 35_000, 75_000]) {
    await retryCoreEventDeliveries(ctx.env, [failing], { now: NOW + elapsed });
  }
  const receipt = ctx.raw.prepare("SELECT state,attempt_count attemptCount,next_attempt_at nextAttemptAt FROM core_platform_event_processing WHERE consumer_id='always-fails'").get();
  assert.equal(attempts, 5);
  assert.equal(receipt.state, "dead_letter");
  assert.equal(receipt.attemptCount, 5);
  assert.equal(receipt.nextAttemptAt, null);
  assert.equal((await retryCoreEventDeliveries(ctx.env, [failing], { now: NOW + 1_000_000 })).scanned, 0);
});

test("retry does not silently substitute a different consumer handler version", async t => {
  const ctx = setup(t);
  const failingV1 = consumer("versioned", async () => { throw new Error("temporary_failure"); });
  await publishCoreEvent(ctx.env, event(), [failingV1], NOW);
  const v2 = { ...failingV1, handlerVersion: 2, handle: async () => {} };
  const summary = await retryCoreEventDeliveries(ctx.env, [v2], { now: NOW + 5000 });
  assert.deepEqual(summary, { scanned: 1, completed: 0, partialFailed: 1 });
  const row = ctx.raw.prepare("SELECT state,last_error_code errorCode FROM core_platform_event_processing WHERE consumer_id='versioned' AND handler_version=1").get();
  assert.equal(row.state, "dead_letter");
  assert.equal(row.errorCode, "consumer_version_unavailable");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_event_processing WHERE handler_version=2").get().total, 0);
});

test("there is no public event publication endpoint", () => {
  assert.equal(existsSync(new URL("../../functions/api/platform/events", import.meta.url)), false);
});
