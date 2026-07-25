import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDailyStreak,
  dailyChestReward,
  dailyLoginReward,
} from "../../functions/_lib/platform-daily-retention.ts";

test("daily streak grows consecutively and resets after a missed day", () => {
  assert.equal(calculateDailyStreak("2026-07-25", []), 1);
  assert.equal(calculateDailyStreak("2026-07-25", ["2026-07-24"]), 2);
  assert.equal(calculateDailyStreak("2026-07-25", ["2026-07-23"]), 1);
  assert.equal(calculateDailyStreak("2026-07-25", ["2026-07-25", "2026-07-24", "2026-07-23"]), 3);
});

test("daily login bonus grows predictably and is capped at seven days", () => {
  assert.deepEqual(dailyLoginReward(1), { xp: 10, coins: 2, label: "+10 XP e +2 moedas" });
  assert.deepEqual(dailyLoginReward(4), { xp: 16, coins: 3, label: "+16 XP e +3 moedas" });
  assert.deepEqual(dailyLoginReward(99), { xp: 22, coins: 5, label: "+22 XP e +5 moedas" });
});

test("daily chest reward is deterministic and always contains value", () => {
  const first = dailyChestReward("org:user:2026-07-25");
  assert.deepEqual(dailyChestReward("org:user:2026-07-25"), first);
  assert.ok(first.xp > 0 || first.coins > 0);
  assert.ok(first.label.length > 0);
});
