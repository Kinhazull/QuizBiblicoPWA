import test from "node:test";
import assert from "node:assert/strict";
import { gameModules } from "../../app/games/sdk/gameModules.ts";
import { ContentStatus, Difficulty, GameType } from "../../shared/content.ts";

test("shared content game types stay aligned with the registered platform games", () => {
  assert.deepEqual(
    [...new Set(Object.values(GameType))].sort(),
    gameModules.map(game => game.id).sort(),
  );
});

test("shared content lifecycle and difficulty enums expose only the approved values", () => {
  assert.deepEqual(Object.values(ContentStatus), ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"]);
  assert.deepEqual(Object.values(Difficulty), ["VERY_EASY", "EASY", "MEDIUM", "HARD", "SPECIAL"]);
});
