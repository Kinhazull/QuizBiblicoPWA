import assert from "node:assert/strict";
import test from "node:test";
import {
  createAuthenticatedRequest,
  createSession,
  createTestDatabase,
  responseJson,
  seedOrganization,
  seedUser,
  withFrozenTime,
} from "../helpers/integration.mjs";
import {
  claimDailyLogin,
  getDailyRetentionState,
  openDailyChest,
} from "../../functions/_lib/platform-daily-retention.ts";
import { recordMissionProgress } from "../../functions/_lib/platform-missions.ts";
import { onRequestPost as checkIn } from "../../functions/api/platform/daily/check-in.ts";
import { onRequestPost as openChest } from "../../functions/api/platform/daily/chest.ts";

function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedUser(ctx, { id: "player" });
  return ctx;
}

test("daily login is granted once, grows the streak and resets after a gap", async t => {
  const ctx = setup(t);
  const day1 = Date.UTC(2026, 6, 20, 12);
  const [first, duplicate] = await Promise.all([
    withFrozenTime(day1, () => claimDailyLogin(ctx.env, "player", "org-1", day1)),
    withFrozenTime(day1, () => claimDailyLogin(ctx.env, "player", "org-1", day1)),
  ]);
  assert.equal(first.streak, 1);
  assert.equal(duplicate.streak, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger WHERE source_type='daily_login'").get().total, 1);
  assert.deepEqual({ ...ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get() }, { totalXp: 10, coins: 2 });

  const second = await withFrozenTime(day1 + 86_400_000, () =>
    claimDailyLogin(ctx.env, "player", "org-1", day1 + 86_400_000));
  assert.equal(second.streak, 2);
  const reset = await withFrozenTime(day1 + 3 * 86_400_000, () =>
    claimDailyLogin(ctx.env, "player", "org-1", day1 + 3 * 86_400_000));
  assert.equal(reset.streak, 1);
  assert.deepEqual({ ...ctx.raw.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id='player'").get() }, { totalXp: 32, coins: 6 });
});

test("one deterministic daily mission is assigned automatically", async t => {
  const ctx = setup(t);
  const now = Date.UTC(2026, 6, 20, 12);
  const state = await withFrozenTime(now, () => claimDailyLogin(ctx.env, "player", "org-1", now));
  assert.ok(state.mission);
  assert.equal(state.mission.cadence, "daily");
  assert.equal(state.mission.state, "active");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_missions WHERE user_id='player'").get().total, 1);
  const repeated = await getDailyRetentionState(ctx.env, "player", "org-1", now);
  assert.equal(repeated.mission.id, state.mission.id);
});

test("daily chest unlocks after mission completion and opens only once", async t => {
  const ctx = setup(t);
  const now = Date.UTC(2026, 6, 20, 12);
  const initial = await withFrozenTime(now, () => claimDailyLogin(ctx.env, "player", "org-1", now));
  await assert.rejects(() => openDailyChest(ctx.env, "player", "org-1", now), /daily_chest_locked/);
  await recordMissionProgress(ctx.env, {
    assignmentId: initial.mission.id,
    userId: "player",
    organizationId: "org-1",
    eventId: "daily-mission-completion",
    amount: initial.mission.target,
    now: now + 1000,
  });
  const unlocked = await getDailyRetentionState(ctx.env, "player", "org-1", now + 1000);
  assert.equal(unlocked.chest.unlocked, true);
  const before = unlocked.progress;
  const [opened, repeated] = await Promise.all([
    withFrozenTime(now + 2000, () => openDailyChest(ctx.env, "player", "org-1", now + 2000)),
    withFrozenTime(now + 2000, () => openDailyChest(ctx.env, "player", "org-1", now + 2000)),
  ]);
  assert.equal(opened.chest.opened, true);
  assert.equal(repeated.chest.opened, true);
  assert.equal(opened.progress.totalXp, before.totalXp + unlocked.chest.preview.xp);
  assert.equal(opened.progress.coins, before.coins + unlocked.chest.preview.coins);
  const afterRepeat = await openDailyChest(ctx.env, "player", "org-1", now + 3000);
  assert.deepEqual(afterRepeat.progress, opened.progress);
  const ledgers = ctx.raw.prepare(`SELECT
    (SELECT COUNT(*) FROM platform_xp_ledger WHERE source_type='daily_chest')+
    (SELECT COUNT(*) FROM platform_coin_ledger WHERE source_type='daily_chest') total`).get();
  assert.equal(ledgers.total, (unlocked.chest.preview.xp ? 1 : 0) + (unlocked.chest.preview.coins ? 1 : 0));
});

test("daily endpoints require authentication and expose controlled errors", async t => {
  const ctx = setup(t);
  const token = await createSession(ctx, "player");
  assert.equal((await checkIn({ request: new Request("https://test/api/platform/daily/check-in", { method: "POST" }), env: ctx.env })).status, 401);
  const request = createAuthenticatedRequest("https://test/api/platform/daily/check-in", { token, method: "POST" });
  const response = await checkIn({ request, env: ctx.env });
  assert.equal(response.status, 200);
  assert.ok((await responseJson(response)).daily.login.claimed);
  const locked = await openChest({
    request: createAuthenticatedRequest("https://test/api/platform/daily/chest", { token, method: "POST" }),
    env: ctx.env,
  });
  assert.equal(locked.status, 409);
  assert.deepEqual(await responseJson(locked), { error: "daily_chest_locked" });
});
