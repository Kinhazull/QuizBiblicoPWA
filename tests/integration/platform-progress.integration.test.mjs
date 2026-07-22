import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase, seedOrganization, seedUser, createSession, createAuthenticatedRequest, responseJson } from "../helpers/integration.mjs";
import { getUserProgress, grantCoins, grantXp, progressFromBalances, xpRequiredForLevel } from "../../functions/_lib/platform-progress.ts";
import { onRequestGet as readProgress } from "../../functions/api/platform/progress.ts";

async function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedOrganization(ctx, { id: "org-2" });
  seedUser(ctx, { id: "player" });
  seedUser(ctx, { id: "other", organizationId: "org-2" });
  const token = await createSession(ctx, "player");
  return { ctx, token };
}

test("level curve is deterministic and derived exclusively from total XP", () => {
  assert.equal(xpRequiredForLevel(1), 0);
  assert.equal(xpRequiredForLevel(2), 100);
  assert.equal(xpRequiredForLevel(3), 400);
  assert.deepEqual(progressFromBalances(399, 7), {
    level: 2,
    totalXp: 399,
    coins: 7,
    curveVersion: "quadratic-v1",
    levelProgress: { currentXp: 299, targetXp: 300, percent: 99 },
  });
});

test("authenticated read returns safe defaults without creating a row", async t => {
  const { ctx, token } = await setup(t);
  const response = await readProgress({ request: createAuthenticatedRequest("https://test/api/platform/progress", { token }), env: ctx.env });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
  assert.equal((await responseJson(response)).progress.level, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM user_platform_progress").get().total, 0);
  const denied = await readProgress({ request: new Request("https://test/api/platform/progress"), env: ctx.env });
  assert.equal(denied.status, 401);
});

test("XP and coin grants are persistent, organization-scoped and idempotent", async t => {
  const { ctx } = await setup(t);
  const base = { userId: "player", organizationId: "org-1", reason: "Teste do Core Platform", sourceType: "platform_test" };
  const first = await grantXp(ctx.env, { ...base, eventId: "xp-event-1", amount: 150 });
  const repeated = await grantXp(ctx.env, { ...base, eventId: "xp-event-1", amount: 150 });
  const coins = await grantCoins(ctx.env, { ...base, eventId: "coin-event-1", amount: 25 });
  assert.equal(first.applied, true);
  assert.equal(repeated.applied, false);
  assert.equal(coins.applied, true);
  assert.deepEqual(await getUserProgress(ctx.env, "player", "org-1"), {
    level: 2,
    totalXp: 150,
    coins: 25,
    curveVersion: "quadratic-v1",
    levelProgress: { currentXp: 50, targetXp: 300, percent: 16 },
  });
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_xp_ledger").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_coin_ledger").get().total, 1);
  await assert.rejects(() => grantXp(ctx.env, { ...base, organizationId: "org-2", eventId: "cross-org", amount: 10 }), /progress_user_unavailable/);
  assert.equal(ctx.raw.prepare("SELECT total_xp FROM user_platform_progress WHERE user_id='player'").get().total_xp, 150);
});

test("no Quiz table or API grants platform progress implicitly", async t => {
  const { ctx } = await setup(t);
  assert.equal((await getUserProgress(ctx.env, "player", "org-1")).totalXp, 0);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM attempts").get().total, 0);
});
