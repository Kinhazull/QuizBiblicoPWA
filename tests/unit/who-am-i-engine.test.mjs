import assert from "node:assert/strict";
import test from "node:test";
import {
  applyWhoAmIAction,
  evaluateWhoAmIChallenge,
  evaluateWhoAmISet,
  initialWhoAmIState,
  normalizeWhoAmIAnswer,
} from "../../app/games/who-am-i/engine.ts";

const challenges = [
  {
    id: "challenge-1",
    answer: "Moisés",
    hints: ["Fui criado no Egito", "Vi uma sarça", "Conduzi Israel"],
  },
  {
    id: "challenge-2",
    answer: "Davi",
    hints: ["Fui pastor", "Usei uma funda", "Fui rei"],
  },
  {
    id: "challenge-3",
    answer: "Ester",
    hints: ["Vivi na Pérsia", "Entrei diante do rei", "Salvei meu povo"],
  },
];

test("Quem Sou Eu normalizes case and repeated surrounding spaces", () => {
  assert.equal(normalizeWhoAmIAnswer("  MOISÉS   "), "moisés");
  assert.equal(normalizeWhoAmIAnswer("Lucas   de   Tarso"), "lucas de tarso");
});

test("Quem Sou Eu reveals hints progressively in registered order", () => {
  const initial = initialWhoAmIState();
  const next = applyWhoAmIAction(challenges[0], initial, { type: "reveal" });
  assert.equal(initial.hintsVisible, 1);
  assert.equal(next.hintsVisible, 2);
  assert.throws(
    () => applyWhoAmIAction(challenges[0], { hintsVisible: 3, status: "playing" }, { type: "reveal" }),
    /all_who_am_i_hints_revealed/,
  );
});

test("Quem Sou Eu validates correct and incorrect textual answers", () => {
  const correct = evaluateWhoAmIChallenge(challenges[0], [{ type: "guess", answer: "  MOISÉS " }]);
  assert.equal(correct.status, "won");
  assert.equal(correct.score, 500);
  const incorrect = evaluateWhoAmIChallenge(challenges[0], [{ type: "guess", answer: "Josué" }]);
  assert.equal(incorrect.status, "lost");
  assert.equal(incorrect.score, 0);
});

test("Quem Sou Eu score decreases as more hints are revealed", () => {
  const result = evaluateWhoAmIChallenge(challenges[0], [
    { type: "reveal" },
    { type: "reveal" },
    { type: "guess", answer: "Moisés" },
  ]);
  assert.equal(result.hintsVisible, 3);
  assert.equal(result.score, 300);
});

test("complete set aggregates score and rejects missing or duplicated histories", () => {
  const histories = challenges.map(challenge => ({
    challengeId: challenge.id,
    actions: [{ type: "guess", answer: challenge.answer }],
  }));
  assert.deepEqual(evaluateWhoAmISet(challenges, histories), {
    score: 1500,
    correctAnswers: 3,
    questionsAnswered: 3,
  });
  assert.throws(() => evaluateWhoAmISet(challenges, histories.slice(0, 2)), /incomplete_who_am_i_game/);
  assert.throws(() => evaluateWhoAmISet(challenges, [
    histories[0], histories[0], histories[2],
  ]), /invalid_who_am_i_history/);
});
