import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { createTestDatabase, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { publishCoreEvent } from "../../functions/_lib/platform-event-engine.ts";

const NOW = Date.UTC(2026, 6, 19, 12);

function event(overrides = {}) {
  return {
    eventId: "quiz:attempt:attempt-1:finished",
    eventType: "QUIZ_FINISHED",
    occurredAt: NOW,
    organizationId: "org-1",
    userId: "player",
    source: { kind: "game", service: "quiz-attempt-service", gameId: "quiz-biblico", sourceId: "attempt-1" },
    payload: { mode: "official", status: "completed", correctAnswers: 8, questionCount: 10 },
    version: 1,
    correlationId: "attempt-1",
    ...overrides,
  };
}

function consumer(id, handle, eventTypes = ["QUIZ_FINISHED"]) {
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
  await assert.rejects(() => publishCoreEvent(ctx.env, event({ payload: { mode: "official", status: "completed", correctAnswers: 2, questionCount: 10 } }), [], NOW), /event_id_conflict/);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events").get().total, 1);
  assert.match(ctx.raw.prepare("SELECT payload_json payload FROM core_platform_events").get().payload, /"correctAnswers":8/);
});

test("producer, payload, timestamp and tenant validation reject unsafe events without writes", async t => {
  const ctx = setup(t);
  const invalid = [
    event({ source: { kind: "auth", service: "auth-service", sourceId: "attempt-1" } }),
    event({ source: { kind: "game", service: "quiz-attempt-service", gameId: "wordle-biblico", sourceId: "attempt-1" } }),
    event({ payload: { mode: "official", status: "completed", correctAnswers: 11, questionCount: 10 } }),
    event({ payload: { mode: "official", status: "completed", correctAnswers: 8, questionCount: 10, points: 999999 } }),
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
  const retried = await publishCoreEvent(ctx.env, event(), [stable, recovering], NOW + 1000);
  assert.equal(retried.status, "completed");
  assert.equal(stableEffects, 1);
  assert.equal(attempts, 2);
  assert.equal(ctx.raw.prepare("SELECT attempt_count FROM core_platform_event_processing WHERE consumer_id='recovering'").get().attempt_count, 2);
});

test("there is no public event publication endpoint", () => {
  assert.equal(existsSync(new URL("../../functions/api/platform/events", import.meta.url)), false);
});
