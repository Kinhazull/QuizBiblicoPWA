import test from "node:test";
import assert from "node:assert/strict";
import {
  selectUniversalCandidates,
} from "../../functions/_lib/universal-game-generator.ts";
import {
  GameGenerationMode,
} from "../../functions/_lib/universal-game-generation-contract.ts";
import { GameType } from "../../shared/content.ts";

function entry(id, {
  organizationId = "org-1",
  gameType = GameType.TIMELINE,
  difficulty = "MEDIUM",
  themes = ["fé"],
  books = ["João"],
  tags = ["evangelho"],
  priority = 0,
  usageCount = 0,
} = {}) {
  return {
    organizationId,
    gameType,
    contentId: id,
    contentVersion: 1,
    difficulty,
    themes,
    books,
    tags,
    priority,
    usageCount,
    lastUsedAt: null,
    lastUsedMode: null,
    firstPublishedAt: 1,
    availabilityStatus: "AVAILABLE",
    createdAt: 1,
    updatedAt: 1,
  };
}

function request(overrides = {}) {
  return {
    organizationId: "org-1",
    gameType: GameType.TIMELINE,
    mode: GameGenerationMode.INTERNAL_TEST,
    selectionKey: "test-selection",
    algorithmVersion: 1,
    seed: "stable-seed",
    count: 3,
    ...overrides,
  };
}

test("algorithm is deterministic for equal catalog, seed and version", async () => {
  const catalog = Array.from({ length: 8 }, (_, index) => entry(`content-${index}`));
  const first = await selectUniversalCandidates(catalog, request());
  const second = await selectUniversalCandidates([...catalog].reverse(), request());
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.deepEqual(
    first.candidates.map(item => item.contentId),
    second.candidates.map(item => item.contentId),
  );
  assert.equal(first.seedHash, second.seedHash);
});

test("seed and algorithm contract govern the deterministic result", async () => {
  const catalog = Array.from({ length: 20 }, (_, index) => entry(`content-${index}`));
  const first = await selectUniversalCandidates(catalog, request({ seed: "seed-a" }));
  const second = await selectUniversalCandidates(catalog, request({ seed: "seed-b" }));
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.notDeepEqual(
    first.candidates.map(item => item.contentId),
    second.candidates.map(item => item.contentId),
  );
  const unsupported = await selectUniversalCandidates(catalog, request({ algorithmVersion: 2 }));
  assert.equal(unsupported.ok, false);
  assert.deepEqual(unsupported.error.details, ["algorithmVersion"]);
});

test("filters organization, game, difficulty, themes, books, tags and exclusions", async () => {
  const eligible = entry("eligible", {
    difficulty: "HARD",
    themes: ["profecia"],
    books: ["Daniel"],
    tags: ["antigo-testamento", "visão"],
  });
  const result = await selectUniversalCandidates([
    eligible,
    entry("wrong-org", { organizationId: "org-2", difficulty: "HARD", themes: ["profecia"], books: ["Daniel"], tags: ["antigo-testamento", "visão"] }),
    entry("wrong-game", { gameType: GameType.MEMORY, difficulty: "HARD", themes: ["profecia"], books: ["Daniel"], tags: ["antigo-testamento", "visão"] }),
    entry("excluded", { difficulty: "HARD", themes: ["profecia"], books: ["Daniel"], tags: ["antigo-testamento", "visão"] }),
  ], request({
    count: 1,
    difficulty: "HARD",
    themes: ["PROFECIA"],
    books: ["daniel"],
    tags: ["visão", "antigo-testamento"],
    excludeContentIds: ["excluded"],
  }));
  assert.equal(result.ok, true);
  assert.equal(result.candidates[0].contentId, eligible.contentId);
});

test("difficulty distribution uses deterministic largest-remainder rounding", async () => {
  const catalog = [
    ...Array.from({ length: 5 }, (_, index) => entry(`easy-${index}`, { difficulty: "EASY" })),
    ...Array.from({ length: 5 }, (_, index) => entry(`medium-${index}`, { difficulty: "MEDIUM" })),
    ...Array.from({ length: 5 }, (_, index) => entry(`hard-${index}`, { difficulty: "HARD" })),
  ];
  const result = await selectUniversalCandidates(catalog, request({
    count: 7,
    difficultyDistribution: { EASY: 40, MEDIUM: 40, HARD: 20 },
  }));
  assert.equal(result.ok, true);
  const totals = result.candidates.reduce((accumulator, item) => {
    accumulator[item.difficulty] = (accumulator[item.difficulty] ?? 0) + 1;
    return accumulator;
  }, {});
  assert.deepEqual(totals, { EASY: 3, MEDIUM: 3, HARD: 1 });
});

test("priority and lower usage are favored before deterministic tie-breaking", async () => {
  const result = await selectUniversalCandidates([
    entry("used", { usageCount: 20 }),
    entry("never-used"),
    entry("priority", { priority: 5, usageCount: 100 }),
  ], request({ count: 2 }));
  assert.equal(result.ok, true);
  assert.equal(result.candidates.some(item => item.contentId === "priority"), true);
  assert.equal(result.candidates.some(item => item.contentId === "never-used"), true);
});

test("diversity round-robins themes when enough alternatives exist", async () => {
  const catalog = [
    entry("faith-1", { themes: ["fé"] }),
    entry("faith-2", { themes: ["fé"] }),
    entry("faith-3", { themes: ["fé"] }),
    entry("history-1", { themes: ["história"] }),
    entry("wisdom-1", { themes: ["sabedoria"] }),
  ];
  const result = await selectUniversalCandidates(catalog, request({ count: 3 }));
  assert.equal(result.ok, true);
  assert.equal(new Set(result.candidates.flatMap(item => item.themes)).size, 3);
});

test("insufficient catalog fails structurally without a partial selection", async () => {
  const result = await selectUniversalCandidates(
    [entry("only-one", { difficulty: "EASY" })],
    request({
      count: 3,
      difficultyDistribution: { EASY: 50, HARD: 50 },
    }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "insufficient_eligible_content");
  assert.equal(result.error.requestedCount, 3);
  assert.equal(result.error.availableCount, 1);
  assert.equal("candidates" in result, false);
});
