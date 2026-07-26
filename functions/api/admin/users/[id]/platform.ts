import { SHOP_CATALOG } from "../../../../../app/data/shopCatalog";
import { gameModules } from "../../../../../app/games/sdk/gameModules";
import type { AppEnv } from "../../../../_lib/auth";
import { requirePermission } from "../../../../_lib/permissions";
import { getAchievementSummary, listAchievements } from "../../../../_lib/platform-achievements";
import {
  getOwnedPlatformItemIds,
  getPlatformEquipment,
  getUserProgress,
} from "../../../../_lib/platform-progress";
import { getUserStatistics } from "../../../../_lib/platform-statistics";
import { json } from "../../../../_lib/security";

const PRIVATE_HEADERS = { "cache-control": "no-store, private" };

function withPrivateCache(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store, private");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export const onRequestGet = async ({
  request,
  env,
  params,
}: {
  request: Request;
  env: AppEnv;
  params: { id: string };
}) => {
  try {
    const admin: any = await requirePermission(request, env, "members.manage");
    const account = await env.DB.prepare(
      `SELECT id,display_name displayName,username,role,status,created_at createdAt
         FROM users
        WHERE id=?1 AND organization_id=?2`,
    ).bind(params.id, admin.organizationId).first<any>();
    if (!account) return json({ error: "not_found" }, 404, PRIVATE_HEADERS);

    const [progress, statistics, achievements, achievementSummary, ownedIds, equipment] = await Promise.all([
      getUserProgress(env, account.id, admin.organizationId),
      getUserStatistics(env, account.id, admin.organizationId),
      listAchievements(env, account.id, admin.organizationId),
      getAchievementSummary(env, account.id, admin.organizationId),
      getOwnedPlatformItemIds(env, account.id, admin.organizationId),
      getPlatformEquipment(env, account.id, admin.organizationId),
    ]);
    const catalogById = new Map(SHOP_CATALOG.map(item => [item.id, item]));
    const gamesById = new Map(gameModules.map(game => [game.id, game.name]));
    const inventory = ownedIds.map(id => {
      const item = catalogById.get(id);
      return item
        ? { id: item.id, name: item.name, category: item.category, known: true }
        : { id, name: "Item legado", category: "legacy", known: false };
    });
    const resolveEquipment = (id: string | null | undefined) => {
      if (!id) return null;
      const item = catalogById.get(id);
      return item
        ? { id: item.id, name: item.name, category: item.category, known: true }
        : { id, name: "Item legado", category: "legacy", known: false };
    };
    const unlocked = achievements.filter(item => item.unlocked);

    return json({
      account,
      progress,
      statistics: {
        global: statistics.global,
        games: statistics.games.map(game => ({
          ...game,
          gameName: gamesById.get(game.gameId) || "Jogo não catalogado",
        })),
      },
      achievements: {
        summary: achievementSummary,
        unlocked,
      },
      inventory,
      equipment: {
        avatar: resolveEquipment(equipment.avatar),
        frame: resolveEquipment(equipment.frame),
      },
    }, 200, PRIVATE_HEADERS);
  } catch (error) {
    if (error instanceof Response) return withPrivateCache(error);
    throw error;
  }
};
