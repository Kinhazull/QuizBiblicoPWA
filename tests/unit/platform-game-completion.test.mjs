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
});
