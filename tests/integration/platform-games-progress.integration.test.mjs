import assert from "node:assert/strict";
import test from "node:test";
import { onRequestPost as finishPlatformGame } from "../../functions/api/platform/games/finish.ts";
import { timelineRoundFromContent } from "../../functions/_lib/game-integrations/timeline-content.ts";
import { memorySetFromContent } from "../../functions/_lib/game-integrations/memory-content.ts";
import { associationRoundFromContent } from "../../functions/_lib/game-integrations/association-content.ts";
import { whoAmIChallengesFromContent } from "../../functions/_lib/game-integrations/who-am-i-content.ts";
import { threeCluesChallengesFromContent } from "../../functions/_lib/game-integrations/three-clues-content.ts";
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
  ctx.raw.prepare(`INSERT INTO content_items(
    id,organization_id,game_type,status,category,difficulty,biblical_reference,tags_json,
    payload_json,version,author_id,created_at,updated_at
  ) VALUES('wordle-published','org-1','wordle-biblico','PUBLISHED','Personagens','EASY',
    'Mateus 1:21','[]','{"word":"JESUS","hint":"O Salvador"}',2,'player',?,?)`).run(NOW, NOW);
  ctx.raw.prepare(`INSERT INTO content_items(
    id,organization_id,game_type,status,category,difficulty,biblical_reference,tags_json,
    payload_json,version,author_id,created_at,updated_at
  ) VALUES('timeline-published','org-1','linha-do-tempo-biblica','PUBLISHED','Eventos','EASY',
    'Gênesis 1–12','[]','{"title":"Origens","events":[{"title":"Criação","position":1},{"title":"Dilúvio","position":2},{"title":"Abraão","position":3}]}',3,'player',?,?)`).run(NOW, NOW);
  ctx.raw.prepare(`INSERT INTO content_items(
    id,organization_id,game_type,status,category,difficulty,biblical_reference,tags_json,
    payload_json,version,author_id,created_at,updated_at
  ) VALUES('memory-published','org-1','memoria-biblica','PUBLISHED','Personagens','EASY',
    'Gênesis–1 Samuel','[]','{"title":"Personagens","pairs":[{"front":"Noé","back":"Arca"},{"front":"Moisés","back":"Êxodo"},{"front":"Davi","back":"Golias"}]}',4,'player',?,?)`).run(NOW, NOW);
  ctx.raw.prepare(`INSERT INTO content_items(
    id,organization_id,game_type,status,category,difficulty,biblical_reference,tags_json,
    payload_json,version,author_id,created_at,updated_at
  ) VALUES('association-published','org-1','associacao-de-temas','PUBLISHED','Personagens','EASY',
    'Gênesis–1 Samuel','[]','{"title":"Personagens e feitos","pairs":[{"left":"Noé","right":"Arca"},{"left":"Moisés","right":"Êxodo"},{"left":"Davi","right":"Golias"}]}',5,'player',?,?)`).run(NOW, NOW);
  ctx.raw.prepare(`INSERT INTO content_items(
    id,organization_id,game_type,status,category,difficulty,biblical_reference,tags_json,
    payload_json,version,author_id,created_at,updated_at
  ) VALUES('who-am-i-published','org-1','quem-sou-eu','PUBLISHED','Personagens','EASY',
    'Êxodo–Ester','[]','{"title":"Personagens bíblicos","challenges":[{"answer":"Moisés","hints":["Egito","Sarça","Êxodo"]},{"answer":"Davi","hints":["Pastor","Funda","Rei"]},{"answer":"Ester","hints":["Pérsia","Rainha","Seu povo"]}]}',6,'player',?,?)`).run(NOW, NOW);
  ctx.raw.prepare(`INSERT INTO content_items(
    id,organization_id,game_type,status,category,difficulty,biblical_reference,tags_json,
    payload_json,version,author_id,created_at,updated_at
  ) VALUES('three-clues-published','org-1','jogo-tres-pistas','PUBLISHED','Personagens','EASY',
    'Gênesis–Ester','[]','{"title":"Personagens bíblicos","challenges":[{"answer":"Noé","clues":["Obedeci","Arca","Dilúvio"]},{"answer":"Davi","clues":["Pastor","Funda","Rei"]},{"answer":"Ester","clues":["Pérsia","Rainha","Seu povo"]}]}',7,'player',?,?)`).run(NOW, NOW);
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
    contentId: "wordle-published",
    contentVersion: 2,
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
  assert.deepEqual({ ...progress }, { totalXp: 160, coins: 23 });

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

test("3 Pistas CMS completion reaches Progress, Statistics, Achievements and Missions", async t => {
  const { ctx, token } = await setup(t);
  const challenges = await threeCluesChallengesFromContent("three-clues-published", {
    title: "Personagens bíblicos",
    challenges: [
      { answer: "Noé", clues: ["Obedeci", "Arca", "Dilúvio"] },
      { answer: "Davi", clues: ["Pastor", "Funda", "Rei"] },
      { answer: "Ester", clues: ["Pérsia", "Rainha", "Seu povo"] },
    ],
  });
  const response = await withFrozenTime(NOW, () => finishPlatformGame({
    request: request(token, {
      gameId: "jogo-tres-pistas",
      sessionId: "session-clues-integration",
      contentId: "three-clues-published",
      contentVersion: 7,
      challenges: challenges.map((challenge, index) => ({
        challengeId: challenge.id,
        actions: index === 0
          ? [{ type: "guess", answer: challenge.answer }]
          : [{ type: "reveal" }, { type: "guess", answer: challenge.answer }],
      })),
    }),
    env: ctx.env,
  }));
  const data = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal(data.outcome, "won");
  assert.equal(data.score, 700);
  assert.deepEqual({
    ...ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get(),
  }, { totalXp: 160, coins: 23 });
  assert.deepEqual({
    ...ctx.raw.prepare(`SELECT sessions_completed sessionsCompleted,questions_answered questionsAnswered,
      correct_answers correctAnswers,incorrect_answers incorrectAnswers,best_score bestScore
      FROM user_platform_game_statistics WHERE user_id='player' AND game_id='jogo-tres-pistas'`).get(),
  }, {
    sessionsCompleted: 1,
    questionsAnswered: 3,
    correctAnswers: 3,
    incorrectAnswers: 0,
    bestScore: 700,
  });
});

test("Linha do Tempo victory reaches Progress, Statistics, Achievements and Missions", async t => {
  const { ctx, token } = await setup(t);
  const timelineRound = await timelineRoundFromContent("timeline-published", {
    title: "Origens",
    events: [
      { title: "Criação", position: 1 },
      { title: "Dilúvio", position: 2 },
      { title: "Abraão", position: 3 },
    ],
  });
  const response = await withFrozenTime(NOW, () => finishPlatformGame({
    request: request(token, {
      gameId: "linha-do-tempo-biblica",
      sessionId: "session-timeline-integration",
      contentId: "timeline-published",
      contentVersion: 3,
      orderedEventIds: timelineRound.events.map(event => event.id),
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
  }, { totalXp: 160, coins: 23 });
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
  const set = await memorySetFromContent("memory-published", {
    title: "Personagens",
    pairs: [
      { front: "Noé", back: "Arca" },
      { front: "Moisés", back: "Êxodo" },
      { front: "Davi", back: "Golias" },
    ],
  });
  const response = await withFrozenTime(NOW, () => finishPlatformGame({
    request: request(token, {
      gameId: "memoria-biblica",
      sessionId: "session-memory-integration",
      contentId: "memory-published",
      contentVersion: 4,
      revealedCardIds: set.pairs.flatMap(pair => [`${pair.id}:a`, `${pair.id}:b`]),
    }),
    env: ctx.env,
  }));
  const data = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal(data.outcome, "won");
  assert.equal(data.score, 450);
  assert.deepEqual({
    ...ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get(),
  }, { totalXp: 160, coins: 23 });
  assert.deepEqual({
    ...ctx.raw.prepare(`SELECT sessions_completed sessionsCompleted,questions_answered questionsAnswered,
      correct_answers correctAnswers,incorrect_answers incorrectAnswers,best_score bestScore
      FROM user_platform_game_statistics WHERE user_id='player' AND game_id='memoria-biblica'`).get(),
  }, {
    sessionsCompleted: 1,
    questionsAnswered: 3,
    correctAnswers: 3,
    incorrectAnswers: 0,
    bestScore: 450,
  });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_achievements WHERE user_id='player'").get().total, 2);
  assert.deepEqual({
    ...ctx.raw.prepare("SELECT progress,state FROM user_platform_missions WHERE id='mission-assignment'").get(),
  }, { progress: 1, state: "completed" });
});

test("Quem Sou Eu victory reaches Progress, Statistics, Achievements and Missions", async t => {
  const { ctx, token } = await setup(t);
  const challenges = await whoAmIChallengesFromContent("who-am-i-published", {
    title: "Personagens bíblicos",
    challenges: [
      { answer: "Moisés", hints: ["Egito", "Sarça", "Êxodo"] },
      { answer: "Davi", hints: ["Pastor", "Funda", "Rei"] },
      { answer: "Ester", hints: ["Pérsia", "Rainha", "Seu povo"] },
    ],
  });
  const response = await withFrozenTime(NOW, () => finishPlatformGame({
    request: request(token, {
      gameId: "quem-sou-eu",
      sessionId: "session-who-am-i-integration",
      contentId: "who-am-i-published",
      contentVersion: 6,
      challenges: challenges.map(challenge => ({
        challengeId: challenge.id,
        actions: [{ type: "guess", answer: challenge.answer }],
      })),
    }),
    env: ctx.env,
  }));
  const data = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal(data.outcome, "won");
  assert.equal(data.score, 1500);
  assert.deepEqual({
    ...ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get(),
  }, { totalXp: 160, coins: 23 });
  assert.deepEqual({
    ...ctx.raw.prepare(`SELECT sessions_completed sessionsCompleted,questions_answered questionsAnswered,
      correct_answers correctAnswers,incorrect_answers incorrectAnswers,best_score bestScore
      FROM user_platform_game_statistics WHERE user_id='player' AND game_id='quem-sou-eu'`).get(),
  }, {
    sessionsCompleted: 1,
    questionsAnswered: 3,
    correctAnswers: 3,
    incorrectAnswers: 0,
    bestScore: 1500,
  });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_achievements WHERE user_id='player'").get().total, 2);
  assert.deepEqual({
    ...ctx.raw.prepare("SELECT progress,state FROM user_platform_missions WHERE id='mission-assignment'").get(),
  }, { progress: 1, state: "completed" });
});

test("Associação de Temas victory reaches Progress, Statistics, Achievements and Missions", async t => {
  const { ctx, token } = await setup(t);
  const round = await associationRoundFromContent("association-published", {
    title: "Personagens e feitos",
    pairs: [
      { left: "Noé", right: "Arca" },
      { left: "Moisés", right: "Êxodo" },
      { left: "Davi", right: "Golias" },
    ],
  });
  const response = await withFrozenTime(NOW, () => finishPlatformGame({
    request: request(token, {
      gameId: "associacao-de-temas",
      sessionId: "session-association-integration",
      contentId: "association-published",
      contentVersion: 5,
      attempts: round.pairs.map(pair => ({ leftId: pair.leftId, rightId: pair.rightId })),
    }),
    env: ctx.env,
  }));
  const data = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal(data.outcome, "won");
  assert.equal(data.score, 300);
  assert.deepEqual({
    ...ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get(),
  }, { totalXp: 160, coins: 23 });
  assert.deepEqual({
    ...ctx.raw.prepare(`SELECT sessions_completed sessionsCompleted,questions_answered questionsAnswered,
      correct_answers correctAnswers,incorrect_answers incorrectAnswers,best_score bestScore
      FROM user_platform_game_statistics WHERE user_id='player' AND game_id='associacao-de-temas'`).get(),
  }, {
    sessionsCompleted: 1,
    questionsAnswered: 3,
    correctAnswers: 3,
    incorrectAnswers: 0,
    bestScore: 300,
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
      contentId: "wordle-published",
      contentVersion: 2,
      guesses: ["PAULO"],
    }),
    env: ctx.env,
  }));
  assert.equal(invalid.status, 400);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM core_platform_events").get().total, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger").get().total, 0);
});
