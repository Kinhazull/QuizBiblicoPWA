import assert from "node:assert/strict";
import test from "node:test";
import {
  applyThreeCluesAction,
  evaluateThreeCluesChallenge,
  evaluateThreeCluesSet,
  initialThreeCluesState,
  isCorrectThreeCluesAnswer,
  normalizeThreeCluesAnswer,
  scoreForCluesUsed,
} from "../../app/games/three-clues/engine.ts";

const challenges = [
  { id: "challenge-1", answer: "Noé", clues: ["Obedeci", "Construí uma arca", "Sobrevivi ao dilúvio"] },
  { id: "challenge-2", answer: "Davi", clues: ["Fui pastor", "Usei uma funda", "Fui rei"] },
  { id: "challenge-3", answer: "Ester", clues: ["Vivi na Pérsia", "Fui rainha", "Intercedi pelo povo"] },
];

test("normalizes case and repeated outer or inner spaces", () => {
  assert.equal(normalizeThreeCluesAnswer("  Mar   Vermelho  "), "mar vermelho");
  assert.equal(isCorrectThreeCluesAnswer("  NOÉ ", "Noé"), true);
  assert.equal(isCorrectThreeCluesAnswer("Jonas", "Noé"), false);
});

test("reveals exactly three clues in order", () => {
  const first = initialThreeCluesState();
  const second = applyThreeCluesAction(challenges[0], first, { type: "reveal" });
  const third = applyThreeCluesAction(challenges[0], second, { type: "reveal" });
  assert.deepEqual([first.cluesVisible, second.cluesVisible, third.cluesVisible], [1, 2, 3]);
  assert.throws(() => applyThreeCluesAction(challenges[0], third, { type: "reveal" }), /all_three_clues_revealed/);
});

test("scores each challenge by the number of clues used", () => {
  assert.equal(scoreForCluesUsed(1), 300);
  assert.equal(scoreForCluesUsed(2), 200);
  assert.equal(scoreForCluesUsed(3), 100);
  assert.equal(evaluateThreeCluesChallenge(challenges[0], [
    { type: "reveal" },
    { type: "guess", answer: "Noé" },
  ]).score, 200);
  assert.equal(evaluateThreeCluesChallenge(challenges[0], [
    { type: "guess", answer: "Jonas" },
  ]).score, 0);
});

test("revalidates the complete set and rejects tampered histories", () => {
  const histories = [
    { challengeId: "challenge-1", actions: [{ type: "guess", answer: "Noé" }] },
    { challengeId: "challenge-2", actions: [{ type: "reveal" }, { type: "guess", answer: "Davi" }] },
    { challengeId: "challenge-3", actions: [{ type: "reveal" }, { type: "reveal" }, { type: "guess", answer: "Rute" }] },
  ];
  assert.deepEqual(evaluateThreeCluesSet(challenges, histories), {
    score: 500,
    correctAnswers: 2,
    questionsAnswered: 3,
  });
  assert.throws(() => evaluateThreeCluesSet(challenges, histories.slice(0, 2)), /incomplete_three_clues_game/);
  assert.throws(() => evaluateThreeCluesSet(challenges, [histories[0], histories[0], histories[2]]), /invalid_three_clues_history/);
});
