import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the structured runtime catalog mirrors every official catalog v1 identity", async () => {
  const [documentation, catalog] = await Promise.all([
    read("docs/PRODUCT/CORE_PLATFORM_ACHIEVEMENTS_CATALOG.md"),
    read("functions/_lib/platform-achievement-catalog.ts"),
  ]);
  const documented = [...documentation.matchAll(/achievementId:\s*([a-z0-9_]+)/g)].map(match => match[1]);
  const structured = [...catalog.matchAll(/entry\("([a-z0-9_]+)"/g)].map(match => match[1]);
  assert.equal(documented.length, 14);
  assert.deepEqual(structured, documented);
  assert.match(catalog, /visibility: "visible" \| "hidden"/);
  assert.match(catalog, /achievementMetricValue/);
});

test("official consumer order is Statistics then Reward then Achievements", async () => {
  const registry = await read("functions/_lib/platform-event-consumers.ts");
  assert.match(registry, /platformStatisticsConsumer,[\s\S]*platformRewardConsumer,[\s\S]*platformAchievementConsumer/);
});

test("Achievement consumer uses only Core services and never Quiz persistence", async () => {
  const consumer = await read("functions/_lib/platform-achievement-consumer.ts");
  assert.match(consumer, /getUserStatistics/);
  assert.match(consumer, /getUserProgress/);
  assert.match(consumer, /unlockAchievementWithReward/);
  assert.doesNotMatch(consumer, /\b(?:attempts|rounds|questions|answers)\b/);
});

test("unlock and reward share one atomic D1 batch with deterministic ledgers", async () => {
  const progress = await read("functions/_lib/platform-progress.ts");
  assert.match(progress, /grantPlatformAchievementReward/);
  assert.match(progress, /input\.unlockStatement/);
  assert.match(progress, /env\.DB\.batch/);
  assert.match(progress, /achievement-xp/);
  assert.match(progress, /achievement-coins/);
});
