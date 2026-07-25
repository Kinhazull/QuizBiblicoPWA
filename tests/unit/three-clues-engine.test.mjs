import assert from "node:assert/strict";
import test from "node:test";
import {
  isCorrectThreeCluesAnswer,
  nextQuestionIndex,
  normalizeThreeCluesAnswer,
  scoreForCluesUsed,
  THREE_CLUES_MAX,
} from "../../app/games/three-clues/engine.ts";
import { THREE_CLUES_QUESTIONS } from "../../app/games/three-clues/questions.ts";

test("initial static bank has complete and unique rounds", () => {
  assert.ok(THREE_CLUES_QUESTIONS.length >= 4);
  assert.equal(new Set(THREE_CLUES_QUESTIONS.map(item => item.id)).size, THREE_CLUES_QUESTIONS.length);
  for (const question of THREE_CLUES_QUESTIONS) {
    assert.ok(question.answer.trim());
    assert.equal(question.clues.length, THREE_CLUES_MAX);
    assert.ok(question.clues.every(clue => clue.trim().length > 0));
  }
});

test("normalizes and validates answers without accents or case sensitivity", () => {
  assert.equal(normalizeThreeCluesAnswer(" Noé! "), "NOE");
  assert.equal(isCorrectThreeCluesAnswer("NOE", "Noé"), true);
  assert.equal(isCorrectThreeCluesAnswer("Jonas", "Noé"), false);
  assert.equal(isCorrectThreeCluesAnswer("", "Noé"), false);
});

test("scores according to the number of clues used", () => {
  assert.equal(scoreForCluesUsed(1), 300);
  assert.equal(scoreForCluesUsed(2), 200);
  assert.equal(scoreForCluesUsed(3), 100);
  assert.throws(() => scoreForCluesUsed(0), /invalid_clues_used/);
  assert.throws(() => scoreForCluesUsed(4), /invalid_clues_used/);
});

test("restart advances safely through the static bank", () => {
  assert.equal(nextQuestionIndex(0, 4), 1);
  assert.equal(nextQuestionIndex(3, 4), 0);
});

