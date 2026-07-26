import assert from "node:assert/strict";
import test from "node:test";
import {
  createAuthenticatedRequest,
  createSession,
  createTestDatabase,
  responseJson,
  seedOrganization,
  seedUser,
} from "../helpers/integration.mjs";
import { grantCoins, getOwnedPlatformItemIds, purchasePlatformItem } from "../../functions/_lib/platform-progress.ts";
import { onRequestGet as getShop, onRequestPost as buyItem } from "../../functions/api/platform/shop.ts";

function setup(t, coins = 100) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedUser(ctx, { id: "buyer" });
  return grantCoins(ctx.env, {
    eventId: "shop-test-balance",
    userId: "buyer",
    organizationId: "org-1",
    amount: coins,
    reason: "Saldo de teste",
    sourceType: "test",
    sourceId: "shop",
  }).then(() => ctx);
}

test("purchase debits the existing coin balance and records ownership", async t => {
  const ctx = await setup(t);
  const result = await purchasePlatformItem(ctx.env, {
    itemId: "frame-bronze", itemName: "Moldura Bronze", price: 20,
    userId: "buyer", organizationId: "org-1",
  });
  assert.equal(result.purchased, true);
  assert.equal(result.progress.coins, 80);
  assert.deepEqual(await getOwnedPlatformItemIds(ctx.env, "buyer", "org-1"), ["frame-bronze"]);
});

test("duplicate and concurrent purchases never debit twice", async t => {
  const ctx = await setup(t);
  const input = {
    itemId: "avatar-dove", itemName: "Avatar Pomba", price: 45,
    userId: "buyer", organizationId: "org-1",
  };
  const results = await Promise.all([
    purchasePlatformItem(ctx.env, input),
    purchasePlatformItem(ctx.env, input),
  ]);
  assert.equal(results.filter(result => result.purchased).length, 1);
  assert.ok(results.every(result => result.owned));
  const repeated = await purchasePlatformItem(ctx.env, input);
  assert.equal(repeated.purchased, false);
  assert.equal(repeated.progress.coins, 55);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_coin_ledger WHERE source_type='shop_purchase'").get().total, 1);
});

test("insufficient balance rejects the purchase without negative coins or ownership", async t => {
  const ctx = await setup(t, 10);
  await assert.rejects(() => purchasePlatformItem(ctx.env, {
    itemId: "frame-gold", itemName: "Moldura Ouro", price: 70,
    userId: "buyer", organizationId: "org-1",
  }), /insufficient_coins/);
  assert.equal(ctx.raw.prepare("SELECT coins FROM user_platform_progress WHERE user_id='buyer'").get().coins, 10);
  assert.deepEqual(await getOwnedPlatformItemIds(ctx.env, "buyer", "org-1"), []);
});

test("shop API is authenticated, ignores client prices and returns owned state", async t => {
  const ctx = await setup(t);
  const unauthorized = await getShop({ request: new Request("https://test/api/platform/shop"), env: ctx.env });
  assert.equal(unauthorized.status, 401);
  const token = await createSession(ctx, "buyer");
  const response = await buyItem({
    request: createAuthenticatedRequest("https://test/api/platform/shop", {
      token,
      method: "POST",
      body: { itemId: "frame-bronze", price: 1 },
    }),
    env: ctx.env,
  });
  assert.equal(response.status, 200);
  const body = await responseJson(response);
  assert.equal(body.balance, 80);
  assert.equal(body.items.find(item => item.id === "frame-bronze").owned, true);
});
