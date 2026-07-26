import assert from "node:assert/strict";
import test from "node:test";
import {
  areMatchingMemoryCards,
  createMemoryDeck,
  evaluateMemoryCompletion,
  memoryScore,
} from "../../app/games/memory/engine.ts";
import { MEMORY_SETS } from "../../app/games/memory/sets.ts";

const set = MEMORY_SETS[0];
const perfectReveal = set.pairs.flatMap(pair => [`${pair.id}:a`, `${pair.id}:b`]);

test("memory set creates a 4x4 deck with exactly eight pairs", () => {
  const deck = createMemoryDeck(set, () => 0.5);
  assert.equal(set.pairs.length, 8);
  assert.equal(deck.length, 16);
  for (const pair of set.pairs) {
    assert.equal(deck.filter(card => card.pairId === pair.id).length, 2);
  }
});

test("memory cards match only their distinct counterpart", () => {
  const deck = createMemoryDeck(set, () => 0);
  const first = deck.find(card => card.cardId === "arca:a");
  const counterpart = deck.find(card => card.cardId === "arca:b");
  const other = deck.find(card => card.cardId === "fogo:a");
  assert.equal(areMatchingMemoryCards(first, counterpart), true);
  assert.equal(areMatchingMemoryCards(first, first), false);
  assert.equal(areMatchingMemoryCards(first, other), false);
});

test("memory completion validates the full reveal history and computes score", () => {
  const result = evaluateMemoryCompletion(set, perfectReveal);
  assert.equal(result.moves, 8);
  assert.equal(result.score, 1200);
  assert.equal(result.matchedPairIds.length, 8);
  assert.equal(memoryScore(10), 1100);
});

test("memory completion rejects incomplete, repeated and tampered histories", () => {
  assert.throws(() => evaluateMemoryCompletion(set, perfectReveal.slice(0, -2)), /invalid_memory_reveals|incomplete_memory_game/);
  assert.throws(() => evaluateMemoryCompletion(set, ["arca:a", "arca:b", "arca:a", "arca:b", ...perfectReveal.slice(2)]), /invalid_memory_replay/);
  assert.throws(() => evaluateMemoryCompletion(set, ["unknown:a", "unknown:b", ...perfectReveal.slice(2)]), /invalid_memory_card/);
});
