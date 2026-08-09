import type { AppEnv } from "./auth";
import { listDailyObjectives, organizationDayKey } from "./platform-daily-objectives";
import { grantPlatformRetentionReward } from "./platform-progress";
import { DAILY_CHALLENGE_ECONOMY } from "../../shared/platform-economy";

export const DAILY_CHALLENGE_TARGETS = Object.freeze({
  INTERMEDIATE: DAILY_CHALLENGE_ECONOMY.targets.intermediate,
  COMPLETE: DAILY_CHALLENGE_ECONOMY.targets.complete,
});
export const DAILY_CHALLENGE_REWARDS = DAILY_CHALLENGE_ECONOMY.rewards;

export type DailyVisibleStatus = "AVAILABLE" | "WON" | "LOST" | "UNAVAILABLE";
export type DailyRewardState = "LOCKED" | "READY" | "CLAIMED";
type Identity = { organizationId: string; userId: string };

type ParticipationResult = {
  selectionId: string;
  status: string;
  finishEventId: string | null;
  payloadJson: string | null;
};

function safePayload(value: string | null) {
  try { return JSON.parse(value || "{}") as Record<string, unknown>; } catch { return {}; }
}

function outcome(row: ParticipationResult | undefined): DailyVisibleStatus | null {
  if (!row) return null;
  if (row.status === "STARTED") return "LOST";
  if (row.status !== "FINISHED") return null;
  if (row.finishEventId?.startsWith("abandon:")) return "LOST";
  const payload = safePayload(row.payloadJson);
  return Number(payload.correctAnswers || 0) > 0 ? "WON" : "LOST";
}

async function organizationDay(env: AppEnv, organizationId: string, now: number) {
  const row = await env.DB.prepare("SELECT timezone FROM organizations WHERE id=?1")
    .bind(organizationId).first<{ timezone: string | null }>();
  if (!row) throw new Error("daily_objective_organization_unavailable");
  return {
    dayKey: organizationDayKey(now, String(row.timezone || "America/Sao_Paulo")),
    timeZone: String(row.timezone || "America/Sao_Paulo"),
  };
}

async function participationResults(env: AppEnv, identity: Identity, dayKey: string) {
  const rows = await env.DB.prepare(`SELECT p.selection_id selectionId,p.status,p.finish_event_id finishEventId,
      e.payload_json payloadJson
    FROM generated_game_participations p
    JOIN generated_game_selections s ON s.id=p.selection_id AND s.organization_id=p.organization_id
    LEFT JOIN core_platform_events e ON e.event_id=p.finish_event_id AND e.organization_id=p.organization_id
    WHERE p.organization_id=?1 AND p.user_id=?2 AND p.mode='DAILY'
      AND s.selection_key LIKE ?3`)
    .bind(identity.organizationId, identity.userId, `daily:${dayKey}:%`).all<ParticipationResult>();
  return new Map((rows.results || []).map(row => [String(row.selectionId), row]));
}

async function claimedReward(env: AppEnv, identity: Identity, dayKey: string, target: 3 | 7) {
  const sourceType = `daily_challenge_${target}`;
  const row = await env.DB.prepare(`SELECT 1 claimed FROM platform_xp_ledger
      WHERE organization_id=?1 AND user_id=?2 AND source_type=?3 AND source_id=?4 AND applied_at IS NOT NULL
    UNION ALL SELECT 1 FROM platform_coin_ledger
      WHERE organization_id=?1 AND user_id=?2 AND source_type=?3 AND source_id=?4 AND applied_at IS NOT NULL LIMIT 1`)
    .bind(identity.organizationId, identity.userId, sourceType, dayKey).first();
  return Boolean(row);
}

export async function getDailyChallengeState(
  env: AppEnv,
  identity: Identity,
  now = Date.now(),
) {
  const [{ dayKey, timeZone }, objectives] = await Promise.all([
    organizationDay(env, identity.organizationId, now),
    listDailyObjectives(env, identity, now),
  ]);
  const results = await participationResults(env, identity, dayKey);
  const visibleObjectives = objectives.map(objective => {
    const resolved = objective.availability === "UNAVAILABLE"
      ? "UNAVAILABLE" as const
      : outcome(objective.selectionId ? results.get(objective.selectionId) : undefined)
        || (objective.status === "CREATED" ? "AVAILABLE" as const : "LOST" as const);
    return { ...objective, state: resolved };
  });
  const wins = visibleObjectives.filter(objective => objective.state === "WON").length;
  const played = visibleObjectives.filter(objective => objective.state === "WON" || objective.state === "LOST").length;
  const unavailable = visibleObjectives.filter(objective => objective.state === "UNAVAILABLE").length;
  const rewards = await Promise.all(([3, 7] as const).map(async target => {
    const claimed = await claimedReward(env, identity, dayKey, target);
    return {
      target,
      reward: DAILY_CHALLENGE_REWARDS[target],
      state: claimed ? "CLAIMED" as const : wins >= target ? "READY" as const : "LOCKED" as const,
    };
  }));
  return {
    dayKey,
    timeZone,
    wins,
    played,
    unavailable,
    total: 7,
    objectives: visibleObjectives,
    rewards,
  };
}

export async function claimDailyChallengeReward(
  env: AppEnv,
  identity: Identity,
  target: 3 | 7,
  now = Date.now(),
) {
  if (target !== DAILY_CHALLENGE_TARGETS.INTERMEDIATE && target !== DAILY_CHALLENGE_TARGETS.COMPLETE) {
    throw new Error("invalid_daily_reward_target");
  }
  const state = await getDailyChallengeState(env, identity, now);
  const milestone = state.rewards.find(reward => reward.target === target)!;
  if (milestone.state === "LOCKED") throw new Error("daily_reward_locked");
  const reward = DAILY_CHALLENGE_REWARDS[target];
  const result = await grantPlatformRetentionReward(env, {
    identity: `daily-challenge:${identity.organizationId}:${identity.userId}:${state.dayKey}:${target}`,
    userId: identity.userId,
    organizationId: identity.organizationId,
    xpAmount: reward.xp,
    coinAmount: reward.coins,
    reason: `Desafios diários — meta ${target}/7`,
    sourceType: `daily_challenge_${target}`,
    sourceId: state.dayKey,
  });
  return { daily: await getDailyChallengeState(env, identity, now), progress: result.progress };
}
