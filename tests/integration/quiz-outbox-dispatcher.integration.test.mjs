import assert from "node:assert/strict";
import test from "node:test";
import {
  createAuthenticatedRequest,
  createSession,
  createTestDatabase,
  createValidRound,
  responseJson,
  seedOrganization,
  seedUser,
  withFrozenTime,
} from "../helpers/integration.mjs";
import { adaptQuizResultToGameFinished } from "../../functions/_lib/game-integrations/quiz-core-adapter.ts";
import { dispatchQuizOutbox } from "../../functions/_lib/game-integrations/quiz-outbox-dispatcher.ts";
import { onRequestPost as runOutboxOperation } from "../../functions/api/admin/operations/quiz-outbox.ts";
import { onRequestPost as answerQuestion } from "../../functions/api/attempts/[id]/answer.ts";

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

function legacyEvent(attemptId = "legacy-attempt") {
  return {
    eventId: `quiz:attempt:${attemptId}:finished`,
    eventType: "GAME_FINISHED",
    occurredAt: NOW,
    organizationId: "org-1",
    userId: "player",
    source: { kind: "game", service: "quiz-attempt-service", gameId: "quiz-biblico", sourceId: attemptId },
    payload: { status: "completed", score: 700 },
    version: 1,
    correlationId: attemptId,
  };
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

test("successful delivery runs Statistics, Reward, Achievement and Mission consumers", async t => {
  const ctx = setup(t);
  insertOutbox(ctx);
  const result = await dispatchQuizOutbox(ctx.env, { now: NOW });
  assert.deepEqual(result, { scanned: 1, claimed: 1, delivered: 1, retried: 0, deadLettered: 0 });
  assert.deepEqual({ ...outbox(ctx) }, {
    state: "delivered", attemptCount: 1, nextAttemptAt: null, processedAt: NOW,
    errorCode: null, leaseToken: null, leaseUntil: null,
  });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events WHERE event_id=?").get(event().eventId).total, 1);
  assert.deepEqual(ctx.raw.prepare("SELECT consumer_id consumerId,state FROM core_platform_event_processing ORDER BY consumer_id").all().map(row => ({ ...row })), [
    { consumerId: "platform-achievements", state: "completed" },
    { consumerId: "platform-missions", state: "completed" },
    { consumerId: "platform-statistics", state: "completed" },
    { consumerId: "reward-progress", state: "completed" },
  ]);
  assert.equal(ctx.raw.prepare("SELECT sessions_completed total FROM user_platform_statistics WHERE user_id='player'").get().total, 1);
  const game = ctx.raw.prepare("SELECT sessions_completed total,best_score bestScore FROM user_platform_game_statistics WHERE user_id='player' AND game_id='quiz-biblico'").get();
  assert.equal(game.total, 1);
  assert.equal(game.bestScore, 800);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_statistics_event_checkpoints WHERE state='completed'").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT total_xp FROM user_platform_progress WHERE user_id='player'").get().total_xp, 96);
  assert.equal(ctx.raw.prepare("SELECT coins FROM user_platform_progress WHERE user_id='player'").get().coins, 13);
});

test("dispatcher preserves delivery compatibility for stored v1 and new v2 envelopes", async t => {
  const ctx = setup(t);
  insertOutbox(ctx, legacyEvent());
  insertOutbox(ctx, event("current-attempt"));
  const result = await dispatchQuizOutbox(ctx.env, { now: NOW, limit: 2 });
  assert.equal(result.delivered, 2);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM quiz_core_event_outbox WHERE delivery_state='delivered'").get().total, 2);
  assert.deepEqual(ctx.raw.prepare("SELECT event_version version FROM core_platform_events ORDER BY event_version").all().map(row => row.version), [1, 2]);
  assert.equal(ctx.raw.prepare("SELECT sessions_completed total FROM user_platform_game_statistics WHERE user_id='player' AND game_id='quiz-biblico'").get().total, 2);
  assert.equal(ctx.raw.prepare("SELECT total_xp FROM user_platform_progress WHERE user_id='player'").get().total_xp, 96);
});

test("transient Statistics failure schedules retry and resumes when it becomes due", async t => {
  const ctx = setup(t);
  insertOutbox(ctx);
  ctx.raw.prepare("UPDATE organizations SET timezone='Invalid/Timezone' WHERE id='org-1'").run();
  assert.equal((await dispatchQuizOutbox(ctx.env, { now: NOW })).retried, 1);
  assert.deepEqual({ ...outbox(ctx) }, {
    state: "retryable_failed", attemptCount: 1, nextAttemptAt: NOW + 5_000,
    processedAt: null, errorCode: "core_event_delivery_incomplete", leaseToken: null, leaseUntil: null,
  });
  assert.equal(ctx.raw.prepare("SELECT state FROM core_platform_event_processing WHERE consumer_id='platform-statistics'").get().state, "retryable_failed");
  assert.equal((await dispatchQuizOutbox(ctx.env, { now: NOW + 4_999 })).scanned, 0);
  ctx.raw.prepare("UPDATE organizations SET timezone='America/Sao_Paulo' WHERE id='org-1'").run();
  assert.equal((await dispatchQuizOutbox(ctx.env, { now: NOW + 5_000 })).delivered, 1);
  assert.equal(outbox(ctx).attemptCount, 2);
  assert.equal(outbox(ctx).state, "delivered");
});

test("fifth failed delivery moves the item to dead letter", async t => {
  const ctx = setup(t);
  insertOutbox(ctx);
  ctx.raw.prepare("UPDATE organizations SET timezone='Invalid/Timezone' WHERE id='org-1'").run();
  for (const elapsed of [0, 5_000, 15_000, 35_000, 75_000]) {
    await dispatchQuizOutbox(ctx.env, { now: NOW + elapsed });
  }
  const row = outbox(ctx);
  assert.equal(row.state, "dead_letter");
  assert.equal(row.attemptCount, 5);
  assert.equal(row.nextAttemptAt, null);
  assert.equal(ctx.raw.prepare("SELECT state FROM core_platform_event_processing WHERE consumer_id='platform-statistics'").get().state, "dead_letter");
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

test("operational endpoint is authenticated, tenant-scoped and ignores caller payload", async t => {
  const ctx = setup(t);
  seedUser(ctx, { id: "admin", role: "admin" });
  seedUser(ctx, { id: "member" });
  seedOrganization(ctx, { id: "org-2" });
  seedUser(ctx, { id: "other", organizationId: "org-2" });
  insertOutbox(ctx);
  const otherEvent = { ...event("attempt-other"), organizationId: "org-2", userId: "other" };
  insertOutbox(ctx, otherEvent);
  const adminToken = await createSession(ctx, "admin");
  const memberToken = await createSession(ctx, "member");
  const call = token => runOutboxOperation({
    request: createAuthenticatedRequest("https://test/api/admin/operations/quiz-outbox", {
      token,
      method: "POST",
      body: { limit: 100, eventId: otherEvent.eventId, organizationId: "org-2" },
    }),
    env: { ...ctx.env, QUIZ_OUTBOX_BATCH_LIMIT: "1" },
  });
  assert.equal((await runOutboxOperation({ request: new Request("https://test/api/admin/operations/quiz-outbox", { method: "POST" }), env: ctx.env })).status, 401);
  assert.equal((await call(memberToken)).status, 403);
  const response = await call(adminToken);
  assert.equal(response.status, 200);
  assert.deepEqual(await responseJson(response), {
    ok: true, batchLimit: 1, scanned: 1, claimed: 1, delivered: 1, retried: 0, deadLettered: 0,
  });
  assert.equal(ctx.raw.prepare("SELECT delivery_state FROM quiz_core_event_outbox WHERE event_id=?").get(event().eventId).delivery_state, "delivered");
  assert.equal(ctx.raw.prepare("SELECT delivery_state FROM quiz_core_event_outbox WHERE event_id=?").get(otherEvent.eventId).delivery_state, "pending");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM audit_logs WHERE action='platform.quiz_outbox_dispatched'").get().total, 1);
});

test("official Quiz completion flows through the protected operation into Statistics, Reward and Achievements", async t => {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedUser(ctx, { id: "admin", role: "admin" });
  seedUser(ctx, { id: "player" });
  const playerToken = await createSession(ctx, "player");
  const adminToken = await createSession(ctx, "admin");
  createValidRound(ctx, { opensAt: NOW - 60_000, closesAt: NOW + 3_600_000 });
  const order = Array.from({ length: 10 }, (_, index) => `round-1-q-${index}`);
  ctx.raw.prepare(`INSERT INTO attempts(
    id,user_id,round_id,attempt_number,mode,status,shuffle_seed,question_order_json,started_at,current_question_started_at)
    VALUES('official-attempt','player','round-1',1,'official','in_progress','seed',?,?,?)`).run(JSON.stringify(order), NOW - 10_000, NOW - 1_000);
  for (let index = 0; index < 9; index += 1) {
    ctx.raw.prepare(`INSERT INTO attempt_answers(
      attempt_id,question_id,choice_id,question_order,choice_order_json,correct,response_time_ms,points,answered_at)
      VALUES('official-attempt',?,?,?,'[]',1,1000,100,?)`).run(order[index], `${order[index]}-c-0`, index, NOW - 9_000 + index);
  }
  const answer = await withFrozenTime(NOW, () => answerQuestion({
    request: createAuthenticatedRequest("https://test/api/attempts/official-attempt/answer", {
      token: playerToken,
      method: "POST",
      body: { questionId: order[9], choiceId: `${order[9]}-c-0` },
    }),
    env: ctx.env,
    params: { id: "official-attempt" },
  }));
  assert.equal(answer.status, 200);
  assert.equal(ctx.raw.prepare("SELECT delivery_state FROM quiz_core_event_outbox").get().delivery_state, "pending");
  const operation = await withFrozenTime(NOW + 1_000, () => runOutboxOperation({
    request: createAuthenticatedRequest("https://test/api/admin/operations/quiz-outbox", { token: adminToken, method: "POST" }),
    env: ctx.env,
  }));
  assert.equal(operation.status, 200);
  assert.equal(ctx.raw.prepare("SELECT delivery_state FROM quiz_core_event_outbox").get().delivery_state, "delivered");
  assert.equal(ctx.raw.prepare("SELECT sessions_completed FROM user_platform_statistics WHERE user_id='player'").get().sessions_completed, 1);
  assert.equal(ctx.raw.prepare("SELECT sessions_completed FROM user_platform_game_statistics WHERE user_id='player'").get().sessions_completed, 1);
  assert.equal(ctx.raw.prepare("SELECT total_xp FROM user_platform_progress WHERE user_id='player'").get().total_xp, 160);
  assert.equal(ctx.raw.prepare("SELECT coins FROM user_platform_progress WHERE user_id='player'").get().coins, 25);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_missions").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_achievements").get().total, 2);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM notification_receipts").get().total, 0);
});
