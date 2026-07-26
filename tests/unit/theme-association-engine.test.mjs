import assert from "node:assert/strict";
import test from "node:test";
import {
  applyThemeAssociationAttempt,
  evaluateThemeAssociationGame,
  initialThemeAssociationState,
  shuffleThemeAssociationOptions,
} from "../../app/games/theme-association/engine.ts";
import { THEME_ASSOCIATION_ROUNDS } from "../../app/games/theme-association/rounds.ts";

const round = THEME_ASSOCIATION_ROUNDS[0];
const winningAttempts = round.pairs.map(pair => ({ leftId: pair.id, rightId: pair.id }));

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
    leftId: round.pairs[0].id,
    rightId: round.pairs[1].id,
  });
  assert.deepEqual(state, { matchedPairIds: [], errors: 1, status: "playing" });
});

test("four correct associations produce a victory", () => {
  const result = evaluateThemeAssociationGame(round, winningAttempts);
  assert.equal(result.status, "won");
  assert.equal(result.matchedPairIds.length, 4);
  assert.equal(result.errors, 0);
  assert.equal(result.score, 400);
});

test("three incorrect associations produce a defeat", () => {
  const incorrect = {
    leftId: round.pairs[0].id,
    rightId: round.pairs[1].id,
  };
  const result = evaluateThemeAssociationGame(round, [incorrect, incorrect, incorrect]);
  assert.equal(result.status, "lost");
  assert.equal(result.errors, 3);
  assert.equal(result.score, 0);
});
