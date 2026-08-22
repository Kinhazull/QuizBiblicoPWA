import assert from "node:assert/strict";
import test from "node:test";
import { adaptPlatformGameCompletion } from "../../functions/_lib/game-integrations/platform-game-completion.ts";

const context = {
  userId: "player",
  organizationId: "org-1",
  completedAt: Date.UTC(2026, 6, 25, 12),
  wordleContent: { id: "wordle-1", version: 3, answer: "JESUS" },
  timelineContent: {
    id: "timeline-1",
    version: 4,
    round: {
      id: "timeline-1",
      title: "Vida de Jesus",
      events: [
        { id: "event-1", title: "Nascimento", position: 1 },
        { id: "event-2", title: "Batismo", position: 2 },
        { id: "event-3", title: "Crucificação", position: 3 },
        { id: "event-4", title: "Ressurreição", position: 4 },
      ],
    },
  },
  memoryContent: {
    id: "memory-1",
    version: 2,
    set: {
      id: "memory-1",
      title: "Personagens",
      pairs: [
        { id: "pair-1", front: "Noé", back: "Arca" },
        { id: "pair-2", front: "Moisés", back: "Êxodo" },
        { id: "pair-3", front: "Davi", back: "Golias" },
      ],
    },
  },
  associationContent: {
    id: "association-1",
    version: 5,
    round: {
      id: "association-1",
      title: "Personagens e feitos",
      pairs: [
        { id: "pair-1", leftId: "left-1", rightId: "right-1", left: "Noé", right: "Arca" },
        { id: "pair-2", leftId: "left-2", rightId: "right-2", left: "Davi", right: "Golias" },
        { id: "pair-3", leftId: "left-3", rightId: "right-3", left: "Moisés", right: "Mar Vermelho" },
      ],
    },
  },
  whoAmIContent: {
    id: "who-am-i-1",
    version: 6,
    challenges: [
      { id: "challenge-1", answer: "Moisés", hints: ["Egito", "Sarça", "Êxodo"] },
      { id: "challenge-2", answer: "Davi", hints: ["Pastor", "Funda", "Rei"] },
      { id: "challenge-3", answer: "Ester", hints: ["Pérsia", "Rainha", "Seu povo"] },
    ],
  },
  threeCluesContent: {
    id: "three-clues-1",
    version: 7,
    challenges: [
      { id: "clue-1", answer: "Noé", clues: ["Obedeci", "Arca", "Dilúvio"] },
      { id: "clue-2", answer: "Davi", clues: ["Pastor", "Funda", "Rei"] },
      { id: "clue-3", answer: "Ester", clues: ["Pérsia", "Rainha", "Seu povo"] },
    ],
  },
};

test("Wordle victory is normalized to a deterministic GAME_FINISHED v2", () => {
  const input = {
    gameId: "wordle-biblico",
    sessionId: "session-wordle-001",
    contentId: "wordle-1",
    contentVersion: 3,
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

test("Wordle completion accepts the supported six and seven letter answers", () => {
  for (const [answer, sessionId] of [["DEBORA", "session-wordle-six"], ["CALVARI", "session-wordle-seven"]]) {
    const event = adaptPlatformGameCompletion({
      gameId: "wordle-biblico",
      sessionId,
      contentId: "wordle-variable",
      contentVersion: 1,
      guesses: [answer],
    }, {
      ...context,
      wordleContent: { id: "wordle-variable", version: 1, answer },
    });
    assert.equal(event.payload.correctAnswers, 1);
    assert.equal(event.payload.score, 600);
  }
});

test("Wordle loss requires all six valid attempts", () => {
  const loss = adaptPlatformGameCompletion({
    gameId: "wordle-biblico",
    sessionId: "session-wordle-002",
    contentId: "wordle-1",
    contentVersion: 3,
    guesses: ["PAULO", "PEDRO", "MARIA", "SAULO", "TIAGO", "LIVRO"],
  }, context);
  assert.equal(loss.payload.correctAnswers, 0);
  assert.equal(loss.payload.score, 0);
  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "wordle-biblico",
    sessionId: "session-wordle-003",
    contentId: "wordle-1",
    contentVersion: 3,
    guesses: ["PAULO"],
  }, context), /incomplete_wordle_game/);
});

test("3 Pistas result is recalculated from the published CMS content", () => {
  const win = adaptPlatformGameCompletion({
    gameId: "jogo-tres-pistas",
    sessionId: "session-clues-001",
    contentId: "three-clues-1",
    contentVersion: 7,
    challenges: [
      { challengeId: "clue-1", actions: [{ type: "guess", answer: "Noé" }] },
      { challengeId: "clue-2", actions: [{ type: "reveal" }, { type: "guess", answer: "Davi" }] },
      { challengeId: "clue-3", actions: [{ type: "reveal" }, { type: "reveal" }, { type: "guess", answer: "Ester" }] },
    ],
  }, context);
  assert.equal(win.source.service, "three-clues-service");
  assert.equal(win.payload.score, 600);
  assert.equal(win.payload.correctAnswers, 3);
  assert.equal(win.payload.questionsAnswered, 3);

  const loss = adaptPlatformGameCompletion({
    gameId: "jogo-tres-pistas",
    sessionId: "session-clues-002",
    contentId: "three-clues-1",
    contentVersion: 7,
    challenges: [
      { challengeId: "clue-1", actions: [{ type: "guess", answer: "Jonas" }] },
      { challengeId: "clue-2", actions: [{ type: "guess", answer: "Saul" }] },
      { challengeId: "clue-3", actions: [{ type: "guess", answer: "Rute" }] },
    ],
  }, context);
  assert.equal(loss.payload.score, 0);
  assert.equal(loss.payload.correctAnswers, 0);
});

test("Linha do Tempo result is recalculated from the published CMS content", () => {
  const win = adaptPlatformGameCompletion({
    gameId: "linha-do-tempo-biblica",
    sessionId: "session-timeline-001",
    contentId: "timeline-1",
    contentVersion: 4,
    orderedEventIds: ["event-1", "event-2", "event-3", "event-4"],
    attemptsUsed: 2,
  }, context);
  assert.equal(win.source.service, "timeline-service");
  assert.equal(win.payload.score, 200);
  assert.equal(win.payload.correctAnswers, 1);

  const loss = adaptPlatformGameCompletion({
    gameId: "linha-do-tempo-biblica",
    sessionId: "session-timeline-002",
    contentId: "timeline-1",
    contentVersion: 4,
    orderedEventIds: ["event-4", "event-3", "event-2", "event-1"],
    attemptsUsed: 3,
  }, context);
  assert.equal(loss.payload.score, 0);
  assert.equal(loss.payload.correctAnswers, 0);
  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "linha-do-tempo-biblica",
    sessionId: "session-timeline-003",
    contentId: "timeline-1",
    contentVersion: 4,
    orderedEventIds: ["event-4", "event-3", "event-2", "event-1"],
    attemptsUsed: 1,
  }, context), /incomplete_timeline_game/);
});

test("Memória Bíblica result is recalculated from the full reveal history", () => {
  const pairIds = ["pair-1", "pair-2", "pair-3"];
  const win = adaptPlatformGameCompletion({
    gameId: "memoria-biblica",
    sessionId: "session-memory-001",
    contentId: "memory-1",
    contentVersion: 2,
    revealedCardIds: pairIds.flatMap(id => [`${id}:a`, `${id}:b`]),
  }, context);
  assert.equal(win.source.service, "memory-service");
  assert.equal(win.payload.score, 450);
  assert.equal(win.payload.correctAnswers, 3);
  assert.equal(win.payload.questionsAnswered, 3);

  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "memoria-biblica",
    sessionId: "session-memory-002",
    contentId: "memory-1",
    contentVersion: 2,
    revealedCardIds: pairIds.slice(0, 2).flatMap(id => [`${id}:a`, `${id}:b`]),
  }, context), /invalid_memory_reveals|incomplete_memory_game/);
});

test("Quem Sou Eu result is recalculated from progressive hint actions", () => {
  const win = adaptPlatformGameCompletion({
    gameId: "quem-sou-eu",
    sessionId: "session-who-am-i-001",
    contentId: "who-am-i-1",
    contentVersion: 6,
    challenges: [
      { challengeId: "challenge-1", actions: [{ type: "reveal" }, { type: "guess", answer: "Moisés" }] },
      { challengeId: "challenge-2", actions: [{ type: "guess", answer: "Davi" }] },
      { challengeId: "challenge-3", actions: [{ type: "guess", answer: "Ester" }] },
    ],
  }, context);
  assert.equal(win.source.service, "who-am-i-service");
  assert.equal(win.payload.score, 1400);
  assert.equal(win.payload.correctAnswers, 3);
  assert.equal(win.payload.questionsAnswered, 3);

  const loss = adaptPlatformGameCompletion({
    gameId: "quem-sou-eu",
    sessionId: "session-who-am-i-002",
    contentId: "who-am-i-1",
    contentVersion: 6,
    challenges: [
      { challengeId: "challenge-1", actions: [{ type: "guess", answer: "Josué" }] },
      { challengeId: "challenge-2", actions: [{ type: "guess", answer: "Saul" }] },
      { challengeId: "challenge-3", actions: [{ type: "guess", answer: "Rute" }] },
    ],
  }, context);
  assert.equal(loss.payload.score, 0);
  assert.equal(loss.payload.correctAnswers, 0);
});

test("Associação de Temas result is recalculated from the complete selection transcript", () => {
  const pairs = context.associationContent.round.pairs;
  const win = adaptPlatformGameCompletion({
    gameId: "associacao-de-temas",
    sessionId: "session-association-001",
    contentId: "association-1",
    contentVersion: 5,
    attempts: pairs.map(pair => ({ leftId: pair.leftId, rightId: pair.rightId })),
  }, context);
  assert.equal(win.source.service, "theme-association-service");
  assert.equal(win.payload.score, 300);
  assert.equal(win.payload.correctAnswers, 3);
  assert.equal(win.payload.questionsAnswered, 3);

  const wrong = { leftId: pairs[0].leftId, rightId: pairs[1].rightId };
  const loss = adaptPlatformGameCompletion({
    gameId: "associacao-de-temas",
    sessionId: "session-association-002",
    contentId: "association-1",
    contentVersion: 5,
    attempts: [wrong, wrong, wrong],
  }, context);
  assert.equal(loss.payload.score, 0);
  assert.equal(loss.payload.correctAnswers, 0);
});

test("invalid or tampered completions are rejected", () => {
  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "wordle-biblico",
    sessionId: "bad",
    contentId: "wordle-1",
    contentVersion: 3,
    guesses: ["JESUS"],
  }, context), /invalid_game_session/);
  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "jogo-tres-pistas",
    sessionId: "session-clues-003",
    contentId: "unknown",
    contentVersion: 7,
    challenges: [],
  }, context), /invalid_three_clues_content/);
  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "linha-do-tempo-biblica",
    sessionId: "session-timeline-004",
    contentId: "unknown",
    contentVersion: 4,
    orderedEventIds: ["one", "two", "three", "four"],
    attemptsUsed: 3,
  }, context), /invalid_timeline_content/);
  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "memoria-biblica",
    sessionId: "session-memory-003",
    contentId: "unknown",
    contentVersion: 2,
    revealedCardIds: [],
  }, context), /invalid_memory_content/);
  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "associacao-de-temas",
    sessionId: "session-association-003",
    contentId: "unknown",
    contentVersion: 5,
    attempts: [],
  }, context), /invalid_association_content/);
  assert.throws(() => adaptPlatformGameCompletion({
    gameId: "quem-sou-eu",
    sessionId: "session-who-am-i-003",
    contentId: "unknown",
    contentVersion: 6,
    challenges: [],
  }, context), /invalid_who_am_i_content/);
});
