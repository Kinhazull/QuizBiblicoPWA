import assert from "node:assert/strict";
import test from "node:test";
import { adaptQuizResultToGameFinished } from "../../functions/_lib/game-integrations/quiz-core-adapter.ts";
import { runScheduledPlatformOperations } from "../../workers/journey-awards/index.ts";
import { createTestDatabase, seedOrganization, seedUser, withFrozenTime } from "../helpers/integration.mjs";

const NOW = Date.UTC(2026, 6, 25, 12);

function insertPendingQuizEvent(ctx) {
  const event = adaptQuizResultToGameFinished({
    contractVersion: 1,
    attemptId: "scheduled-attempt",
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
  ctx.raw.prepare(`INSERT INTO quiz_core_event_outbox(
    event_id,event_type,event_version,organization_id,user_id,game_id,
    source_type,source_id,payload_json,envelope_json,delivery_state,
    attempt_count,created_at,updated_at)
    VALUES(?,?,?,?,?,?,'attempt',?,?,?,'pending',0,?,?)`).run(
      event.eventId,
      event.eventType,
      event.version,
      event.organizationId,
      event.userId,
      event.source.gameId,
      event.source.sourceId,
      JSON.stringify(event.payload),
      JSON.stringify(event),
      NOW,
      NOW,
    );
  return event;
}

function seedActiveMission(ctx) {
  ctx.raw.prepare(`INSERT INTO platform_mission_definitions(
    id,code,version,name,description,icon,cadence,scope_type,game_id,target,
    progress_unit,criterion_json,reward_json,status,created_at,updated_at)
    VALUES('mission-definition','daily_global_games_1',1,'Concluir uma partida',
      'Conclua uma partida oficial',NULL,'daily','global',NULL,1,'partida',
      '{"metric":"officialGamesCompletedInWindow"}','{"xp":15,"coins":3}','active',?,?)`).run(NOW, NOW);
  ctx.raw.prepare(`INSERT INTO user_platform_missions(
    id,user_id,organization_id,definition_id,mission_code,cadence,scope_key,
    window_key,target,progress,state,assigned_at,expires_at)
    VALUES('player-mission','player','org-1','mission-definition','daily_global_games_1',
      'daily','global','2026-07-25',1,0,'active',?,?)`).run(NOW - 1_000, NOW + 86_400_000);
}

test("scheduled Worker delivers Quiz outbox and updates every official Core consumer", async t => {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedUser(ctx, { id: "player" });
  const event = insertPendingQuizEvent(ctx);
  seedActiveMission(ctx);

  const result = await withFrozenTime(NOW, () => runScheduledPlatformOperations(ctx.env, undefined, NOW));

  assert.deepEqual(result.map(({ operation, ok, processed }) => ({ operation, ok, processed })), [
    { operation: "quiz_outbox", ok: true, processed: 1 },
    { operation: "core_event_retries", ok: true, processed: 0 },
    { operation: "platform_events", ok: true, processed: 0 },
  ]);
  assert.ok(result.every(item => Number.isFinite(item.durationMs) && item.durationMs >= 0));
  assert.equal(ctx.raw.prepare("SELECT delivery_state FROM quiz_core_event_outbox WHERE event_id=?").get(event.eventId).delivery_state, "delivered");
  assert.deepEqual({ ...ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get() }, { totalXp: 96, coins: 12 });
  assert.deepEqual({ ...ctx.raw.prepare("SELECT official_games_completed games,official_questions_answered questions FROM user_platform_statistics WHERE user_id='player'").get() }, { games: 1, questions: 10 });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_achievements WHERE user_id='player'").get().total, 1);
  assert.deepEqual({ ...ctx.raw.prepare("SELECT progress,state FROM user_platform_missions WHERE id='player-mission'").get() }, { progress: 1, state: "completed" });
  assert.deepEqual(ctx.raw.prepare("SELECT consumer_id id,state FROM core_platform_event_processing WHERE event_id=? ORDER BY consumer_id").all(event.eventId).map(row => ({ ...row })), [
    { id: "platform-achievements", state: "completed" },
    { id: "platform-missions", state: "completed" },
    { id: "platform-statistics", state: "completed" },
    { id: "reward-progress", state: "completed" },
  ]);
});

test("failure in one scheduled operation does not prevent the remaining operations", async () => {
  const calls = [];
  const dependencies = {
    dispatchOutbox: async () => { calls.push("quiz_outbox"); throw new Error("outbox_failed"); },
    retryCoreEvents: async () => { calls.push("core_event_retries"); return { completed: 1 }; },
    reconcileEvents: async () => { calls.push("platform_events"); return { finished: 1 }; },
  };

  await assert.rejects(
    () => runScheduledPlatformOperations({ DB: {} }, dependencies, NOW),
    /scheduled_platform_operations_failed:quiz_outbox/,
  );
  assert.deepEqual(calls, ["quiz_outbox", "core_event_retries", "platform_events"]);
});

test("scheduled Worker correlates a failed operation with a supportId and emits a final cycle summary", async () => {
  const lines = [];
  const previousError = console.error, previousLog = console.log;
  console.error = line => lines.push(JSON.parse(line));
  console.log = line => lines.push(JSON.parse(line));
  try {
    await assert.rejects(() => runScheduledPlatformOperations({ DB: {} }, {
      dispatchOutbox: async () => { throw new Error("SQLITE secret should not leak"); },
      retryCoreEvents: async () => ({ completed: 2 }),
      reconcileEvents: async () => ({ finished: 1 }),
    }, NOW, { send: alert => lines.push({ alert }) }));
  } finally {
    console.error = previousError; console.log = previousLog;
  }
  const failed = lines.find(line => line.operation === "quiz_outbox" && line.outcome === "failed");
  assert.match(failed.supportId, /^SUP-/);
  assert.equal(JSON.stringify(lines).includes("SQLITE secret"), false);
  assert.equal(lines.some(line => line.operation === "core_event_retries" && line.outcome === "completed"), true);
  assert.equal(lines.some(line => line.operation === "platform_events" && line.outcome === "completed"), true);
  assert.equal(lines.some(line => line.operation === "scheduled_cycle" && line.failed === 1), true);
  assert.equal(lines.some(line => line.alert?.supportId === failed.supportId), true);
});
