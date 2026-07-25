import assert from "node:assert/strict";
import test from "node:test";
import { onRequestPost as finishPlatformGame } from "../../functions/api/platform/games/finish.ts";
import {
  createAuthenticatedRequest,
  createSession,
  createTestDatabase,
  responseJson,
  seedOrganization,
  seedUser,
  withFrozenTime,
} from "../helpers/integration.mjs";

const NOW = Date.UTC(2026, 6, 25, 12);

async function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedUser(ctx, { id: "player" });
  const token = await createSession(ctx, "player");
  ctx.raw.prepare(`INSERT INTO platform_mission_definitions(
    id,code,version,name,description,cadence,scope_type,target,progress_unit,
    criterion_json,reward_json,status,created_at,updated_at)
    VALUES('mission-definition','daily_global_games_1',1,'Uma partida','Conclua uma partida',
      'daily','global',1,'partida','{}','{"xp":15,"coins":3}','active',?,?)`).run(NOW, NOW);
  ctx.raw.prepare(`INSERT INTO user_platform_missions(
    id,user_id,organization_id,definition_id,mission_code,cadence,scope_key,window_key,
    target,progress,state,assigned_at,expires_at)
    VALUES('mission-assignment','player','org-1','mission-definition','daily_global_games_1',
      'daily','global','2026-07-25',1,0,'active',?,?)`).run(NOW - 1000, NOW + 86_400_000);
  return { ctx, token };
}

function request(token, body) {
  return createAuthenticatedRequest("https://test/api/platform/games/finish", {
    token,
    method: "POST",
    body,
  });
}

test("Wordle completion updates Progress, Statistics, Achievements and Missions once", async t => {
  const { ctx, token } = await setup(t);
  const body = {
    gameId: "wordle-biblico",
    sessionId: "session-wordle-integration",
    guesses: ["JESUS"],
  };
  const first = await withFrozenTime(NOW, () => finishPlatformGame({ request: request(token, body), env: ctx.env }));
  const data = await responseJson(first);
  assert.equal(first.status, 200);
  assert.equal(data.outcome, "won");
  assert.equal(data.score, 600);

  const replay = await withFrozenTime(NOW, () => finishPlatformGame({ request: request(token, body), env: ctx.env }));
  assert.equal(replay.status, 200);
  assert.equal((await responseJson(replay)).duplicate, true);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events").get().total, 1);

  const progress = ctx.raw.prepare(
    "SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'",
  ).get();
  assert.deepEqual({ ...progress }, { totalXp: 160, coins: 25 });

  const statistics = ctx.raw.prepare(`SELECT sessions_completed sessionsCompleted,
    questions_answered questionsAnswered,correct_answers correctAnswers,
    incorrect_answers incorrectAnswers,best_score bestScore
    FROM user_platform_game_statistics WHERE user_id='player' AND game_id='wordle-biblico'`).get();
  assert.deepEqual({ ...statistics }, {
    sessionsCompleted: 1,
    questionsAnswered: 1,
    correctAnswers: 1,
    incorrectAnswers: 0,
    bestScore: 600,
  });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_achievements WHERE user_id='player'").get().total, 2);
  assert.deepEqual({
    ...ctx.raw.prepare("SELECT progress,state FROM user_platform_missions WHERE id='mission-assignment'").get(),
  }, { progress: 1, state: "completed" });
  assert.deepEqual(
    ctx.raw.prepare("SELECT consumer_id consumerId,state FROM core_platform_event_processing ORDER BY consumer_id")
      .all()
      .map(row => ({ ...row })),
    [
      { consumerId: "platform-achievements", state: "completed" },
      { consumerId: "platform-missions", state: "completed" },
      { consumerId: "platform-statistics", state: "completed" },
      { consumerId: "reward-progress", state: "completed" },
    ],
  );
});

test("3 Pistas defeat is registered with minimum reward and game-specific statistics", async t => {
  const { ctx, token } = await setup(t);
  const response = await withFrozenTime(NOW, () => finishPlatformGame({
    request: request(token, {
      gameId: "jogo-tres-pistas",
      sessionId: "session-clues-integration",
      questionId: "noe",
      answer: "Jonas",
      cluesUsed: 3,
    }),
    env: ctx.env,
  }));
  const data = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal(data.outcome, "lost");
  assert.equal(data.score, 0);
  assert.deepEqual({
    ...ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get(),
  }, { totalXp: 80, coins: 12 });
  assert.deepEqual({
    ...ctx.raw.prepare(`SELECT sessions_completed sessionsCompleted,questions_answered questionsAnswered,
      correct_answers correctAnswers,incorrect_answers incorrectAnswers,best_score bestScore
      FROM user_platform_game_statistics WHERE user_id='player' AND game_id='jogo-tres-pistas'`).get(),
  }, {
    sessionsCompleted: 1,
    questionsAnswered: 1,
    correctAnswers: 0,
    incorrectAnswers: 1,
    bestScore: 0,
  });
});

test("Linha do Tempo victory reaches Progress, Statistics, Achievements and Missions", async t => {
  const { ctx, token } = await setup(t);
  const response = await withFrozenTime(NOW, () => finishPlatformGame({
    request: request(token, {
      gameId: "linha-do-tempo-biblica",
      sessionId: "session-timeline-integration",
      roundId: "origens-e-promessa",
      orderedEventIds: ["criacao", "diluvio", "chamado-abraao", "exodo"],
      attemptsUsed: 1,
    }),
    env: ctx.env,
  }));
  const data = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal(data.outcome, "won");
  assert.equal(data.score, 300);
  assert.deepEqual({
    ...ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get(),
  }, { totalXp: 160, coins: 25 });
  assert.deepEqual({
    ...ctx.raw.prepare(`SELECT sessions_completed sessionsCompleted,questions_answered questionsAnswered,
      correct_answers correctAnswers,incorrect_answers incorrectAnswers,best_score bestScore
      FROM user_platform_game_statistics WHERE user_id='player' AND game_id='linha-do-tempo-biblica'`).get(),
  }, {
    sessionsCompleted: 1,
    questionsAnswered: 1,
    correctAnswers: 1,
    incorrectAnswers: 0,
    bestScore: 300,
  });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_achievements WHERE user_id='player'").get().total, 2);
  assert.deepEqual({
    ...ctx.raw.prepare("SELECT progress,state FROM user_platform_missions WHERE id='mission-assignment'").get(),
  }, { progress: 1, state: "completed" });
});

test("Memória Bíblica victory reaches Progress, Statistics, Achievements and Missions", async t => {
  const { ctx, token } = await setup(t);
  const pairIds = ["arca", "tabuas", "funda", "peixe", "estrela", "paes", "cruz", "fogo"];
  const response = await withFrozenTime(NOW, () => finishPlatformGame({
    request: request(token, {
      gameId: "memoria-biblica",
      sessionId: "session-memory-integration",
      setId: "simbolos-da-biblia",
      revealedCardIds: pairIds.flatMap(id => [`${id}:a`, `${id}:b`]),
    }),
    env: ctx.env,
  }));
  const data = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal(data.outcome, "won");
  assert.equal(data.score, 1200);
  assert.deepEqual({
    ...ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get(),
  }, { totalXp: 160, coins: 25 });
  assert.deepEqual({
    ...ctx.raw.prepare(`SELECT sessions_completed sessionsCompleted,questions_answered questionsAnswered,
      correct_answers correctAnswers,incorrect_answers incorrectAnswers,best_score bestScore
      FROM user_platform_game_statistics WHERE user_id='player' AND game_id='memoria-biblica'`).get(),
  }, {
    sessionsCompleted: 1,
    questionsAnswered: 8,
    correctAnswers: 8,
    incorrectAnswers: 0,
    bestScore: 1200,
  });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_achievements WHERE user_id='player'").get().total, 2);
  assert.deepEqual({
    ...ctx.raw.prepare("SELECT progress,state FROM user_platform_missions WHERE id='mission-assignment'").get(),
  }, { progress: 1, state: "completed" });
});

test("Quem Sou Eu victory reaches Progress, Statistics, Achievements and Missions", async t => {
  const { ctx, token } = await setup(t);
  const response = await withFrozenTime(NOW, () => finishPlatformGame({
    request: request(token, {
      gameId: "quem-sou-eu",
      sessionId: "session-who-am-i-integration",
      characterId: "moises",
      actions: [{ type: "guess", answerId: "moises" }],
    }),
    env: ctx.env,
  }));
  const data = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal(data.outcome, "won");
  assert.equal(data.score, 500);
  assert.deepEqual({
    ...ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get(),
  }, { totalXp: 160, coins: 25 });
  assert.deepEqual({
    ...ctx.raw.prepare(`SELECT sessions_completed sessionsCompleted,questions_answered questionsAnswered,
      correct_answers correctAnswers,incorrect_answers incorrectAnswers,best_score bestScore
      FROM user_platform_game_statistics WHERE user_id='player' AND game_id='quem-sou-eu'`).get(),
  }, {
    sessionsCompleted: 1,
    questionsAnswered: 1,
    correctAnswers: 1,
    incorrectAnswers: 0,
    bestScore: 500,
  });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_achievements WHERE user_id='player'").get().total, 2);
  assert.deepEqual({
    ...ctx.raw.prepare("SELECT progress,state FROM user_platform_missions WHERE id='mission-assignment'").get(),
  }, { progress: 1, state: "completed" });
});

test("Associação de Temas victory reaches Progress, Statistics, Achievements and Missions", async t => {
  const { ctx, token } = await setup(t);
  const pairIds = ["noe-arca", "davi-golias", "ester-povo", "moises-mar"];
  const response = await withFrozenTime(NOW, () => finishPlatformGame({
    request: request(token, {
      gameId: "associacao-de-temas",
      sessionId: "session-association-integration",
      roundId: "personagens-e-feitos",
      attempts: pairIds.map(id => ({ leftId: id, rightId: id })),
    }),
    env: ctx.env,
  }));
  const data = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal(data.outcome, "won");
  assert.equal(data.score, 400);
  assert.deepEqual({
    ...ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get(),
  }, { totalXp: 160, coins: 25 });
  assert.deepEqual({
    ...ctx.raw.prepare(`SELECT sessions_completed sessionsCompleted,questions_answered questionsAnswered,
      correct_answers correctAnswers,incorrect_answers incorrectAnswers,best_score bestScore
      FROM user_platform_game_statistics WHERE user_id='player' AND game_id='associacao-de-temas'`).get(),
  }, {
    sessionsCompleted: 1,
    questionsAnswered: 4,
    correctAnswers: 4,
    incorrectAnswers: 0,
    bestScore: 400,
  });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_achievements WHERE user_id='player'").get().total, 2);
  assert.deepEqual({
    ...ctx.raw.prepare("SELECT progress,state FROM user_platform_missions WHERE id='mission-assignment'").get(),
  }, { progress: 1, state: "completed" });
});

test("completion endpoint requires authentication and rejects incomplete games without effects", async t => {
  const { ctx, token } = await setup(t);
  const unauthenticated = await finishPlatformGame({
    request: new Request("https://test/api/platform/games/finish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameId: "wordle-biblico" }),
    }),
    env: ctx.env,
  });
  assert.equal(unauthenticated.status, 401);

  const invalid = await withFrozenTime(NOW, () => finishPlatformGame({
    request: request(token, {
      gameId: "wordle-biblico",
      sessionId: "session-wordle-incomplete",
      guesses: ["PAULO"],
    }),
    env: ctx.env,
  }));
  assert.equal(invalid.status, 400);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger").get().total, 0);
});
