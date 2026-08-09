import { COLLECTIBLE_CATALOG } from "../../shared/platform-collections";

export { type CollectibleItem as ShopCatalogItem } from "../../shared/platform-collections";
export { type ShopCategory } from "../../shared/platform-economy";

export const SHOP_CATALOG = COLLECTIBLE_CATALOG.filter(item => item.origin === "SHOP");

export function getShopCatalogItem(itemId: string) {
  return SHOP_CATALOG.find(item => item.id === itemId) || null;
}
