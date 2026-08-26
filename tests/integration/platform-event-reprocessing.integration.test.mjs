import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase, seedOrganization, seedUser, withFrozenTime } from "../helpers/integration.mjs";
import { publishOfficialCoreEvent, retryOfficialCoreEvents } from "../../functions/_lib/platform-event-runtime.ts";
import { reprocessEventConsumer } from "../../scripts/reprocess-event-consumer.mjs";

const NOW = Date.UTC(2026, 7, 26, 12);
const EVENT_ID = "game:wordle-biblico:synthetic-session:finished";

function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedUser(ctx, { id: "player" });
  ctx.raw.prepare(`INSERT INTO user_platform_statistics(user_id,organization_id,official_games_completed,official_questions_answered,perfect_games,distinct_official_play_days_utc,created_at,updated_at) VALUES('player','org-1',6,6,0,6,0,0)`).run();
  for (let day = 19; day <= 24; day += 1) ctx.raw.prepare(`INSERT INTO user_platform_statistics_official_days_utc(user_id,organization_id,day_key,first_completion_at,last_completion_at) VALUES('player','org-1',?,?,?)`).run(`2026-08-${day}`, day, day);
  ctx.raw.prepare(`INSERT INTO platform_achievement_definitions(id,code,version,name,description,icon,scope_type,game_id,criterion_json,secret,status,created_at,updated_at) VALUES('achievement:level_5:v1','level_5',1,'Primeiros feitos','Alcance o nível 5 na plataforma.',NULL,'global',NULL,'{}',0,'active',0,0)`).run();
  return ctx;
}
function event() {
  return { eventId: EVENT_ID, eventType: "GAME_FINISHED", occurredAt: NOW, organizationId: "org-1", userId: "player", source: { kind: "game", service: "quiz-attempt-service", gameId: "quiz-biblico", sourceId: "synthetic-session" }, payload: { status: "completed", score: 0, mode: "official", correctAnswers: 0, questionsAnswered: 1, completedAt: NOW, attemptId: "synthetic-session", gameVersion: "quiz-v1" }, version: 2 };
}
function executor(ctx) {
  return async (sql, { write }) => {
    if (write) { const result = ctx.raw.prepare(sql).run(); return { rows: [], changes: Number(result.changes) }; }
    return { rows: ctx.raw.prepare(sql).all(), changes: 0 };
  };
}
function receipt(ctx, consumerId = "platform-achievements") {
  return { ...ctx.raw.prepare(`SELECT state,attempt_count attemptCount,last_error_code lastErrorCode FROM core_platform_event_processing WHERE event_id=? AND consumer_id=?`).get(EVENT_ID, consumerId) };
}
function forceRealDeadLetter(ctx) {
  ctx.raw.prepare(`UPDATE core_platform_event_processing SET state='dead_letter',attempt_count=5,next_attempt_at=NULL,last_error_code='achievement_catalog_conflict',lease_token=NULL,lease_until=NULL WHERE event_id=? AND consumer_id='platform-achievements'`).run(EVENT_ID);
}
function canonicalizeCatalog(ctx) {
  ctx.raw.prepare("DELETE FROM platform_achievement_definitions WHERE code='level_5' AND version=1").run();
  ctx.raw.prepare(`INSERT INTO user_platform_achievements(id,user_id,organization_id,definition_id,achievement_code,scope_key,source_event_id,unlocked_at)
    VALUES('existing-first','player','org-1','achievement:first_steps:v1','first_steps','global','earlier-event',1)`).run();
}
async function prepare(ctx) {
  const result = await withFrozenTime(NOW, () => publishOfficialCoreEvent(ctx.env, event(), NOW));
  assert.equal(result.status, "partial_failed");
  forceRealDeadLetter(ctx);
  assert.deepEqual(receipt(ctx), { state: "dead_letter", attemptCount: 5, lastErrorCode: "achievement_catalog_conflict" });
}

test("dry-run is read-only and invalid or unavailable targets fail closed", async t => {
  const ctx = setup(t);
  await prepare(ctx);
  const execute = executor(ctx);
  const before = receipt(ctx);
  const report = await reprocessEventConsumer({ eventId: EVENT_ID, consumerId: "platform-achievements", execute, now: NOW + 1 });
  assert.equal(report.outcome, "eligible");
  assert.equal(report.changes, 0);
  assert.deepEqual(receipt(ctx), before);
  await assert.rejects(() => reprocessEventConsumer({ eventId: "missing", consumerId: "platform-achievements", execute }), /event_not_found/);
  await assert.rejects(() => reprocessEventConsumer({ eventId: EVENT_ID, consumerId: "platform-statistics", execute }), /consumer_not_reprocessable/);
  ctx.raw.prepare("UPDATE core_platform_event_processing SET state='retryable_failed',next_attempt_at=? WHERE event_id=? AND consumer_id='platform-achievements'").run(NOW + 60_000, EVENT_ID);
  await assert.rejects(() => reprocessEventConsumer({ eventId: EVENT_ID, consumerId: "platform-achievements", execute }), /receipt_not_dead_letter/);
});

test("one guarded requeue invokes only the official achievement consumer and remains idempotent", async t => {
  const ctx = setup(t);
  await prepare(ctx);
  canonicalizeCatalog(ctx);
  const execute = executor(ctx);
  const otherBefore = ["platform-missions", "platform-statistics", "reward-progress"].map(id => [id, receipt(ctx, id)]);
  const progressBefore = { ...ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get() };
  const baseLedgerBefore = {
    xp: ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger WHERE source_type='game_finished'").get().total,
    coins: ctx.raw.prepare("SELECT COUNT(*) total FROM platform_coin_ledger WHERE source_type='game_finished'").get().total,
  };
  await assert.rejects(() => reprocessEventConsumer({ eventId: EVENT_ID, consumerId: "platform-achievements", apply: true, execute }), /explicit_confirmation_required/);
  const applied = await reprocessEventConsumer({ eventId: EVENT_ID, consumerId: "platform-achievements", apply: true, confirmation: "REPROCESS_SINGLE_DEAD_LETTER", execute, now: NOW + 1 });
  assert.equal(applied.outcome, "requeued");
  const retry = await withFrozenTime(NOW + 2, () => retryOfficialCoreEvents(ctx.env, { now: NOW + 2 }));
  assert.equal(retry.scanned, 1);
  assert.deepEqual(receipt(ctx), { state: "completed", attemptCount: 6, lastErrorCode: null });
  assert.deepEqual(["platform-missions", "platform-statistics", "reward-progress"].map(id => [id, receipt(ctx, id)]), otherBefore);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_achievements WHERE achievement_code='active_7_days'").get().total, 1);
  const progressAfter = ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get();
  assert.equal(progressAfter.totalXp - progressBefore.totalXp, 150);
  assert.equal(progressAfter.coins - progressBefore.coins, 30);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger WHERE source_type='game_finished'").get().total, baseLedgerBefore.xp);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_coin_ledger WHERE source_type='game_finished'").get().total, baseLedgerBefore.coins);
  const second = await reprocessEventConsumer({ eventId: EVENT_ID, consumerId: "platform-achievements", apply: true, confirmation: "REPROCESS_SINGLE_DEAD_LETTER", execute, now: NOW + 3 });
  assert.equal(second.outcome, "already_completed");
  await withFrozenTime(NOW + 4, () => retryOfficialCoreEvents(ctx.env, { now: NOW + 4 }));
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_achievements WHERE achievement_code='active_7_days'").get().total, 1);
  assert.deepEqual({ ...ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get() }, { ...progressAfter });
});

test("the official consumer still rejects an incompatible catalog after requeue", async t => {
  const ctx = setup(t);
  await prepare(ctx);
  await reprocessEventConsumer({ eventId: EVENT_ID, consumerId: "platform-achievements", apply: true, confirmation: "REPROCESS_SINGLE_DEAD_LETTER", execute: executor(ctx), now: NOW + 1 });
  await withFrozenTime(NOW + 2, () => retryOfficialCoreEvents(ctx.env, { now: NOW + 2 }));
  assert.deepEqual(receipt(ctx), { state: "dead_letter", attemptCount: 6, lastErrorCode: "achievement_catalog_conflict" });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_achievements WHERE achievement_code='active_7_days'").get().total, 0);
});
