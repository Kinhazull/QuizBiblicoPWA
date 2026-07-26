import assert from "node:assert/strict";
import test from "node:test";
import { adaptPlatformGameCompletion } from "../../functions/_lib/game-integrations/platform-game-completion.ts";

const context = {
  userId: "player",
  organizationId: "org-1",
  completedAt: Date.UTC(2026, 6, 25, 12),
};

test("Wordle victory is normalized to a deterministic GAME_FINISHED v2", () => {
  const input = {
    gameId: "wordle-biblico",
    sessionId: "session-wordle-001",
    guesses: ["PAULO", "JESUS"],
  };
  const first = adaptPlatformGameCompletion(input, context);
  const replay = adaptPlatformGameCompletion(input, context);
  assert.deepEqual(first, replay);
  assert.equal(first.eventType, "GAME_FINISHED");
  assert.equal(first.version, 2);
  assert.equal(first.source.service, "wordle-service");
  assert.equal(first.payload.mode, "official");
  assert.equal(first.payload.correctAnswers, 1);
  assert.equal(first.payload.questionsAnswered, 1);
  assert.equal(first.payload.score, 500);
});

test("Wordle loss requires all six valid attempts", () => {
  const loss = adaptPlatformGameCompletion({
    gameId: "wordle-biblico",
    sessionId: "session-wordle-002",
    guesses: ["PAULO", "PEDRO", "MARIA", "SAULO", "TIAGO", "LIVRO"],
  }, context);
  assert.equal(loss.payload.correctAnswers, 0);
  assert.equal(loss.payload.score, 0);
  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "wordle-biblico",
    sessionId: "session-wordle-003",
    guesses: ["PAULO"],
  }, context), /incomplete_wordle_game/);
});

test("3 Pistas result is recalculated from the official static bank", () => {
  const win = adaptPlatformGameCompletion({
    gameId: "jogo-tres-pistas",
    sessionId: "session-clues-001",
    questionId: "davi",
    answer: "Davi",
    cluesUsed: 2,
  }, context);
  assert.equal(win.source.service, "three-clues-service");
  assert.equal(win.payload.score, 200);
  assert.equal(win.payload.correctAnswers, 1);

  const loss = adaptPlatformGameCompletion({
    gameId: "jogo-tres-pistas",
    sessionId: "session-clues-002",
    questionId: "davi",
    answer: "Moisés",
    cluesUsed: 1,
  }, context);
  assert.equal(loss.payload.score, 0);
  assert.equal(loss.payload.correctAnswers, 0);
});

test("Linha do Tempo result is recalculated from the official chronological bank", () => {
  const win = adaptPlatformGameCompletion({
    gameId: "linha-do-tempo-biblica",
    sessionId: "session-timeline-001",
    roundId: "vida-de-jesus",
    orderedEventIds: ["nascimento-jesus", "batismo-jesus", "crucificacao", "ressurreicao"],
    attemptsUsed: 2,
  }, context);
  assert.equal(win.source.service, "timeline-service");
  assert.equal(win.payload.score, 200);
  assert.equal(win.payload.correctAnswers, 1);

  const loss = adaptPlatformGameCompletion({
    gameId: "linha-do-tempo-biblica",
    sessionId: "session-timeline-002",
    roundId: "vida-de-jesus",
    orderedEventIds: ["ressurreicao", "crucificacao", "batismo-jesus", "nascimento-jesus"],
    attemptsUsed: 3,
  }, context);
  assert.equal(loss.payload.score, 0);
  assert.equal(loss.payload.correctAnswers, 0);
  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "linha-do-tempo-biblica",
    sessionId: "session-timeline-003",
    roundId: "vida-de-jesus",
    orderedEventIds: ["ressurreicao", "crucificacao", "batismo-jesus", "nascimento-jesus"],
    attemptsUsed: 1,
  }, context), /incomplete_timeline_game/);
});

test("Memória Bíblica result is recalculated from the full reveal history", () => {
  const pairIds = ["arca", "tabuas", "funda", "peixe", "estrela", "paes", "cruz", "fogo"];
  const win = adaptPlatformGameCompletion({
    gameId: "memoria-biblica",
    sessionId: "session-memory-001",
    setId: "simbolos-da-biblia",
    revealedCardIds: pairIds.flatMap(id => [`${id}:a`, `${id}:b`]),
  }, context);
  assert.equal(win.source.service, "memory-service");
  assert.equal(win.payload.score, 1200);
  assert.equal(win.payload.correctAnswers, 8);
  assert.equal(win.payload.questionsAnswered, 8);

  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "memoria-biblica",
    sessionId: "session-memory-002",
    setId: "simbolos-da-biblia",
    revealedCardIds: pairIds.slice(0, 7).flatMap(id => [`${id}:a`, `${id}:b`]),
  }, context), /invalid_memory_reveals|incomplete_memory_game/);
});

test("Quem Sou Eu result is recalculated from progressive hint actions", () => {
  const win = adaptPlatformGameCompletion({
    gameId: "quem-sou-eu",
    sessionId: "session-who-am-i-001",
    characterId: "moises",
    actions: [{ type: "reveal" }, { type: "guess", answerId: "moises" }],
  }, context);
  assert.equal(win.source.service, "who-am-i-service");
  assert.equal(win.payload.score, 400);
  assert.equal(win.payload.correctAnswers, 1);
  assert.equal(win.payload.questionsAnswered, 1);

  const loss = adaptPlatformGameCompletion({
    gameId: "quem-sou-eu",
    sessionId: "session-who-am-i-002",
    characterId: "moises",
    actions: [
      { type: "reveal" }, { type: "reveal" }, { type: "reveal" }, { type: "reveal" },
      { type: "guess", answerId: "josue" },
    ],
  }, context);
  assert.equal(loss.payload.score, 0);
  assert.equal(loss.payload.correctAnswers, 0);
});

test("Associação de Temas result is recalculated from the complete selection transcript", () => {
  const pairIds = ["noe-arca", "davi-golias", "ester-povo", "moises-mar"];
  const win = adaptPlatformGameCompletion({
    gameId: "associacao-de-temas",
    sessionId: "session-association-001",
    roundId: "personagens-e-feitos",
    attempts: pairIds.map(id => ({ leftId: id, rightId: id })),
  }, context);
  assert.equal(win.source.service, "theme-association-service");
  assert.equal(win.payload.score, 400);
  assert.equal(win.payload.correctAnswers, 4);
  assert.equal(win.payload.questionsAnswered, 4);

  const wrong = { leftId: pairIds[0], rightId: pairIds[1] };
  const loss = adaptPlatformGameCompletion({
    gameId: "associacao-de-temas",
    sessionId: "session-association-002",
    roundId: "personagens-e-feitos",
    attempts: [wrong, wrong, wrong],
  }, context);
  assert.equal(loss.payload.score, 0);
  assert.equal(loss.payload.correctAnswers, 0);
});

test("invalid or tampered completions are rejected", () => {
  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "wordle-biblico",
    sessionId: "bad",
    guesses: ["JESUS"],
  }, context), /invalid_game_session/);
  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "jogo-tres-pistas",
    sessionId: "session-clues-003",
    questionId: "unknown",
    answer: "Davi",
    cluesUsed: 1,
  }, context), /invalid_three_clues_question/);
  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "linha-do-tempo-biblica",
    sessionId: "session-timeline-004",
    roundId: "unknown",
    orderedEventIds: ["one", "two", "three", "four"],
    attemptsUsed: 3,
  }, context), /invalid_timeline_round/);
  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "memoria-biblica",
    sessionId: "session-memory-003",
    setId: "unknown",
    revealedCardIds: [],
  }, context), /invalid_memory_set/);
  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "associacao-de-temas",
    sessionId: "session-association-003",
    roundId: "unknown",
    attempts: [],
  }, context), /invalid_association_round/);
  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "quem-sou-eu",
    sessionId: "session-who-am-i-003",
    characterId: "unknown",
    actions: [],
  }, context), /invalid_who_am_i_character/);
});
