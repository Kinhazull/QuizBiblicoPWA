import type { AppEnv } from "./auth";
import { listAchievements } from "./platform-achievements";
import { getOwnedPlatformItemIds, getPlatformEquipment, getUserProgress } from "./platform-progress";
import { getUserStatistics } from "./platform-statistics";
import { achievementMetricValue, CORE_PLATFORM_ACHIEVEMENTS } from "./platform-achievement-catalog";
import { COLLECTIONS, COLLECTIBLE_CATALOG, collectionProgress } from "../../shared/platform-collections";

export async function getPlatformCollectionsView(env: AppEnv, userId: string, organizationId: string) {
  const [ownedIds, equipment, achievements, statistics, progress] = await Promise.all([
    getOwnedPlatformItemIds(env, userId, organizationId),
    getPlatformEquipment(env, userId, organizationId),
    listAchievements(env, userId, organizationId),
    getUserStatistics(env, userId, organizationId),
    getUserProgress(env, userId, organizationId),
  ]);
  const owned = new Set(ownedIds);
  const items = COLLECTIBLE_CATALOG.map(item => ({
    ...item,
    owned: owned.has(item.id),
    equipped: equipment[item.category] === item.id,
  }));
  const collections = COLLECTIONS.map(collection => ({
    ...collection,
    progress: collectionProgress(collection, owned),
    items: collection.itemIds.map(itemId => items.find(item => item.id === itemId)),
  }));
  const achievementViews = achievements.map(view => {
    const catalog = CORE_PLATFORM_ACHIEVEMENTS.find(item => item.achievementId === view.code);
    const current = catalog && (!view.secret || view.unlocked)
      ? achievementMetricValue(catalog, statistics.global, progress)
      : null;
    return {
      ...view,
      category: catalog?.category || null,
      rarity: catalog?.rarity || null,
      reward: catalog?.reward || null,
      progress: catalog && current !== null ? {
        current: Math.min(current, catalog.criterion.target),
        target: catalog.criterion.target,
        percent: Math.min(100, Math.floor((current / catalog.criterion.target) * 100)),
      } : null,
      state: view.unlocked ? "UNLOCKED" as const : current !== null && current > 0 ? "IN_PROGRESS" as const : "LOCKED" as const,
    };
  });
  return {
    summary: {
      collections: collections.length,
      completedCollections: collections.filter(collection => collection.progress.status === "COMPLETE").length,
      collectibles: items.length,
      ownedCollectibles: items.filter(item => item.owned).length,
      achievements: achievementViews.length,
      unlockedAchievements: achievementViews.filter(item => item.unlocked).length,
    },
    collections,
    achievements: achievementViews,
    equipment,
  };
}
