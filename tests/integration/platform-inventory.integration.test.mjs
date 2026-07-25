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
import {
  equipPlatformItem,
  getPlatformEquipment,
  grantCoins,
  purchasePlatformItem,
} from "../../functions/_lib/platform-progress.ts";
import { onRequestGet as getInventory, onRequestPatch as equipItem } from "../../functions/api/platform/inventory.ts";

async function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedUser(ctx, { id: "collector" });
  await grantCoins(ctx.env, {
    eventId: "inventory-balance", userId: "collector", organizationId: "org-1",
    amount: 200, reason: "Saldo de teste", sourceType: "test", sourceId: "inventory",
  });
  return ctx;
}

async function buy(ctx, itemId, itemName, price) {
  return purchasePlatformItem(ctx.env, {
    itemId, itemName, price, userId: "collector", organizationId: "org-1",
  });
}

test("purchased items appear in inventory and unowned catalog items do not", async t => {
  const ctx = await setup(t);
  await buy(ctx, "avatar-scroll", "Avatar Pergaminho", 30);
  const token = await createSession(ctx, "collector");
  const response = await getInventory({
    request: createAuthenticatedRequest("https://test/api/platform/inventory", { token }),
    env: ctx.env,
  });
  const body = await responseJson(response);
  assert.equal(response.status, 200);
  assert.deepEqual(body.items.map(item => item.id), ["avatar-scroll"]);
  assert.equal(body.items[0].equipped, false);
});

test("equip persists one avatar and one frame without changing coins", async t => {
  const ctx = await setup(t);
  await buy(ctx, "avatar-scroll", "Avatar Pergaminho", 30);
  await buy(ctx, "frame-bronze", "Moldura Bronze", 20);
  await equipPlatformItem(ctx.env, {
    itemId: "avatar-scroll", category: "avatar", userId: "collector", organizationId: "org-1",
  });
  await equipPlatformItem(ctx.env, {
    itemId: "frame-bronze", category: "frame", userId: "collector", organizationId: "org-1",
  });
  assert.deepEqual(await getPlatformEquipment(ctx.env, "collector", "org-1"), {
    frame: "frame-bronze", avatar: "avatar-scroll",
  });
  assert.equal(ctx.raw.prepare("SELECT coins FROM user_platform_progress WHERE user_id='collector'").get().coins, 150);
});

test("equipping another item automatically replaces the same category", async t => {
  const ctx = await setup(t);
  await buy(ctx, "avatar-scroll", "Avatar Pergaminho", 30);
  await buy(ctx, "avatar-dove", "Avatar Pomba", 45);
  for (const itemId of ["avatar-scroll", "avatar-dove"]) {
    await equipPlatformItem(ctx.env, {
      itemId, category: "avatar", userId: "collector", organizationId: "org-1",
    });
  }
  assert.equal((await getPlatformEquipment(ctx.env, "collector", "org-1")).avatar, "avatar-dove");
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_coin_ledger WHERE source_type='shop_equipment'").get().total, 1);
});

test("server rejects equipping an item that was not purchased", async t => {
  const ctx = await setup(t);
  const token = await createSession(ctx, "collector");
  const response = await equipItem({
    request: createAuthenticatedRequest("https://test/api/platform/inventory", {
      token, method: "PATCH", body: { itemId: "frame-gold" },
    }),
    env: ctx.env,
  });
  assert.equal(response.status, 409);
  assert.deepEqual(await getPlatformEquipment(ctx.env, "collector", "org-1"), {
    frame: null, avatar: null,
  });
});
