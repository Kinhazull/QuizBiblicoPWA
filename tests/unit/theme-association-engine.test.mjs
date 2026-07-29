import assert from "node:assert/strict";
import test from "node:test";
import {
  applyThemeAssociationAttempt,
  evaluateThemeAssociationGame,
  initialThemeAssociationState,
  shuffleThemeAssociationOptions,
} from "../../app/games/theme-association/engine.ts";

const round = {
  id: "association-1",
  title: "Personagens e feitos",
  pairs: [
    { id: "pair-1", leftId: "left-1", rightId: "right-1", left: "Noé", right: "Arca" },
    { id: "pair-2", leftId: "left-2", rightId: "right-2", left: "Davi", right: "Golias" },
    { id: "pair-3", leftId: "left-3", rightId: "right-3", left: "Moisés", right: "Mar Vermelho" },
  ],
};
const winningAttempts = round.pairs.map(pair => ({ leftId: pair.leftId, rightId: pair.rightId }));

test("association options shuffle without changing the official pairs", () => {
  const shuffled = shuffleThemeAssociationOptions(round.pairs, () => 0);
  assert.deepEqual(new Set(shuffled.map(pair => pair.id)), new Set(round.pairs.map(pair => pair.id)));
  assert.notDeepEqual(shuffled.map(pair => pair.id), round.pairs.map(pair => pair.id));
});

test("correct association completes and locks a pair", () => {
  const state = applyThemeAssociationAttempt(round, initialThemeAssociationState(), winningAttempts[0]);
  assert.deepEqual(state, { matchedPairIds: [round.pairs[0].id], errors: 0, status: "playing" });
  assert.throws(() => applyThemeAssociationAttempt(round, state, winningAttempts[0]), /association_pair_already_matched/);
});

test("incorrect association consumes one error", () => {
  const state = applyThemeAssociationAttempt(round, initialThemeAssociationState(), {
    leftId: round.pairs[0].leftId,
    rightId: round.pairs[1].rightId,
  });
  assert.deepEqual(state, { matchedPairIds: [], errors: 1, status: "playing" });
});

test("all correct associations produce a victory", () => {
  const result = evaluateThemeAssociationGame(round, winningAttempts);
  assert.equal(result.status, "won");
  assert.equal(result.matchedPairIds.length, 3);
  assert.equal(result.errors, 0);
  assert.equal(result.score, 300);
});

test("three incorrect associations produce a defeat", () => {
  const incorrect = {
    leftId: round.pairs[0].leftId,
    rightId: round.pairs[1].rightId,
  };
  const result = evaluateThemeAssociationGame(round, [incorrect, incorrect, incorrect]);
  assert.equal(result.status, "lost");
  assert.equal(result.errors, 3);
  assert.equal(result.score, 0);
});
