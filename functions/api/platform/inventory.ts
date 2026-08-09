import { COLLECTIBLE_CATALOG } from "../../../shared/platform-collections";
import { requireUser, type AppEnv } from "../../_lib/auth";
import { equipPlatformItem, getOwnedPlatformItemIds, getPlatformEquipment } from "../../_lib/platform-progress";
import { json } from "../../_lib/security";

async function inventory(env: AppEnv, user: any) {
  const [ownedIds, equipped] = await Promise.all([
    getOwnedPlatformItemIds(env, user.id, user.organizationId),
    getPlatformEquipment(env, user.id, user.organizationId),
  ]);
  const owned = new Set(ownedIds);
  return {
    items: COLLECTIBLE_CATALOG.filter(item => owned.has(item.id)).map(item => ({
      ...item,
      equipped: equipped[item.category] === item.id,
    })),
    equipped,
  };
}

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    return json(await inventory(env, user), 200, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
};

export const onRequestPatch = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const body: any = await request.json().catch(() => null);
    const item = COLLECTIBLE_CATALOG.find(value => value.id === String(body?.itemId || ""));
    if (!item) return json({ error: "shop_item_not_found" }, 404);
    await equipPlatformItem(env, {
      itemId: item.id,
      category: item.category,
      userId: user.id,
      organizationId: user.organizationId,
    });
    return json(await inventory(env, user), 200, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    const code = error instanceof Error ? error.message : "inventory_update_failed";
    if (code === "shop_item_not_owned") return json({ error: code }, 409);
    if (code === "invalid_shop_item") return json({ error: code }, 400);
    throw error;
  }
};
