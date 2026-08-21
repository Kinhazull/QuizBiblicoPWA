import type { AppEnv } from "./auth";
import { getCurrentDailyMission, listCurrentMissionSnapshots } from "./platform-missions";
import { getUserProgress, grantPlatformRetentionReward } from "./platform-progress";
import { DAILY_CHEST_ECONOMY, DAILY_LOGIN_ECONOMY } from "../../shared/platform-economy";
import { hasDailyChallengeVictory } from "./platform-daily-challenge";

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

function nextDayStart(at: number, timeZone: string) {
  const current = dateKey(at, timeZone);
  let high = at + 60 * 60 * 1000;
  while (dateKey(high, timeZone) === current && high < at + 32 * 60 * 60 * 1000) high += 60 * 60 * 1000;
  let low = high - 60 * 60 * 1000;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (dateKey(middle, timeZone) === current) low = middle; else high = middle;
  }
  return high;
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
  const bounded = Math.max(1, Math.min(DAILY_LOGIN_ECONOMY.maximumStreakStep, Math.floor(streak)));
  const reward = {
    xp: DAILY_LOGIN_ECONOMY.baseXp + (bounded - 1) * DAILY_LOGIN_ECONOMY.xpStep,
    coins: DAILY_LOGIN_ECONOMY.baseCoins + Math.floor((bounded - 1) / DAILY_LOGIN_ECONOMY.coinStepEveryDays),
  };
  return { ...reward, label: rewardLabel(reward) };
}

export function dailyChestReward(identity: string): DailyRetentionReward {
  let hash = 2166136261;
  for (const character of identity) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const reward = DAILY_CHEST_ECONOMY.variants[(hash >>> 0) % DAILY_CHEST_ECONOMY.variants.length];
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

function longestStreak(dayKeys: readonly string[]) {
  const ordered = [...new Set(dayKeys)].sort();
  let best = 0;
  let current = 0;
  let previous = "";
  for (const day of ordered) {
    current = previous && previousDayKey(day) === previous ? current + 1 : 1;
    best = Math.max(best, current);
    previous = day;
  }
  return best;
}

function currentStoredStreak(dayKey: string, dayKeys: readonly string[]) {
  const days = new Set(dayKeys);
  let cursor = days.has(dayKey) ? dayKey : previousDayKey(dayKey);
  if (!days.has(cursor)) return 0;
  let streak = 0;
  while (days.has(cursor) && streak < 3660) {
    streak += 1;
    cursor = previousDayKey(cursor);
  }
  return streak;
}

export async function getDailyRetentionAdminSnapshot(
  env: AppEnv,
  userId: string,
  organizationId: string,
  now = Date.now(),
) {
  const user = await env.DB.prepare(`SELECT u.last_login_at lastLoginAt,u.created_at createdAt,o.timezone
    FROM users u JOIN organizations o ON o.id=u.organization_id
    WHERE u.id=?1 AND u.organization_id=?2`).bind(userId, organizationId).first<any>();
  if (!user) throw new Error("retention_user_unavailable");
  const timeZone = String(user.timezone || DEFAULT_TIME_ZONE);
  const dayKey = dateKey(now, timeZone);
  const [days, missions, currentChest, latestChest, dailyVictory] = await Promise.all([
    loginDays(env, userId, organizationId),
    listCurrentMissionSnapshots(env, userId, organizationId, now),
    storedReward(env, userId, organizationId, "daily_chest", dayKey),
    env.DB.prepare(`SELECT source_id sourceId,MAX(applied_at) claimedAt
      FROM platform_coin_ledger
      WHERE user_id=?1 AND organization_id=?2 AND source_type='daily_chest' AND applied_at IS NOT NULL
      GROUP BY source_id
      UNION ALL
      SELECT source_id sourceId,MAX(applied_at) claimedAt
      FROM platform_xp_ledger
      WHERE user_id=?1 AND organization_id=?2 AND source_type='daily_chest' AND applied_at IS NOT NULL
      GROUP BY source_id
      ORDER BY claimedAt DESC LIMIT 1`).bind(userId, organizationId).all<any>(),
    hasDailyChallengeVictory(env, { userId, organizationId }, now),
  ]);
  const latest = latestChest.results[0] || null;
  const latestReward = latest?.sourceId
    ? await storedReward(env, userId, organizationId, "daily_chest", String(latest.sourceId))
    : null;
  const currentStreak = currentStoredStreak(dayKey, days);
  const missionUnlocksChest = dailyVictory || missions.daily?.state === "completed" || missions.daily?.state === "claimed";
  const opened = Boolean(currentChest);
  return {
    missions,
    retention: {
      currentStreak,
      bestStreak: longestStreak(days),
      activeDays: new Set(days).size,
      lastAccessAt: user.lastLoginAt == null ? null : Number(user.lastLoginAt),
      createdAt: Number(user.createdAt),
    },
    dailyChest: {
      available: missionUnlocksChest && !opened,
      opened,
      lastClaimedAt: latest?.claimedAt == null ? null : Number(latest.claimedAt),
      nextAvailableAt: opened ? nextDayStart(now, timeZone) : null,
      lastReward: latestReward,
    },
  };
}

export async function getDailyRetentionState(
  env: AppEnv,
  userId: string,
  organizationId: string,
  now = Date.now(),
) {
  const { timeZone } = await context(env, userId, organizationId);
  const dayKey = dateKey(now, timeZone);
  const [days, mission, loginReward, chestReward, dailyVictory] = await Promise.all([
    loginDays(env, userId, organizationId),
    getCurrentDailyMission(env, userId, organizationId, now),
    storedReward(env, userId, organizationId, "daily_login", dayKey),
    storedReward(env, userId, organizationId, "daily_chest", dayKey),
    hasDailyChallengeVictory(env, { userId, organizationId }, now),
  ]);
  const streak = calculateDailyStreak(dayKey, days);
  const chestUnlocked = dailyVictory || mission?.state === "completed" || mission?.state === "claimed";
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
