import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase, seedOrganization, seedUser, withFrozenTime } from "../helpers/integration.mjs";
import { adaptQuizResultToGameFinished } from "../../functions/_lib/game-integrations/quiz-core-adapter.ts";
import { dispatchQuizOutbox } from "../../functions/_lib/game-integrations/quiz-outbox-dispatcher.ts";
import { publishOfficialCoreEvent, retryOfficialCoreEvents } from "../../functions/_lib/platform-event-runtime.ts";

const NOW = Date.UTC(2026, 6, 21, 12);

function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedUser(ctx, { id: "player" });
  return ctx;
}

function event(id, { correct = 8, total = 10, mode = "official", completedAt = NOW, version = 2 } = {}) {
  const attemptId = `attempt-${id}`;
  return {
    eventId: `game-finished-${id}`,
    eventType: "GAME_FINISHED",
    occurredAt: completedAt,
    organizationId: "org-1",
    userId: "player",
    source: { kind: "game", service: "quiz-attempt-service", gameId: "quiz-biblico", sourceId: attemptId },
    payload: version === 1 ? { status: "completed", score: correct * 100 } : {
      status: "completed", score: correct * 100, mode, correctAnswers: correct,
      questionsAnswered: total, completedAt, attemptId, gameVersion: "quiz-v1",
    },
    version,
  };
}

function unlocked(ctx) {
  return ctx.raw.prepare("SELECT achievement_code code FROM user_platform_achievements ORDER BY achievement_code").all().map(row => row.code);
}

function progress(ctx) {
  return { ...ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get() };
}

function insertStatistics(ctx, values = {}) {
  ctx.raw.prepare(`INSERT INTO user_platform_statistics(
    user_id,organization_id,official_games_completed,official_questions_answered,perfect_games,
    distinct_official_play_days_utc,created_at,updated_at)
    VALUES('player','org-1',?,?,?,?,0,0)`).run(
    values.games || 0, values.questions || 0, values.perfect || 0, values.days || 0,
  );
}

test("first official completion unlocks the Bronze first achievement and rewards it once", async t => {
  const ctx = setup(t);
  await withFrozenTime(NOW, () => publishOfficialCoreEvent(ctx.env, event("first"), NOW));
  assert.deepEqual(unlocked(ctx), ["first_steps"]);
  assert.deepEqual(progress(ctx), { totalXp: 96, coins: 13 });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger WHERE source_type='platform_achievement'").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_coin_ledger WHERE source_type='platform_achievement'").get().total, 1);
});

test("catalog evaluation unlocks Bronze, Silver, Gold and Legendary persistence tiers", async t => {
  const ctx = setup(t);
  insertStatistics(ctx, { games: 999 });
  await withFrozenTime(NOW, () => publishOfficialCoreEvent(ctx.env, event("tiers"), NOW));
  assert.deepEqual(unlocked(ctx), ["first_steps", "persistent_10", "persistent_100", "persistent_1000"]);
  assert.deepEqual(progress(ctx), { totalXp: 896, coins: 173 });
});

test("hidden achievements use the same evaluation and become visible after unlock", async t => {
  const ctx = setup(t);
  await withFrozenTime(NOW, () => publishOfficialCoreEvent(ctx.env, event("perfect", { correct: 10 }), NOW));
  assert.deepEqual(unlocked(ctx), ["first_steps", "perfect_first"]);
  const definition = ctx.raw.prepare("SELECT secret FROM platform_achievement_definitions WHERE code='perfect_first'").get();
  assert.equal(definition.secret, 1);
});

test("Statistics and Progress criteria unlock knowledge, frequency and level achievements", async t => {
  const ctx = setup(t);
  insertStatistics(ctx, { questions: 99, days: 6 });
  ctx.raw.prepare("INSERT INTO user_platform_progress(user_id,organization_id,total_xp,coins,created_at,updated_at) VALUES('player','org-1',1550,0,0,0)").run();
  ctx.raw.prepare("INSERT INTO user_platform_statistics_official_days_utc(user_id,organization_id,day_key,first_completion_at,last_completion_at) VALUES('player','org-1','2026-07-15',1,1),('player','org-1','2026-07-16',2,2),('player','org-1','2026-07-17',3,3),('player','org-1','2026-07-18',4,4),('player','org-1','2026-07-19',5,5),('player','org-1','2026-07-20',6,6)").run();
  await withFrozenTime(NOW, () => publishOfficialCoreEvent(ctx.env, event("combined", { correct: 1, total: 1 }), NOW));
  assert.deepEqual(unlocked(ctx), ["active_7_days", "first_steps", "level_5", "perfect_first", "word_apprentice"]);
});

test("v1 and practice events are completed as ineligible without unlock or reward", async t => {
  const ctx = setup(t);
  await publishOfficialCoreEvent(ctx.env, event("legacy", { version: 1 }), NOW);
  await publishOfficialCoreEvent(ctx.env, event("practice", { mode: "practice", completedAt: NOW + 1 }), NOW + 1);
  assert.deepEqual(unlocked(ctx), []);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_achievement_definitions").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_event_processing WHERE consumer_id='platform-achievements' AND state='completed'").get().total, 2);
});

test("replay and concurrent delivery keep one unlock and one deterministic reward", async t => {
  const ctx = setup(t);
  const value = event("concurrent");
  await Promise.all([
    publishOfficialCoreEvent(ctx.env, value, NOW),
    publishOfficialCoreEvent(ctx.env, value, NOW),
    publishOfficialCoreEvent(ctx.env, value, NOW),
  ]);
  await publishOfficialCoreEvent(ctx.env, value, NOW + 1);
  assert.deepEqual(unlocked(ctx), ["first_steps"]);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger WHERE source_type='platform_achievement'").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_coin_ledger WHERE source_type='platform_achievement'").get().total, 1);
});

test("a failed achievement reward transaction leaves no partial unlock and retries safely", async t => {
  const ctx = setup(t);
  ctx.raw.exec("CREATE TRIGGER reject_achievement_coin BEFORE INSERT ON platform_coin_ledger WHEN NEW.source_type='platform_achievement' BEGIN SELECT RAISE(ABORT, 'achievement_coin_unavailable'); END");
  const first = await publishOfficialCoreEvent(ctx.env, event("retry"), NOW);
  assert.equal(first.status, "partial_failed");
  assert.deepEqual(unlocked(ctx), []);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger WHERE source_type='platform_achievement'").get().total, 0);
  ctx.raw.exec("DROP TRIGGER reject_achievement_coin");
  const retried = await withFrozenTime(NOW + 5_000, () => retryOfficialCoreEvents(ctx.env, { now: NOW + 5_000 }));
  assert.equal(retried.completed, 1);
  assert.deepEqual(unlocked(ctx), ["first_steps"]);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger WHERE source_type='platform_achievement'").get().total, 1);
});

test("Quiz outbox dispatch reaches all registered Core consumers end to end", async t => {
  const ctx = setup(t);
  const value = adaptQuizResultToGameFinished({
    contractVersion: 1, attemptId: "attempt-e2e", roundId: "round-1", organizationId: "org-1", userId: "player",
    status: "completed", mode: "official", startedAt: NOW - 10_000, finishedAt: NOW,
    score: 800, correctAnswers: 8, questionsAnswered: 10, maxStreak: 4, integrity: { valid: true },
  });
  ctx.raw.prepare(`INSERT INTO quiz_core_event_outbox(
    event_id,event_type,event_version,organization_id,user_id,game_id,source_type,source_id,payload_json,envelope_json,
    delivery_state,attempt_count,created_at,updated_at)
    VALUES(?,?,?,?,?,?,'attempt',?,?,?,'pending',0,?,?)`).run(
    value.eventId, value.eventType, value.version, value.organizationId, value.userId, value.source.gameId,
    value.source.sourceId, JSON.stringify(value.payload), JSON.stringify(value), NOW, NOW,
  );
  const result = await withFrozenTime(NOW, () => dispatchQuizOutbox(ctx.env, { now: NOW }));
  assert.equal(result.delivered, 1);
  assert.deepEqual(unlocked(ctx), ["first_steps"]);
  assert.equal(ctx.raw.prepare("SELECT official_games_completed total FROM user_platform_statistics").get().total, 1);
  assert.deepEqual(progress(ctx), { totalXp: 96, coins: 13 });
  assert.deepEqual(ctx.raw.prepare("SELECT consumer_id id,state FROM core_platform_event_processing ORDER BY consumer_id").all().map(row => ({ ...row })), [
    { id: "platform-achievements", state: "completed" },
    { id: "platform-missions", state: "completed" },
    { id: "platform-statistics", state: "completed" },
    { id: "reward-progress", state: "completed" },
  ]);
});
