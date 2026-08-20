import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateGuess,
  isValidGuess,
  isWinningGuess,
  normalizeWord,
  WORDLE_MAX_ATTEMPTS,
  isSupportedWordLength,
} from "../../app/games/wordle/engine.ts";

test("Wordle uses six attempts without embedding a fixed answer", () => {
  assert.equal(WORDLE_MAX_ATTEMPTS, 6);
});

test("normalizes accents, spaces and letter case", () => {
  assert.equal(normalizeWord("  jesús! "), "JESUS");
  assert.equal(isValidGuess("Jesus"), true);
  assert.equal(isValidGuess("fé"), false);
});

test("supports Wordle answers from five to seven normalized letters", () => {
  assert.equal(isSupportedWordLength(4), false);
  assert.equal(isSupportedWordLength(5), true);
  assert.equal(isSupportedWordLength(6), true);
  assert.equal(isSupportedWordLength(7), true);
  assert.equal(isSupportedWordLength(8), false);
  assert.equal(isValidGuess("JOSUÉ", 5), true);
  assert.equal(isValidGuess("DANIEL", 6), true);
  assert.equal(isValidGuess("CALVÁRIO", 7), false);
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

