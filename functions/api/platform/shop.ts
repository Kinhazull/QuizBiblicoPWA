import { getShopCatalogItem, SHOP_CATALOG } from "../../../app/data/shopCatalog";
import { requireUser, type AppEnv } from "../../_lib/auth";
import { getOwnedPlatformItemIds, getPlatformEquipment, getUserProgress, purchasePlatformItem } from "../../_lib/platform-progress";
import { json } from "../../_lib/security";

async function view(env: AppEnv, user: any) {
  const [ownedItemIds, progress, equipped] = await Promise.all([
    getOwnedPlatformItemIds(env, user.id, user.organizationId),
    getUserProgress(env, user.id, user.organizationId),
    getPlatformEquipment(env, user.id, user.organizationId),
  ]);
  const owned = new Set(ownedItemIds);
  return {
    items: SHOP_CATALOG.map(item => ({
      ...item,
      owned: owned.has(item.id),
      equipped: equipped[item.category] === item.id,
    })),
    balance: progress.coins,
    equipped,
  };
}

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    return json(await view(env, user), 200, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
};

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const body: any = await request.json().catch(() => null);
    const item = getShopCatalogItem(String(body?.itemId || ""));
    if (!item) return json({ error: "shop_item_not_found" }, 404);
    const result = await purchasePlatformItem(env, {
      itemId: item.id,
      itemName: item.name,
      price: item.price,
      userId: user.id,
      organizationId: user.organizationId,
    });
    return json({ ...result, ...(await view(env, user)) }, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    const code = error instanceof Error ? error.message : "shop_purchase_failed";
    if (code === "insufficient_coins") return json({ error: code }, 409);
    if (code === "invalid_shop_item") return json({ error: code }, 400);
    throw error;
  }
};
