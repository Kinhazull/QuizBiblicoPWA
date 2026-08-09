import type { CoreEventConsumer, CorePlatformEvent } from "./platform-event-engine";
import type { GameFinishedV2Payload } from "./platform-event-catalog";
import { grantPlatformReward } from "./platform-progress";
import { GAME_FINISHED_ECONOMY } from "../../shared/platform-economy";

export const REWARD_PROGRESS_CONSUMER_ID = "reward-progress";
export const REWARD_PROGRESS_CONSUMER_VERSION = 1;

export function calculateGameFinishedReward(payload: GameFinishedV2Payload) {
  if (payload.status !== "completed" || payload.mode !== "official") return null;
  if (!Number.isSafeInteger(payload.questionsAnswered) || payload.questionsAnswered < 1
    || !Number.isSafeInteger(payload.correctAnswers) || payload.correctAnswers < 0
    || payload.correctAnswers > payload.questionsAnswered) throw new Error("invalid_reward_metrics");
  const ratio = payload.correctAnswers / payload.questionsAnswered;
  const perfect = payload.correctAnswers === payload.questionsAnswered;
  const baseXp = Math.min(GAME_FINISHED_ECONOMY.maximumXpPerGame,
    GAME_FINISHED_ECONOMY.completionXp
    + Math.floor(ratio * GAME_FINISHED_ECONOMY.performanceXpMaximum)
    + (perfect ? GAME_FINISHED_ECONOMY.perfectXpBonus : 0));
  const coins = Math.min(GAME_FINISHED_ECONOMY.maximumCoinsPerGame,
    GAME_FINISHED_ECONOMY.completionCoins
    + (ratio >= GAME_FINISHED_ECONOMY.performanceCoinThreshold ? GAME_FINISHED_ECONOMY.performanceCoins : 0)
    + (perfect ? GAME_FINISHED_ECONOMY.perfectCoins : 0));
  return { baseXp, coins, dailyBonusXp: GAME_FINISHED_ECONOMY.firstOfficialGameDailyXp, perfect, ratio };
}

function dailyWindowKey(completedAt: number) {
  if (!Number.isSafeInteger(completedAt) || completedAt < 0) throw new Error("invalid_reward_completion_time");
  return new Date(completedAt).toISOString().slice(0, 10);
}

export const platformRewardConsumer: CoreEventConsumer = {
  id: REWARD_PROGRESS_CONSUMER_ID,
  handlerVersion: REWARD_PROGRESS_CONSUMER_VERSION,
  eventTypes: ["GAME_FINISHED"],
  async handle(event: CorePlatformEvent, env) {
    // v1 remains valid for historical/statistical processing, but lacks eligibility metrics.
    if (event.version === 1) return;
    if (event.version !== 2 || event.eventType !== "GAME_FINISHED") throw new Error("unsupported_reward_event");
    const payload = event.payload as GameFinishedV2Payload;
    const reward = calculateGameFinishedReward(payload);
    if (!reward) return;
    await grantPlatformReward(env, {
      eventId: event.eventId,
      userId: event.userId,
      organizationId: event.organizationId,
      xpAmount: reward.baseXp,
      coinAmount: reward.coins,
      dailyBonusXp: reward.dailyBonusXp,
      dailyWindowKey: dailyWindowKey(payload.completedAt),
      reason: "Conclusão oficial de jogo",
      sourceType: "game_finished",
      sourceId: payload.attemptId,
    });
  },
};
