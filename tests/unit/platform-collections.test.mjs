import assert from "node:assert/strict";
import test from "node:test";
import { COLLECTIONS, COLLECTIBLE_CATALOG, collectionProgress } from "../../shared/platform-collections.ts";

test("collectible catalog preserves stable identities and groups every item exactly once", () => {
  assert.equal(COLLECTIBLE_CATALOG.length, 16);
  assert.equal(new Set(COLLECTIBLE_CATALOG.map(item => item.id)).size, 16);
  assert.equal(COLLECTIONS.length, 2);
  assert.deepEqual(COLLECTIONS.map(item => item.itemIds.length), [8, 8]);
  assert.deepEqual(new Set(COLLECTIONS.flatMap(item => item.itemIds)), new Set(COLLECTIBLE_CATALOG.map(item => item.id)));
  assert.equal(COLLECTIBLE_CATALOG.filter(item => item.origin === "SHOP").length, 14);
  assert.deepEqual(COLLECTIBLE_CATALOG.filter(item => item.origin !== "SHOP").map(item => [item.id, item.origin, item.originRef]), [
    ["avatar-lamp", "DAILY", "daily_challenge_7"],
    ["frame-light", "ACHIEVEMENT", "first_steps"],
  ]);
});

test("collection progress is derived only from real ownership", () => {
  const collection = COLLECTIONS[0];
  assert.deepEqual(collectionProgress(collection, new Set()), { acquired: 0, total: 8, percent: 0, status: "IN_PROGRESS" });
  assert.deepEqual(collectionProgress(collection, new Set(collection.itemIds)), { acquired: 8, total: 8, percent: 100, status: "COMPLETE" });
});

test("rarity is presentational and all new prices remain inside Economy 2.0 bands", () => {
  assert.deepEqual(new Set(COLLECTIBLE_CATALOG.map(item => item.rarity)), new Set(["COMMON", "UNCOMMON", "RARE", "EPIC"]));
  assert.ok(COLLECTIBLE_CATALOG.every(item => item.price >= 60 && item.price <= 260));
});
