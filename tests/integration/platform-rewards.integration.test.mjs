import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase, seedOrganization, seedUser, withFrozenTime } from "../helpers/integration.mjs";
import { publishOfficialCoreEvent, retryOfficialCoreEvents } from "../../functions/_lib/platform-event-runtime.ts";
import { calculateGameFinishedReward } from "../../functions/_lib/platform-rewards.ts";

const DAY_ONE = Date.UTC(2026, 6, 21, 10);
const DAY_TWO = Date.UTC(2026, 6, 22, 10);

function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedUser(ctx, { id: "player" });
  return ctx;
}

function event(id, { correct = 0, total = 10, completedAt = DAY_ONE, mode = "official", version = 2 } = {}) {
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

function progress(ctx) {
  return ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get();
}

test("reward policy calculates minimum, intermediate and maximum grants", () => {
  assert.deepEqual(calculateGameFinishedReward(event("min").payload), { baseXp: 20, coins: 2, dailyBonusXp: 10, perfect: false, ratio: 0 });
  assert.equal(calculateGameFinishedReward(event("threshold-70", { correct: 7 }).payload).coins, 3);
  assert.deepEqual(calculateGameFinishedReward(event("mid", { correct: 8 }).payload), { baseXp: 36, coins: 3, dailyBonusXp: 10, perfect: false, ratio: 0.8 });
  assert.equal(calculateGameFinishedReward(event("threshold-90", { correct: 9 }).payload).coins, 4);
  assert.deepEqual(calculateGameFinishedReward(event("max", { correct: 10 }).payload), { baseXp: 50, coins: 5, dailyBonusXp: 10, perfect: true, ratio: 1 });
});

test("v2 official reward is persisted once and level remains derived by Progress Service", async t => {
  const ctx = setup(t);
  const value = event("perfect", { correct: 10 });
  await withFrozenTime(DAY_ONE, () => publishOfficialCoreEvent(ctx.env, value, DAY_ONE));
  await withFrozenTime(DAY_ONE + 1, () => publishOfficialCoreEvent(ctx.env, value, DAY_ONE + 1));
  assert.deepEqual({ ...progress(ctx) }, { totalXp: 60, coins: 5 });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger").get().total, 2);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_coin_ledger").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_event_processing WHERE consumer_id='reward-progress' AND state='completed'").get().total, 1);

  await withFrozenTime(DAY_TWO, () => publishOfficialCoreEvent(ctx.env, event("perfect-next", { correct: 10, completedAt: DAY_TWO }), DAY_TWO));
  assert.deepEqual({ ...progress(ctx) }, { totalXp: 120, coins: 10 });
  assert.equal(Math.floor(Math.sqrt(progress(ctx).totalXp / 100)) + 1, 2);
});

test("only one concurrent first-game UTC bonus is granted per user and organization", async t => {
  const ctx = setup(t);
  await withFrozenTime(DAY_ONE, () => Promise.all([
    publishOfficialCoreEvent(ctx.env, event("parallel-a"), DAY_ONE),
    publishOfficialCoreEvent(ctx.env, event("parallel-b"), DAY_ONE),
  ]));
  assert.deepEqual({ ...progress(ctx) }, { totalXp: 50, coins: 4 });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger WHERE reason='Primeira partida oficial do dia'").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger").get().total, 3);
});

test("v1 and practice are auditable completed receipts but grant no reward", async t => {
  const ctx = setup(t);
  await publishOfficialCoreEvent(ctx.env, event("legacy", { version: 1 }), DAY_ONE);
  await publishOfficialCoreEvent(ctx.env, event("practice", { mode: "practice" }), DAY_ONE);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_coin_ledger").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_event_processing WHERE consumer_id='reward-progress' AND state='completed'").get().total, 2);
});

test("invalid v2 metrics and incompatible replay fail safely before rewards", async t => {
  const ctx = setup(t);
  await assert.rejects(() => publishOfficialCoreEvent(ctx.env, event("zero", { total: 0 }), DAY_ONE), /invalid_event_payload_questionsAnswered/);
  await assert.rejects(() => publishOfficialCoreEvent(ctx.env, event("overflow", { correct: 11 }), DAY_ONE), /invalid_event_payload_correctAnswers/);
  const original = event("immutable", { correct: 4 });
  await publishOfficialCoreEvent(ctx.env, original, DAY_ONE);
  await assert.rejects(() => publishOfficialCoreEvent(ctx.env, { ...original, payload: { ...original.payload, correctAnswers: 5 } }, DAY_ONE), /event_id_conflict/);
  assert.deepEqual({ ...progress(ctx) }, { totalXp: 38, coins: 2 });
});

test("a failed atomic reward is retryable and never leaves partial XP or coins", async t => {
  const ctx = setup(t);
  ctx.raw.exec("CREATE TRIGGER reject_reward_coins BEFORE INSERT ON platform_coin_ledger BEGIN SELECT RAISE(ABORT,'reward_storage_unavailable'); END");
  const result = await withFrozenTime(DAY_ONE, () => publishOfficialCoreEvent(ctx.env, event("retry", { correct: 8 }), DAY_ONE));
  assert.equal(result.status, "partial_failed");
  assert.equal(ctx.raw.prepare("SELECT state FROM core_platform_event_processing WHERE consumer_id='reward-progress'").get().state, "retryable_failed");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_coin_ledger").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_progress").get().total, 0);
  ctx.raw.exec("DROP TRIGGER reject_reward_coins");
  const retried = await withFrozenTime(DAY_ONE + 5_000, () => retryOfficialCoreEvents(ctx.env, { now: DAY_ONE + 5_000 }));
  assert.equal(retried.completed, 1);
  assert.deepEqual({ ...progress(ctx) }, { totalXp: 46, coins: 3 });
});

test("a receipt failure after Progress application resumes without duplicating reward", async t => {
  const ctx = setup(t);
  ctx.raw.exec(`CREATE TRIGGER reject_reward_receipt BEFORE UPDATE OF state ON core_platform_event_processing
    WHEN OLD.consumer_id='reward-progress' AND NEW.state='completed'
    BEGIN SELECT RAISE(ABORT,'receipt_unavailable'); END`);
  await withFrozenTime(DAY_ONE, () => publishOfficialCoreEvent(ctx.env, event("receipt", { correct: 7 }), DAY_ONE));
  assert.deepEqual({ ...progress(ctx) }, { totalXp: 44, coins: 3 });
  assert.equal(ctx.raw.prepare("SELECT state FROM core_platform_event_processing WHERE consumer_id='reward-progress'").get().state, "retryable_failed");
  ctx.raw.exec("DROP TRIGGER reject_reward_receipt");
  await withFrozenTime(DAY_ONE + 5_000, () => retryOfficialCoreEvents(ctx.env, { now: DAY_ONE + 5_000 }));
  assert.deepEqual({ ...progress(ctx) }, { totalXp: 44, coins: 3 });
  assert.equal(ctx.raw.prepare("SELECT state FROM core_platform_event_processing WHERE consumer_id='reward-progress'").get().state, "completed");
});

test("persistent Progress failure reaches dead letter without partial balance", async t => {
  const ctx = setup(t);
  ctx.raw.exec("CREATE TRIGGER reject_reward_coins_forever BEFORE INSERT ON platform_coin_ledger BEGIN SELECT RAISE(ABORT,'reward_storage_unavailable'); END");
  await withFrozenTime(DAY_ONE, () => publishOfficialCoreEvent(ctx.env, event("dead-letter"), DAY_ONE));
  for (const elapsed of [5_000, 15_000, 35_000, 75_000]) {
    await withFrozenTime(DAY_ONE + elapsed, () => retryOfficialCoreEvents(ctx.env, { now: DAY_ONE + elapsed }));
  }
  const receipt = ctx.raw.prepare("SELECT state,attempt_count attemptCount,last_error_code errorCode FROM core_platform_event_processing WHERE consumer_id='reward-progress'").get();
  assert.deepEqual({ ...receipt }, { state: "dead_letter", attemptCount: 5, errorCode: "reward_storage_unavailable" });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_progress").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_coin_ledger").get().total, 0);
});

test("reward processing never activates Missions, Achievements or Notifications", async t => {
  const ctx = setup(t);
  await publishOfficialCoreEvent(ctx.env, event("isolated", { correct: 9 }), DAY_ONE);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_missions").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_achievements").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM notification_receipts").get().total, 0);
});
