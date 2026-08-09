import assert from "node:assert/strict";
import test from "node:test";
import { getShopCatalogItem, SHOP_CATALOG } from "../../app/data/shopCatalog.ts";

test("shop catalog exposes the six unique MVP items with valid prices", () => {
  assert.equal(SHOP_CATALOG.length, 6);
  assert.equal(new Set(SHOP_CATALOG.map(item => item.id)).size, SHOP_CATALOG.length);
  assert.ok(SHOP_CATALOG.every(item => ["frame", "avatar"].includes(item.category)));
  assert.ok(SHOP_CATALOG.every(item => Number.isSafeInteger(item.price) && item.price > 0));
  assert.deepEqual(SHOP_CATALOG.map(item => item.price), [60, 140, 260, 90, 160, 240]);
  assert.equal(getShopCatalogItem("frame-gold")?.name, "Moldura Ouro");
  assert.equal(getShopCatalogItem("unknown"), null);
});
