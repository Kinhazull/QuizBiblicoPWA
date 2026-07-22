import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { publishCoreEvent } from "../../functions/_lib/platform-event-engine.ts";
import { platformMissionConsumer } from "../../functions/_lib/platform-mission-consumer.ts";

const NOW = Date.UTC(2026, 6, 21, 15);

function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedUser(ctx, { id: "player" });
  return ctx;
}

function assign(ctx, { id, code, target, gameId = null, progress = 0, state = "active" }) {
  const scope = gameId ? "game" : "global";
  const definitionId = `definition:${id}`;
  ctx.raw.prepare(`INSERT INTO platform_mission_definitions(
    id,code,version,name,description,cadence,scope_type,game_id,target,progress_unit,criterion_json,reward_json,status,created_at,updated_at)
    VALUES(?,?,1,?,?,'daily',?,?,?,'eventos','{}','{"xp":0,"coins":0}','active',?,?)`
  ).run(definitionId, code, code, code, scope, gameId, target, NOW - 1000, NOW - 1000);
  ctx.raw.prepare(`INSERT INTO user_platform_missions(
    id,user_id,organization_id,definition_id,mission_code,cadence,scope_key,window_key,target,progress,state,assigned_at,expires_at)
    VALUES(?,'player','org-1',?,?,'daily',?,'2026-07-21',?,?,?, ?,?)`
  ).run(id, definitionId, code, gameId ? `game:${gameId}` : "global", target, progress, state, NOW - 1000, NOW + 86_400_000);
}

function event({ id = "game:mission:1", gameId = "quiz-biblico", correctAnswers, questionsAnswered = 10 } = {}) {
  const answers = correctAnswers ?? Math.min(7, questionsAnswered);
  return {
    eventId: id,
    eventType: "GAME_FINISHED",
    version: 2,
    occurredAt: NOW,
    organizationId: "org-1",
    userId: "player",
    source: { kind: "game", service: "quiz-attempt-service", gameId, sourceId: `attempt:${id}` },
    payload: { status: "completed", score: 700, mode: "official", correctAnswers: answers, questionsAnswered, completedAt: NOW, attemptId: `attempt:${id}`, gameVersion: "quiz-v1" },
  };
}

async function publish(ctx, value = event()) {
  return publishCoreEvent(ctx.env, value, [platformMissionConsumer], NOW);
}

function mission(ctx, id) {
  return ctx.raw.prepare("SELECT progress,state,completed_at completedAt FROM user_platform_missions WHERE id=?").get(id);
}

test("GAME_FINISHED v2 records simple mission progress", async t => {
  const ctx = setup(t);
  assign(ctx, { id: "questions", code: "daily_global_questions_10", target: 10 });
  await publish(ctx, event({ questionsAnswered: 4 }));
  assert.deepEqual({ ...mission(ctx, "questions") }, { progress: 4, state: "active", completedAt: null });
});

test("mission reaches READY_TO_CLAIM through the compatible completed state", async t => {
  const ctx = setup(t);
  assign(ctx, { id: "games", code: "daily_global_games_1", target: 1 });
  await publish(ctx);
  assert.deepEqual({ ...mission(ctx, "games") }, { progress: 1, state: "completed", completedAt: NOW });
});

test("event replay is idempotent for receipt, progress and completion", async t => {
  const ctx = setup(t);
  assign(ctx, { id: "questions", code: "daily_global_questions_10", target: 10 });
  const value = event({ questionsAnswered: 4 });
  await publish(ctx, value);
  const replay = await publish(ctx, value);
  assert.equal(replay.duplicate, true);
  assert.equal(mission(ctx, "questions").progress, 4);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_mission_progress_events").get().total, 1);
});

test("already completed mission remains unchanged", async t => {
  const ctx = setup(t);
  assign(ctx, { id: "done", code: "daily_global_games_1", target: 1, progress: 1, state: "completed" });
  await publish(ctx);
  assert.deepEqual({ ...mission(ctx, "done") }, { progress: 1, state: "completed", completedAt: null });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_mission_progress_events").get().total, 0);
});

test("mission with incompatible game filter is ignored", async t => {
  const ctx = setup(t);
  assign(ctx, { id: "quiz", code: "daily_quiz_official_games_1", target: 1, gameId: "outro-jogo" });
  await publish(ctx);
  assert.equal(mission(ctx, "quiz").progress, 0);
});

test("one event progresses multiple eligible missions independently", async t => {
  const ctx = setup(t);
  assign(ctx, { id: "global-games", code: "daily_global_games_1", target: 1 });
  assign(ctx, { id: "quiz-questions", code: "daily_quiz_questions_10", target: 10, gameId: "quiz-biblico" });
  assign(ctx, { id: "quiz-correct", code: "daily_quiz_correct_7", target: 7, gameId: "quiz-biblico" });
  await publish(ctx, event({ correctAnswers: 7, questionsAnswered: 10 }));
  assert.deepEqual(["global-games", "quiz-correct", "quiz-questions"].map(id => ({ id, ...mission(ctx, id) })), [
    { id: "global-games", progress: 1, state: "completed", completedAt: NOW },
    { id: "quiz-correct", progress: 7, state: "completed", completedAt: NOW },
    { id: "quiz-questions", progress: 10, state: "completed", completedAt: NOW },
  ]);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_mission_progress_events").get().total, 3);
});
