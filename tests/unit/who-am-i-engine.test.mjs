import assert from "node:assert/strict";
import test from "node:test";
import {
  applyWhoAmIAction,
  evaluateWhoAmIGame,
  initialWhoAmIState,
  shuffleWhoAmIOptions,
} from "../../app/games/who-am-i/engine.ts";
import { WHO_AM_I_CHARACTERS } from "../../app/games/who-am-i/characters.ts";

const moises = WHO_AM_I_CHARACTERS.find(character => character.id === "moises");

test("Who Am I bank contains the eight required characters with five hints", () => {
  assert.deepEqual(
    WHO_AM_I_CHARACTERS.map(character => character.id),
    ["moises", "davi", "ester", "paulo", "daniel", "noe", "jose", "elias"],
  );
  for (const character of WHO_AM_I_CHARACTERS) {
    assert.equal(character.hints.length, 5);
    assert.equal(character.optionIds.length, 4);
    assert.ok(character.optionIds.includes(character.id));
  }
});

test("Who Am I reveals hints progressively and shuffles options", () => {
  const initial = initialWhoAmIState();
  const next = applyWhoAmIAction(moises, initial, { type: "reveal" });
  assert.equal(initial.hintsVisible, 1);
  assert.equal(next.hintsVisible, 2);
  const options = shuffleWhoAmIOptions(moises.optionIds, () => 0);
  assert.deepEqual(new Set(options), new Set(moises.optionIds));
  assert.notDeepEqual(options, moises.optionIds);
});

test("Who Am I wins immediately with the correct character", () => {
  const result = evaluateWhoAmIGame(moises, [{ type: "guess", answerId: "moises" }]);
  assert.equal(result.status, "won");
  assert.equal(result.hintsVisible, 1);
  assert.equal(result.score, 500);
});

test("Who Am I requires another hint after an early wrong answer", () => {
  const wrong = applyWhoAmIAction(moises, initialWhoAmIState(), { type: "guess", answerId: "josue" });
  assert.equal(wrong.awaitingNextHint, true);
  assert.throws(() => applyWhoAmIAction(moises, wrong, { type: "guess", answerId: "arao" }), /who_am_i_hint_required/);
  const continued = applyWhoAmIAction(moises, wrong, { type: "reveal" });
  assert.equal(continued.awaitingNextHint, false);
  assert.equal(continued.hintsVisible, 2);
});

test("Who Am I loses after an incorrect answer with all hints visible", () => {
  const actions = [
    { type: "reveal" }, { type: "reveal" }, { type: "reveal" }, { type: "reveal" },
    { type: "guess", answerId: "josue" },
  ];
  const result = evaluateWhoAmIGame(moises, actions);
  assert.equal(result.status, "lost");
  assert.equal(result.hintsVisible, 5);
  assert.equal(result.score, 0);
});
