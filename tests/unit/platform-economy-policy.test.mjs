import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DAILY_CHALLENGE_ECONOMY,
  GAME_FINISHED_ECONOMY,
  PLATFORM_ECONOMY_VERSION,
  SHOP_CATALOG,
} from "../../shared/platform-economy.ts";

test("economy v2 centralizes recurring rewards and permanent cosmetic prices", () => {
  assert.equal(PLATFORM_ECONOMY_VERSION, "v2");
  assert.equal(GAME_FINISHED_ECONOMY.maximumCoinsPerGame, 3);
  assert.deepEqual(DAILY_CHALLENGE_ECONOMY.rewards[3], { xp: 30, coins: 5, label: "+30 XP e +5 moedas" });
  assert.deepEqual(DAILY_CHALLENGE_ECONOMY.rewards[7], { xp: 70, coins: 12, label: "+70 XP e +12 moedas" });
  assert.equal(SHOP_CATALOG.reduce((sum, item) => sum + item.price, 0), 950);
});

test("economy source files consume the shared policy instead of duplicating values", async () => {
  const paths = [
    "../../functions/_lib/platform-rewards.ts",
    "../../functions/_lib/platform-daily-retention.ts",
    "../../functions/_lib/platform-daily-challenge.ts",
    "../../app/data/shopCatalog.ts",
  ];
  for (const path of paths) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /shared\/platform-economy/);
  }
});

test("modeled acquisition remains perceptible without exhausting the permanent catalog immediately", () => {
  const casualWeeklyCoins = 37;
  const regularWeeklyCoins = 161;
  const engagedWeeklyCoins = 364;
  assert.ok(60 / (casualWeeklyCoins / 7) >= 7, "entry item should remain a multi-day casual goal");
  assert.ok(60 / (regularWeeklyCoins / 7) < 4, "entry item should be reachable quickly for regular users");
  assert.ok(950 / engagedWeeklyCoins >= 2, "the entire permanent catalog should take multiple engaged weeks");
});
