import assert from "node:assert/strict";
import test from "node:test";
import {
  areMatchingMemoryCards,
  createMemoryDeck,
  evaluateMemoryCompletion,
  memoryScore,
} from "../../app/games/memory/engine.ts";

const set = {
  id: "memory-content",
  title: "Personagens e acontecimentos",
  pairs: [
    { id: "pair-noe", front: "Noé", back: "Arca" },
    { id: "pair-moises", front: "Moisés", back: "Êxodo" },
    { id: "pair-davi", front: "Davi", back: "Golias" },
  ],
};
const perfectReveal = set.pairs.flatMap(pair => [`${pair.id}:a`, `${pair.id}:b`]);

test("memory CMS set creates exactly two distinct cards per pair", () => {
  const deck = createMemoryDeck(set, () => 0.5);
  assert.equal(set.pairs.length, 3);
  assert.equal(deck.length, 6);
  for (const pair of set.pairs) {
    const cards = deck.filter(card => card.pairId === pair.id);
    assert.equal(cards.length, 2);
    assert.deepEqual(new Set(cards.map(card => card.label)), new Set([pair.front, pair.back]));
  }
});

test("memory deck never returns the original card order", () => {
  const original = set.pairs.flatMap(pair => [`${pair.id}:a`, `${pair.id}:b`]);
  const deck = createMemoryDeck(set, () => 0.999);
  assert.notDeepEqual(deck.map(card => card.cardId), original);
});

test("memory cards match only their distinct counterpart", () => {
  const deck = createMemoryDeck(set, () => 0);
  const first = deck.find(card => card.cardId === "pair-noe:a");
  const counterpart = deck.find(card => card.cardId === "pair-noe:b");
  const other = deck.find(card => card.cardId === "pair-davi:a");
  assert.equal(areMatchingMemoryCards(first, counterpart), true);
  assert.equal(areMatchingMemoryCards(first, first), false);
  assert.equal(areMatchingMemoryCards(first, other), false);
});

test("memory completion validates the full reveal history and computes dynamic score", () => {
  const result = evaluateMemoryCompletion(set, perfectReveal);
  assert.equal(result.moves, 3);
  assert.equal(result.score, 450);
  assert.equal(result.matchedPairIds.length, 3);
  assert.equal(memoryScore(5, 3), 350);
});

test("memory completion rejects incomplete, repeated and tampered histories", () => {
  assert.throws(() => evaluateMemoryCompletion(set, perfectReveal.slice(0, -2)), /invalid_memory_reveals|incomplete_memory_game/);
  assert.throws(() => evaluateMemoryCompletion(set, ["pair-noe:a", "pair-noe:b", "pair-noe:a", "pair-noe:b", ...perfectReveal.slice(2)]), /invalid_memory_replay/);
  assert.throws(() => evaluateMemoryCompletion(set, ["unknown:a", "unknown:b", ...perfectReveal.slice(2)]), /invalid_memory_card/);
});
