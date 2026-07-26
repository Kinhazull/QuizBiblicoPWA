import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateGuess,
  isValidGuess,
  isWinningGuess,
  normalizeWord,
  WORDLE_MAX_ATTEMPTS,
  WORDLE_TEMPORARY_ANSWER,
} from "../../app/games/wordle/engine.ts";

test("Wordle MVP uses a fixed answer and six attempts", () => {
  assert.equal(WORDLE_TEMPORARY_ANSWER, "JESUS");
  assert.equal(WORDLE_MAX_ATTEMPTS, 6);
});

test("normalizes accents, spaces and letter case", () => {
  assert.equal(normalizeWord("  jesús! "), "JESUS");
  assert.equal(isValidGuess("Jesus"), true);
  assert.equal(isValidGuess("fé"), false);
});

test("marks correct, present and absent letters", () => {
  assert.deepEqual(evaluateGuess("JUDEA", "JESUS"), [
    { letter: "J", state: "correct" },
    { letter: "U", state: "present" },
    { letter: "D", state: "absent" },
    { letter: "E", state: "present" },
    { letter: "A", state: "absent" },
  ]);
});

test("does not overcount duplicate present letters", () => {
  assert.deepEqual(evaluateGuess("SUSSA", "JESUS").map(item => item.state), [
    "present",
    "present",
    "correct",
    "absent",
    "absent",
  ]);
});

test("detects victory after normalization", () => {
  assert.equal(isWinningGuess("Jesús", "JESUS"), true);
  assert.equal(isWinningGuess("Judas", "JESUS"), false);
});

