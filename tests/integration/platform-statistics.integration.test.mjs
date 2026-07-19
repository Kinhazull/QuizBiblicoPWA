import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase, seedOrganization, seedUser, createSession, createAuthenticatedRequest, responseJson } from "../helpers/integration.mjs";
import { publishOfficialCoreEvent } from "../../functions/_lib/platform-event-runtime.ts";
import { rebuildUserStatistics } from "../../functions/_lib/platform-statistics.ts";
import { onRequestGet as readStatistics } from "../../functions/api/platform/statistics.ts";
import { onRequestGet as readProfile } from "../../functions/api/profile/me.ts";
import { onRequestGet as exportPrivacy } from "../../functions/api/privacy/me.ts";
import { onRequestGet as readHealth } from "../../functions/api/admin/health.ts";

const DAY_ONE = Date.UTC(2026, 6, 19, 12);
const DAY_TWO = Date.UTC(2026, 6, 20, 12);

function gameEvent(eventType, eventId, occurredAt, payload, sourceId = eventId) {
  return {
    eventId,
    eventType,
    occurredAt,
    organizationId: "org-1",
    userId: "player",
    source: { kind: "game", service: "quiz-service", gameId: "quiz-biblico", sourceId },
    payload,
    version: 1,
  };
}

async function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedOrganization(ctx, { id: "org-2" });
  seedUser(ctx, { id: "player" });
  seedUser(ctx, { id: "other", organizationId: "org-2" });
  seedUser(ctx, { id: "admin", role: "admin" });
  return { ctx, token: await createSession(ctx, "player"), otherToken: await createSession(ctx, "other"), adminToken: await createSession(ctx, "admin") };
}

test("statistics endpoint returns a safe authenticated empty state", async t => {
  const { ctx, token, adminToken } = await setup(t);
  assert.equal((await readStatistics({ request: new Request("https://test/api/platform/statistics"), env: ctx.env })).status, 401);
  const response = await readStatistics({ request: createAuthenticatedRequest("https://test/api/platform/statistics", { token }), env: ctx.env });
  assert.equal(response.status, 200);
  assert.deepEqual(await responseJson(response), {
    global: { sessionsCompleted: 0, gamesUsed: 0, totalPlayTimeMs: 0, lastActivityAt: null, activeDays: 0, currentDailyStreak: 0, bestDailyStreak: 0 },
    games: [],
  });
  assert.equal(response.headers.get("cache-control"), "no-store, private");
  const health = await responseJson(await readHealth({ request: createAuthenticatedRequest("https://test/api/admin/health", { token: adminToken }), env: ctx.env }));
  assert.equal(health.tables.missing.length, 0);
  assert.equal(health.checks.find(item => item.name === "statisticsProjection").ok, true);
  assert.equal(health.migrationLedger.expected, 28);
});

test("official generic events create isolated global and per-game projections", async t => {
  const { ctx, token, otherToken } = await setup(t);
  const events = [
    gameEvent("GAME_STARTED", "game:start:1", DAY_ONE, { sessionType: "standard" }, "session-1"),
    gameEvent("QUESTION_ANSWERED", "game:answer:1", DAY_ONE + 1000, { correct: true }, "answer-1"),
    gameEvent("QUESTION_ANSWERED", "game:answer:2", DAY_TWO, { correct: false }, "answer-2"),
    gameEvent("GAME_FINISHED", "game:finish:1", DAY_TWO + 1000, { status: "completed", score: 450 }, "session-1"),
  ];
  for (const event of events) {
    const result = await publishOfficialCoreEvent(ctx.env, event, event.occurredAt + 1000);
    assert.equal(result.status, "completed", JSON.stringify(ctx.raw.prepare("SELECT last_error_code FROM core_platform_event_processing WHERE event_id=?").get(event.eventId)));
  }

  const response = await readStatistics({ request: createAuthenticatedRequest("https://test/api/platform/statistics", { token }), env: ctx.env });
  const data = await responseJson(response);
  assert.deepEqual(data.global, { sessionsCompleted: 1, gamesUsed: 1, totalPlayTimeMs: 0, lastActivityAt: DAY_TWO + 1000, activeDays: 2, currentDailyStreak: 2, bestDailyStreak: 2 });
  assert.deepEqual(data.games, [{
    gameId: "quiz-biblico", sessionsStarted: 1, sessionsCompleted: 1, questionsAnswered: 2,
    correctAnswers: 1, incorrectAnswers: 1, accuracy: 50, bestScore: 450,
    totalPlayTimeMs: 0, averageTimeMs: null, mostUsedDifficulty: null, lastActivityAt: DAY_TWO + 1000,
  }]);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_statistics_event_checkpoints WHERE state='completed'").get().total, 4);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_event_processing WHERE consumer_id='platform-statistics' AND state='completed'").get().total, 4);

  const other = await responseJson(await readStatistics({ request: createAuthenticatedRequest("https://test/api/platform/statistics", { token: otherToken }), env: ctx.env }));
  assert.equal(other.global.sessionsCompleted, 0);
  assert.deepEqual(other.games, []);

  const profile = await responseJson(await readProfile({ request: createAuthenticatedRequest("https://test/api/profile/me", { token }), env: ctx.env }));
  assert.equal(profile.platformStatistics.global.sessionsCompleted, 1);
  assert.equal(profile.platformStatistics.global.activeDays, 2);
  const privacy = await responseJson(await exportPrivacy({ request: createAuthenticatedRequest("https://test/api/privacy/me", { token }), env: ctx.env }));
  assert.equal(privacy.platformStatistics.global.sessionsCompleted, 1);
  assert.equal(privacy.platformStatistics.activeDayHistory.length, 2);
});

test("repeated and concurrent delivery never duplicates statistics", async t => {
  const { ctx } = await setup(t);
  const event = gameEvent("GAME_FINISHED", "game:finish:concurrent", DAY_ONE, { status: "completed", score: 300 }, "session-concurrent");
  await Promise.all([
    publishOfficialCoreEvent(ctx.env, event, DAY_ONE + 1000),
    publishOfficialCoreEvent(ctx.env, event, DAY_ONE + 1000),
    publishOfficialCoreEvent(ctx.env, event, DAY_ONE + 1000),
  ]);
  assert.equal(ctx.raw.prepare("SELECT sessions_completed total FROM user_platform_statistics WHERE user_id='player'").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT sessions_completed total FROM user_platform_game_statistics WHERE user_id='player'").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_statistics_event_checkpoints").get().total, 1);
});

test("Quiz-specific events are not consumed before formal Quiz integration", async t => {
  const { ctx } = await setup(t);
  const result = await publishOfficialCoreEvent(ctx.env, gameEvent("QUIZ_FINISHED", "quiz:finish:not-integrated", DAY_ONE, {
    mode: "official", status: "completed", correctAnswers: 8, questionCount: 10,
  }), DAY_ONE + 1000);
  assert.equal(result.status, "completed");
  assert.deepEqual(result.consumers, []);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_statistics").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_statistics_event_checkpoints").get().total, 0);
});

test("statistics projections can be rebuilt after a post-projection receipt failure", async t => {
  const { ctx } = await setup(t);
  const event = gameEvent("GAME_FINISHED", "game:finish:rebuild", DAY_ONE, { status: "completed", score: 600 }, "session-rebuild");
  await publishOfficialCoreEvent(ctx.env, event, DAY_ONE + 1000);
  ctx.raw.prepare(`UPDATE core_platform_event_processing
    SET state='retryable_failed',last_error_code='simulated_post_projection_failure'
    WHERE event_id=? AND consumer_id='platform-statistics'`).run(event.eventId);
  ctx.raw.prepare("UPDATE user_platform_statistics SET sessions_completed=99,games_used=99").run();
  ctx.raw.prepare("UPDATE user_platform_game_statistics SET sessions_completed=99,best_score=9999").run();
  const rebuilt = await rebuildUserStatistics(ctx.env, "player", "org-1");
  assert.equal(rebuilt.global.sessionsCompleted, 1);
  assert.equal(rebuilt.global.gamesUsed, 1);
  assert.equal(rebuilt.games[0].sessionsCompleted, 1);
  assert.equal(rebuilt.games[0].bestScore, 600);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_statistics_event_checkpoints").get().total, 1);
});
