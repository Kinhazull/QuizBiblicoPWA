import type { CoreEventConsumer, CorePlatformEvent } from "./platform-event-engine";
import { CORE_PLATFORM_ACHIEVEMENTS, achievementCriterionMet, achievementMetricValue } from "./platform-achievement-catalog";
import { ensureAchievementCatalogDefinitions, unlockAchievementWithReward } from "./platform-achievements";
import { getUserProgress } from "./platform-progress";
import { REWARD_PROGRESS_CONSUMER_ID, REWARD_PROGRESS_CONSUMER_VERSION } from "./platform-rewards";
import { getUserStatistics, STATISTICS_CONSUMER_ID, STATISTICS_CONSUMER_VERSION } from "./platform-statistics";

export const ACHIEVEMENT_CONSUMER_ID = "platform-achievements";
export const ACHIEVEMENT_CONSUMER_VERSION = 1;

async function requireAchievementPrerequisites(event: CorePlatformEvent, env: Parameters<CoreEventConsumer["handle"]>[1]) {
  const receipts = await env.DB.prepare(`SELECT consumer_id consumerId,handler_version handlerVersion,state
    FROM core_platform_event_processing
    WHERE event_id=?1 AND (
      (consumer_id=?2 AND handler_version=?3) OR
      (consumer_id=?4 AND handler_version=?5)
    )`).bind(
    event.eventId,
    STATISTICS_CONSUMER_ID,
    STATISTICS_CONSUMER_VERSION,
    REWARD_PROGRESS_CONSUMER_ID,
    REWARD_PROGRESS_CONSUMER_VERSION,
  ).all<any>();
  const completed = new Set((receipts.results || [])
    .filter(row => row.state === "completed")
    .map(row => `${row.consumerId}:${Number(row.handlerVersion)}`));
  if (!completed.has(`${STATISTICS_CONSUMER_ID}:${STATISTICS_CONSUMER_VERSION}`)
    || !completed.has(`${REWARD_PROGRESS_CONSUMER_ID}:${REWARD_PROGRESS_CONSUMER_VERSION}`)) {
    throw new Error("achievement_prerequisite_pending");
  }
}

export const platformAchievementConsumer: CoreEventConsumer = {
  id: ACHIEVEMENT_CONSUMER_ID,
  handlerVersion: ACHIEVEMENT_CONSUMER_VERSION,
  eventTypes: ["GAME_FINISHED"],
  async handle(event: CorePlatformEvent, env) {
    if (event.version === 1) return;
    if (event.version !== 2 || event.eventType !== "GAME_FINISHED") throw new Error("unsupported_achievement_event");
    if (event.payload.status !== "completed" || event.payload.mode !== "official") return;

    await requireAchievementPrerequisites(event, env);

    await ensureAchievementCatalogDefinitions(env);

    const [statistics, progress] = await Promise.all([
      getUserStatistics(env, event.userId, event.organizationId),
      getUserProgress(env, event.userId, event.organizationId),
    ]);
    const unlocked = await env.DB.prepare(
      "SELECT achievement_code code FROM user_platform_achievements WHERE user_id=?1 AND organization_id=?2 AND scope_key='global'",
    ).bind(event.userId, event.organizationId).all<any>();
    const unlockedCodes = new Set((unlocked.results || []).map(row => String(row.code)));

    for (const achievement of CORE_PLATFORM_ACHIEVEMENTS) {
      if (unlockedCodes.has(achievement.achievementId)) continue;
      const value = achievementMetricValue(achievement, statistics.global as Record<string, number>, progress);
      if (!achievementCriterionMet(achievement, value)) continue;
      const result = await unlockAchievementWithReward(env, {
        userId: event.userId,
        organizationId: event.organizationId,
        achievementCode: achievement.achievementId,
        sourceEventId: event.eventId,
        scopeKey: "global",
      });
      if (result.unlocked) unlockedCodes.add(achievement.achievementId);
    }
  },
};
