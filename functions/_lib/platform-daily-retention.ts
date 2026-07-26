import type { AppEnv } from "./auth";
import { getCurrentDailyMission } from "./platform-missions";
import { getUserProgress, grantPlatformRetentionReward } from "./platform-progress";

const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

export type DailyRetentionReward = { xp: number; coins: number; label: string };

function dateKey(at: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(at));
}

function previousDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1, 12)).toISOString().slice(0, 10);
}

function rewardLabel(reward: { xp: number; coins: number }) {
  return [
    reward.xp ? `+${reward.xp} XP` : "",
    reward.coins ? `+${reward.coins} moedas` : "",
  ].filter(Boolean).join(" e ");
}

export function calculateDailyStreak(dayKey: string, claimedDayKeys: readonly string[]) {
  const days = new Set(claimedDayKeys);
  let cursor = days.has(dayKey) ? dayKey : previousDayKey(dayKey);
  let streak = 0;
  while (days.has(cursor) && streak < 3660) {
    streak += 1;
    cursor = previousDayKey(cursor);
  }
  return days.has(dayKey) ? streak : days.has(previousDayKey(dayKey)) ? streak + 1 : 1;
}

export function dailyLoginReward(streak: number): DailyRetentionReward {
  const bounded = Math.max(1, Math.min(7, Math.floor(streak)));
  const reward = { xp: 10 + (bounded - 1) * 2, coins: 2 + Math.floor((bounded - 1) / 2) };
  return { ...reward, label: rewardLabel(reward) };
}

export function dailyChestReward(identity: string): DailyRetentionReward {
  let hash = 2166136261;
  for (const character of identity) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const variants = [{ xp: 20, coins: 0 }, { xp: 0, coins: 5 }, { xp: 10, coins: 3 }] as const;
  const reward = variants[(hash >>> 0) % variants.length];
  return { ...reward, label: rewardLabel(reward) };
}

async function context(env: AppEnv, userId: string, organizationId: string) {
  const row = await env.DB.prepare(`SELECT o.timezone FROM users u JOIN organizations o ON o.id=u.organization_id
    WHERE u.id=?1 AND u.organization_id=?2 AND u.status='active'`).bind(userId, organizationId).first<any>();
  if (!row) throw new Error("retention_user_unavailable");
  return { timeZone: String(row.timezone || DEFAULT_TIME_ZONE) };
}

async function loginDays(env: AppEnv, userId: string, organizationId: string) {
  const rows = await env.DB.prepare(`SELECT source_id dayKey FROM platform_xp_ledger
    WHERE user_id=?1 AND organization_id=?2 AND source_type='daily_login' AND applied_at IS NOT NULL
    ORDER BY source_id DESC LIMIT 370`).bind(userId, organizationId).all<any>();
  return rows.results.map(row => String(row.dayKey));
}

async function storedReward(env: AppEnv, userId: string, organizationId: string, sourceType: string, dayKey: string) {
  const [xp, coins] = await Promise.all([
    env.DB.prepare(`SELECT amount FROM platform_xp_ledger WHERE user_id=?1 AND organization_id=?2
      AND source_type=?3 AND source_id=?4 AND applied_at IS NOT NULL`).bind(userId, organizationId, sourceType, dayKey).first<any>(),
    env.DB.prepare(`SELECT amount FROM platform_coin_ledger WHERE user_id=?1 AND organization_id=?2
      AND source_type=?3 AND source_id=?4 AND applied_at IS NOT NULL`).bind(userId, organizationId, sourceType, dayKey).first<any>(),
  ]);
  const reward = { xp: Number(xp?.amount || 0), coins: Number(coins?.amount || 0) };
  return reward.xp || reward.coins ? { ...reward, label: rewardLabel(reward) } : null;
}

export async function getDailyRetentionState(
  env: AppEnv,
  userId: string,
  organizationId: string,
  now = Date.now(),
) {
  const { timeZone } = await context(env, userId, organizationId);
  const dayKey = dateKey(now, timeZone);
  const [days, mission, loginReward, chestReward] = await Promise.all([
    loginDays(env, userId, organizationId),
    getCurrentDailyMission(env, userId, organizationId, now),
    storedReward(env, userId, organizationId, "daily_login", dayKey),
    storedReward(env, userId, organizationId, "daily_chest", dayKey),
  ]);
  const streak = calculateDailyStreak(dayKey, days);
  const chestUnlocked = mission?.state === "completed" || mission?.state === "claimed";
  return {
    dayKey,
    streak,
    login: {
      claimed: Boolean(loginReward),
      reward: loginReward || dailyLoginReward(streak),
    },
    mission,
    chest: {
      unlocked: chestUnlocked,
      opened: Boolean(chestReward),
      reward: chestReward,
      preview: dailyChestReward(`${organizationId}:${userId}:${dayKey}`),
    },
    progress: await getUserProgress(env, userId, organizationId),
  };
}

export async function claimDailyLogin(
  env: AppEnv,
  userId: string,
  organizationId: string,
  now = Date.now(),
) {
  const { timeZone } = await context(env, userId, organizationId);
  const dayKey = dateKey(now, timeZone);
  const days = await loginDays(env, userId, organizationId);
  const streak = calculateDailyStreak(dayKey, days);
  const reward = dailyLoginReward(streak);
  await grantPlatformRetentionReward(env, {
    identity: `daily-login:${organizationId}:${userId}:${dayKey}`,
    userId,
    organizationId,
    xpAmount: reward.xp,
    coinAmount: reward.coins,
    reason: `Login diário — sequência ${streak}`,
    sourceType: "daily_login",
    sourceId: dayKey,
  });
  return getDailyRetentionState(env, userId, organizationId, now);
}

export async function openDailyChest(
  env: AppEnv,
  userId: string,
  organizationId: string,
  now = Date.now(),
) {
  const state = await getDailyRetentionState(env, userId, organizationId, now);
  if (!state.chest.unlocked) throw new Error("daily_chest_locked");
  const reward = state.chest.reward || state.chest.preview;
  await grantPlatformRetentionReward(env, {
    identity: `daily-chest:${organizationId}:${userId}:${state.dayKey}`,
    userId,
    organizationId,
    xpAmount: reward.xp,
    coinAmount: reward.coins,
    reason: "Cofre diário",
    sourceType: "daily_chest",
    sourceId: state.dayKey,
  });
  return getDailyRetentionState(env, userId, organizationId, now);
}
