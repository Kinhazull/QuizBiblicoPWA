import assert from "node:assert/strict";
import test from "node:test";
import { memorySetFromContent, memorySetFromSelection } from "../../functions/_lib/game-integrations/memory-content.ts";
import { simulateMemoryCombinations } from "../../scripts/simulate-memory-dynamic-combinations.mjs";

const contents = Array.from({ length: 3 }, (_, contentIndex) => ({
  id: `memory-content-${contentIndex + 1}`,
  version: 2,
  payload: {
    title: `Conjunto ${contentIndex + 1}`,
    pairs: Array.from({ length: 3 }, (_, pairIndex) => ({
      front: `Frente ${contentIndex + 1}-${pairIndex + 1}`,
      back: `Verso ${contentIndex + 1}-${pairIndex + 1}`,
    })),
  },
}));

test("dynamic Memory composition persists three unique canonical pairs deterministically", async () => {
  const first = await memorySetFromSelection("selection-1", "seed-1", contents);
  const retry = await memorySetFromSelection("selection-1", "seed-1", contents);
  assert.deepEqual(first, retry);
  assert.equal(first.pairs.length, 3);
  assert.equal(new Set(first.pairs.map(pair => `${pair.front}|${pair.back}`)).size, 3);
  assert.ok(first.pairs.every(pair => contents.some(content => content.payload.pairs.some(source => source.front === pair.front && source.back === pair.back))));
});

test("historical one-content Memory selection remains exactly compatible", async () => {
  const historical = await memorySetFromContent(contents[0].id, contents[0].payload);
  const resolved = await memorySetFromSelection("ignored-for-history", "new-seed", [contents[0]]);
  assert.deepEqual(resolved, historical);
});

test("dynamic Memory rejects duplicate pairs instead of duplicating a board", async () => {
  const duplicate = contents.map(content => ({ ...content, payload: { ...content.payload, pairs: [
    { front: "Mesmo", back: "Par" }, { front: "Mesmo", back: "Par" }, { front: "Mesmo", back: "Par" },
  ] } }));
  await assert.rejects(memorySetFromSelection("selection", "seed", duplicate), /duplicate_memory_pair_selection/);
});

test("300-pair simulation remains deterministic and avoids complete repeats at release horizons", () => {
  const first = simulateMemoryCombinations(1200, 100);
  const retry = simulateMemoryCombinations(1200, 100);
  assert.deepEqual(first, retry);
  assert.equal(first.canonicalPairs, 300);
  assert.ok(first.repeats <= 1, `expected near-zero repeats, received ${first.repeats}`);
  assert.deepEqual(first.checkpoints.map(item => item.games), [30, 100, 365, 730, 1200]);
});
