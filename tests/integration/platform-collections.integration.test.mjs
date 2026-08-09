import assert from "node:assert/strict";
import test from "node:test";
import { createAuthenticatedRequest, createSession, createTestDatabase, responseJson, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { ensureAchievementCatalogDefinitions, unlockAchievement } from "../../functions/_lib/platform-achievements.ts";
import { equipPlatformItem, grantCoins, grantPlatformCollectible, purchasePlatformItem } from "../../functions/_lib/platform-progress.ts";
import { getShopCatalogItem } from "../../app/data/shopCatalog.ts";
import { onRequestGet as readCollections } from "../../functions/api/platform/collections.ts";

async function setup(t) {
  const ctx = createTestDatabase();
  t.after(ctx.close);
  seedOrganization(ctx);
  seedOrganization(ctx, { id: "org-2" });
  seedUser(ctx, { id: "collector" });
  seedUser(ctx, { id: "other", organizationId: "org-2" });
  await ensureAchievementCatalogDefinitions(ctx.env);
  await grantCoins(ctx.env, { eventId: "collection-balance", userId: "collector", organizationId: "org-1", amount: 500, reason: "Saldo", sourceType: "test", sourceId: "collection" });
  return ctx;
}

test("authenticated collection view derives ownership, equipment and achievement progress", async t => {
  const ctx = await setup(t);
  const item = getShopCatalogItem("avatar-fish");
  await purchasePlatformItem(ctx.env, { itemId: item.id, itemName: item.name, price: item.price, userId: "collector", organizationId: "org-1" });
  await equipPlatformItem(ctx.env, { itemId: item.id, category: item.category, userId: "collector", organizationId: "org-1" });
  await unlockAchievement(ctx.env, { userId: "collector", organizationId: "org-1", achievementCode: "first_steps", sourceEventId: "collection-test-event" });
  const token = await createSession(ctx, "collector");
  const response = await readCollections({ request: createAuthenticatedRequest("https://test/api/platform/collections", { token }), env: ctx.env });
  const body = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
  assert.deepEqual(body.summary, { collections: 2, completedCollections: 0, collectibles: 16, ownedCollectibles: 1, achievements: 14, unlockedAchievements: 1 });
  assert.equal(body.collections.find(value => value.id === "biblical-symbols").progress.acquired, 1);
  assert.equal(body.collections.flatMap(value => value.items).find(value => value.id === item.id).equipped, true);
  assert.equal(body.achievements.find(value => value.code === "first_steps").state, "UNLOCKED");
});

test("collection view requires authentication and isolates organization ownership", async t => {
  const ctx = await setup(t);
  const foreign = getShopCatalogItem("frame-royal");
  await grantCoins(ctx.env, { eventId: "foreign-balance", userId: "other", organizationId: "org-2", amount: 500, reason: "Saldo", sourceType: "test", sourceId: "foreign" });
  await purchasePlatformItem(ctx.env, { itemId: foreign.id, itemName: foreign.name, price: foreign.price, userId: "other", organizationId: "org-2" });
  assert.equal((await readCollections({ request: new Request("https://test/api/platform/collections"), env: ctx.env })).status, 401);
  const token = await createSession(ctx, "collector");
  const response = await readCollections({ request: createAuthenticatedRequest("https://test/api/platform/collections", { token }), env: ctx.env });
  const body = await responseJson(response);
  assert.equal(body.summary.ownedCollectibles, 0);
  assert.equal(body.collections.flatMap(value => value.items).find(value => value.id === foreign.id).owned, false);
});

test("collectible grants are idempotent, concurrent, tenant-scoped and equipable", async t => {
  const ctx = await setup(t);
  const grant = () => grantPlatformCollectible(ctx.env, {
    itemId: "frame-light", itemName: "Moldura Luz", userId: "collector", organizationId: "org-1",
    sourceType: "platform_achievement", sourceId: "first_steps",
  });
  await Promise.all([grant(), grant(), grant()]);
  assert.equal(ctx.raw.prepare("SELECT COUNT(*) total FROM platform_coin_ledger WHERE source_type='collectible_grant' AND source_id='frame-light' AND organization_id='org-1'").get().total, 1);
  assert.equal(ctx.raw.prepare("SELECT coins FROM user_platform_progress WHERE user_id='collector'").get().coins, 500);
  await equipPlatformItem(ctx.env, { itemId: "frame-light", category: "frame", userId: "collector", organizationId: "org-1" });
  const token = await createSession(ctx, "collector");
  const body = await responseJson(await readCollections({ request: createAuthenticatedRequest("https://test/api/platform/collections", { token }), env: ctx.env }));
  const item = body.collections.flatMap(value => value.items).find(value => value.id === "frame-light");
  assert.deepEqual({ owned: item.owned, equipped: item.equipped, origin: item.origin }, { owned: true, equipped: true, origin: "ACHIEVEMENT" });
});
