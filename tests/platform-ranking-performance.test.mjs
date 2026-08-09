import assert from "node:assert/strict";
import test from "node:test";
import { normalizedGamePerformance } from "../functions/_lib/platform-statistics.ts";

test("normalizes Memory independently from the number of pairs", () => {
  assert.equal(normalizedGamePerformance("memoria-biblica", { score: 450, correctAnswers: 3, questionsAnswered: 3 }), 100);
  assert.equal(normalizedGamePerformance("memoria-biblica", { score: 900, correctAnswers: 6, questionsAnswered: 6 }), 100);
  assert.equal(normalizedGamePerformance("memoria-biblica", { score: 300, correctAnswers: 4, questionsAnswered: 4 }), 50);
});

test("normalizes Association using completion and server-validated error efficiency", () => {
  assert.equal(normalizedGamePerformance("associacao-de-temas", { score: 400, correctAnswers: 4, questionsAnswered: 4 }), 100);
  assert.equal(normalizedGamePerformance("associacao-de-temas", { score: 200, correctAnswers: 4, questionsAnswered: 4 }), 87);
  assert.equal(normalizedGamePerformance("associacao-de-temas", { score: 0, correctAnswers: 2, questionsAnswered: 4 }), 40);
});

test("normalizes Who Am I and Three Clues by their per-challenge maximum", () => {
  assert.equal(normalizedGamePerformance("quem-sou-eu", { score: 1500, correctAnswers: 3, questionsAnswered: 3 }), 100);
  assert.equal(normalizedGamePerformance("quem-sou-eu", { score: 500, correctAnswers: 2, questionsAnswered: 4 }), 25);
  assert.equal(normalizedGamePerformance("jogo-tres-pistas", { score: 900, correctAnswers: 3, questionsAnswered: 3 }), 100);
  assert.equal(normalizedGamePerformance("jogo-tres-pistas", { score: 300, correctAnswers: 2, questionsAnswered: 3 }), 33);
});

test("rejects malformed payloads and does not normalize the three existing score rankings", () => {
  assert.equal(normalizedGamePerformance("memoria-biblica", { score: -1, correctAnswers: 3, questionsAnswered: 3 }), null);
  assert.equal(normalizedGamePerformance("memoria-biblica", { score: 100, correctAnswers: 4, questionsAnswered: 3 }), null);
  assert.equal(normalizedGamePerformance("memoria-biblica", { score: 9999, correctAnswers: 3, questionsAnswered: 3 }), null);
  assert.equal(normalizedGamePerformance("associacao-de-temas", { score: 350, correctAnswers: 3, questionsAnswered: 3 }), null);
  assert.equal(normalizedGamePerformance("quiz-biblico", { score: 100, correctAnswers: 1, questionsAnswered: 1 }), null);
});
