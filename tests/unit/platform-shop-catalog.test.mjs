import assert from "node:assert/strict";
import test from "node:test";
import { getShopCatalogItem, SHOP_CATALOG } from "../../app/data/shopCatalog.ts";

test("shop catalog preserves the six MVP items and excludes achievement and Daily grants", () => {
  assert.equal(SHOP_CATALOG.length, 14);
  assert.equal(new Set(SHOP_CATALOG.map(item => item.id)).size, SHOP_CATALOG.length);
  assert.ok(SHOP_CATALOG.every(item => ["frame", "avatar"].includes(item.category)));
  assert.ok(SHOP_CATALOG.every(item => Number.isSafeInteger(item.price) && item.price > 0));
  assert.deepEqual(SHOP_CATALOG.slice(0, 6).map(item => item.price), [60, 140, 260, 90, 160, 240]);
  assert.ok(SHOP_CATALOG.every(item => ["COMMON", "UNCOMMON", "RARE", "EPIC"].includes(item.rarity)));
  assert.ok(SHOP_CATALOG.every(item => item.origin === "SHOP"));
  assert.equal(getShopCatalogItem("frame-gold")?.name, "Moldura Ouro");
  assert.equal(getShopCatalogItem("avatar-lamp"), null);
  assert.equal(getShopCatalogItem("frame-light"), null);
  assert.equal(getShopCatalogItem("unknown"), null);
});
