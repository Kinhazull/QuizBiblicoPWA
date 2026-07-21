import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { adaptQuizResultToGameFinished } from "../../functions/_lib/game-integrations/quiz-core-adapter.ts";
import { dispatchQuizOutbox } from "../../functions/_lib/game-integrations/quiz-outbox-dispatcher.ts";

const NOW = Date.UTC(2026, 6, 21, 15);

function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedUser(ctx, { id: "player" });
  return ctx;
}

function event(attemptId = "attempt-1") {
  return adaptQuizResultToGameFinished({
    contractVersion: 1,
    attemptId,
    roundId: "round-1",
    organizationId: "org-1",
    userId: "player",
    status: "completed",
    mode: "official",
    startedAt: NOW - 10_000,
    finishedAt: NOW,
    score: 800,
    correctAnswers: 8,
    questionsAnswered: 10,
    maxStreak: 5,
    integrity: { valid: true },
  });
}

function insertOutbox(ctx, value = event()) {
  ctx.raw.prepare(`INSERT INTO quiz_core_event_outbox(
    event_id,event_type,event_version,organization_id,user_id,game_id,
    source_type,source_id,payload_json,envelope_json,delivery_state,
    attempt_count,created_at,updated_at)
    VALUES(?,?,?,?,?,?,'attempt',?,?,?,'pending',0,?,?)`).run(
      value.eventId,
      value.eventType,
      value.version,
      value.organizationId,
      value.userId,
      value.source.gameId,
      value.source.sourceId,
      JSON.stringify(value.payload),
      JSON.stringify(value),
      NOW,
      NOW,
    );
}

function outbox(ctx) {
  return ctx.raw.prepare(`SELECT delivery_state state,attempt_count attemptCount,
    next_attempt_at nextAttemptAt,processed_at processedAt,last_error_code errorCode,
    lease_token leaseToken,lease_until leaseUntil FROM quiz_core_event_outbox`).get();
}

test("successful delivery accepts the event without running Core consumers", async t => {
  const ctx = setup(t);
  insertOutbox(ctx);
  const result = await dispatchQuizOutbox(ctx.env, { now: NOW });
  assert.deepEqual(result, { scanned: 1, claimed: 1, delivered: 1, retried: 0, deadLettered: 0 });
  assert.deepEqual({ ...outbox(ctx) }, {
    state: "delivered", attemptCount: 1, nextAttemptAt: null, processedAt: NOW,
    errorCode: null, leaseToken: null, leaseUntil: null,
  });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events WHERE event_id=?").get(event().eventId).total, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_event_processing").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_coin_ledger").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_statistics").get().total, 0);
});

test("failed delivery schedules retry and resumes when it becomes due", async t => {
  const ctx = setup(t);
  insertOutbox(ctx);
  ctx.raw.prepare("UPDATE users SET status='suspended' WHERE id='player'").run();
  assert.equal((await dispatchQuizOutbox(ctx.env, { now: NOW })).retried, 1);
  assert.deepEqual({ ...outbox(ctx) }, {
    state: "retryable_failed", attemptCount: 1, nextAttemptAt: NOW + 5_000,
    processedAt: null, errorCode: "event_user_unavailable", leaseToken: null, leaseUntil: null,
  });
  assert.equal((await dispatchQuizOutbox(ctx.env, { now: NOW + 4_999 })).scanned, 0);
  ctx.raw.prepare("UPDATE users SET status='active' WHERE id='player'").run();
  assert.equal((await dispatchQuizOutbox(ctx.env, { now: NOW + 5_000 })).delivered, 1);
  assert.equal(outbox(ctx).attemptCount, 2);
  assert.equal(outbox(ctx).state, "delivered");
});

test("fifth failed delivery moves the item to dead letter", async t => {
  const ctx = setup(t);
  insertOutbox(ctx);
  ctx.raw.prepare("UPDATE users SET status='suspended' WHERE id='player'").run();
  for (const elapsed of [0, 5_000, 15_000, 35_000, 75_000]) {
    await dispatchQuizOutbox(ctx.env, { now: NOW + elapsed });
  }
  const row = outbox(ctx);
  assert.equal(row.state, "dead_letter");
  assert.equal(row.attemptCount, 5);
  assert.equal(row.nextAttemptAt, null);
  assert.equal((await dispatchQuizOutbox(ctx.env, { now: NOW + 1_000_000 })).scanned, 0);
});

test("delivered items are idempotent and never increment attempts again", async t => {
  const ctx = setup(t);
  insertOutbox(ctx);
  await dispatchQuizOutbox(ctx.env, { now: NOW });
  const second = await dispatchQuizOutbox(ctx.env, { now: NOW + 60_000 });
  assert.deepEqual(second, { scanned: 0, claimed: 0, delivered: 0, retried: 0, deadLettered: 0 });
  assert.equal(outbox(ctx).attemptCount, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events").get().total, 1);
});

test("a post-publication failure resumes through Event Engine idempotency", async t => {
  const ctx = setup(t);
  insertOutbox(ctx);
  ctx.raw.exec(`CREATE TRIGGER reject_delivered BEFORE UPDATE OF delivery_state ON quiz_core_event_outbox
    WHEN NEW.delivery_state='delivered' BEGIN SELECT RAISE(ABORT,'temporary_checkpoint_failure'); END`);
  const first = await dispatchQuizOutbox(ctx.env, { now: NOW });
  assert.equal(first.retried, 1);
  assert.equal(outbox(ctx).state, "retryable_failed");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events").get().total, 1);
  ctx.raw.exec("DROP TRIGGER reject_delivered");
  const resumed = await dispatchQuizOutbox(ctx.env, { now: NOW + 5_000 });
  assert.equal(resumed.delivered, 1);
  assert.equal(outbox(ctx).state, "delivered");
  assert.equal(outbox(ctx).attemptCount, 2);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events").get().total, 1);
});

test("concurrent dispatchers claim and deliver a pending item only once", async t => {
  const ctx = setup(t);
  insertOutbox(ctx);
  const results = await Promise.all(Array.from({ length: 5 }, () => dispatchQuizOutbox(ctx.env, { now: NOW })));
  assert.equal(results.reduce((total, item) => total + item.claimed, 0), 1);
  assert.equal(results.reduce((total, item) => total + item.delivered, 0), 1);
  assert.equal(outbox(ctx).attemptCount, 1);
  assert.equal(outbox(ctx).state, "delivered");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events").get().total, 1);
});

test("an expired processing lease is recovered safely", async t => {
  const ctx = setup(t);
  insertOutbox(ctx);
  ctx.raw.prepare(`UPDATE quiz_core_event_outbox SET delivery_state='processing',attempt_count=1,
    lease_token='abandoned',lease_until=? WHERE event_id=?`).run(NOW - 1, event().eventId);
  const result = await dispatchQuizOutbox(ctx.env, { now: NOW });
  assert.equal(result.delivered, 1);
  assert.equal(outbox(ctx).attemptCount, 2);
  assert.equal(outbox(ctx).state, "delivered");
});
