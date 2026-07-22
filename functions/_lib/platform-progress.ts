import type { AppEnv } from "./auth";

export const PLATFORM_LEVEL_CURVE_VERSION = "quadratic-v1";
const XP_STEP = 100;
const MAX_GRANT = 1_000_000;

export type PlatformProgress = {
  level: number;
  totalXp: number;
  coins: number;
  curveVersion: typeof PLATFORM_LEVEL_CURVE_VERSION;
  levelProgress: { currentXp: number; targetXp: number; percent: number };
};

type GrantInput = {
  eventId: string;
  userId: string;
  organizationId: string;
  amount: number;
  reason: string;
  sourceType: string;
  sourceId?: string | null;
};

export type PlatformRewardGrantInput = {
  eventId: string;
  userId: string;
  organizationId: string;
  xpAmount: number;
  coinAmount: number;
  dailyBonusXp: number;
  dailyWindowKey: string;
  reason: string;
  sourceType: string;
  sourceId: string;
};

export function xpRequiredForLevel(level: number) {
  const safeLevel = Math.max(1, Math.floor(level));
  return XP_STEP * (safeLevel - 1) ** 2;
}

export function progressFromBalances(totalXp: number, coins: number): PlatformProgress {
  const safeXp = Math.max(0, Math.floor(totalXp));
  const safeCoins = Math.max(0, Math.floor(coins));
  const level = Math.floor(Math.sqrt(safeXp / XP_STEP)) + 1;
  const levelStart = xpRequiredForLevel(level);
  const nextLevel = xpRequiredForLevel(level + 1);
  const targetXp = nextLevel - levelStart;
  const currentXp = safeXp - levelStart;
  return {
    level,
    totalXp: safeXp,
    coins: safeCoins,
    curveVersion: PLATFORM_LEVEL_CURVE_VERSION,
    levelProgress: {
      currentXp,
      targetXp,
      percent: targetXp ? Math.min(100, Math.floor((currentXp / targetXp) * 100)) : 0,
    },
  };
}

export async function getUserProgress(env: AppEnv, userId: string, organizationId: string) {
  const row = await env.DB.prepare(
    "SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id=?1 AND organization_id=?2",
  ).bind(userId, organizationId).first<any>();
  return progressFromBalances(Number(row?.totalXp || 0), Number(row?.coins || 0));
}

function validateGrant(input: GrantInput) {
  if (!input.eventId.trim() || input.eventId.length > 120) throw new Error("invalid_progress_event");
  if (!Number.isSafeInteger(input.amount) || input.amount < 1 || input.amount > MAX_GRANT) throw new Error("invalid_progress_amount");
  if (!input.reason.trim() || input.reason.length > 160) throw new Error("invalid_progress_reason");
  if (!input.sourceType.trim() || input.sourceType.length > 60) throw new Error("invalid_progress_source");
  if (input.sourceId && input.sourceId.length > 120) throw new Error("invalid_progress_source");
}

async function compactEventId(namespace: string, identity: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  return `${namespace}:${hash}`;
}

function assertExpectedLedger(row: any, expected: GrantInput) {
  if (!row) return;
  if (row.userId !== expected.userId || row.organizationId !== expected.organizationId
    || Number(row.amount) !== expected.amount || row.reason !== expected.reason
    || row.sourceType !== expected.sourceType || (row.sourceId || null) !== (expected.sourceId || null)) {
    throw new Error("progress_reward_conflict");
  }
}

async function existingLedger(env: AppEnv, table: "platform_xp_ledger" | "platform_coin_ledger", eventId: string) {
  return env.DB.prepare(`SELECT user_id userId,organization_id organizationId,amount,reason,source_type sourceType,source_id sourceId,applied_at appliedAt FROM ${table} WHERE event_id=?1`)
    .bind(eventId).first<any>();
}

/** Applies one logical game reward atomically. Consumers must not write progress balances directly. */
export async function grantPlatformReward(env: AppEnv, input: PlatformRewardGrantInput) {
  const baseXpEventId = await compactEventId("reward-xp", input.eventId);
  const coinEventId = await compactEventId("reward-coins", input.eventId);
  const dailyEventId = await compactEventId("reward-daily", `${input.organizationId}:${input.userId}:${input.dailyWindowKey}`);
  const base: Omit<GrantInput, "eventId" | "amount"> = {
    userId: input.userId,
    organizationId: input.organizationId,
    reason: input.reason,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
  };
  const xpGrant = { ...base, eventId: baseXpEventId, amount: input.xpAmount };
  const coinGrant = { ...base, eventId: coinEventId, amount: input.coinAmount };
  const dailyGrant = {
    ...base,
    eventId: dailyEventId,
    amount: input.dailyBonusXp,
    reason: "Primeira partida oficial do dia",
    sourceId: input.dailyWindowKey,
  };
  validateGrant(xpGrant);
  validateGrant(coinGrant);
  validateGrant(dailyGrant);
  const active = await env.DB.prepare(
    "SELECT id FROM users WHERE id=?1 AND organization_id=?2 AND status='active'",
  ).bind(input.userId, input.organizationId).first();
  if (!active) throw new Error("progress_user_unavailable");

  assertExpectedLedger(await existingLedger(env, "platform_xp_ledger", baseXpEventId), xpGrant);
  assertExpectedLedger(await existingLedger(env, "platform_coin_ledger", coinEventId), coinGrant);
  assertExpectedLedger(await existingLedger(env, "platform_xp_ledger", dailyEventId), dailyGrant);

  const now = Date.now();
  const results = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO user_platform_progress(user_id,organization_id,total_xp,coins,created_at,updated_at) VALUES(?1,?2,0,0,?3,?3) ON CONFLICT(user_id) DO NOTHING",
    ).bind(input.userId, input.organizationId, now),
    env.DB.prepare(`INSERT INTO platform_xp_ledger(id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at)
      VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9) ON CONFLICT(event_id) DO NOTHING`)
      .bind(crypto.randomUUID(), baseXpEventId, input.userId, input.organizationId, input.xpAmount, input.reason, input.sourceType, input.sourceId, now),
    env.DB.prepare(`INSERT INTO platform_coin_ledger(id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at)
      VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9) ON CONFLICT(event_id) DO NOTHING`)
      .bind(crypto.randomUUID(), coinEventId, input.userId, input.organizationId, input.coinAmount, input.reason, input.sourceType, input.sourceId, now),
    env.DB.prepare(`INSERT INTO platform_xp_ledger(id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at)
      VALUES(?1,?2,?3,?4,?5,'Primeira partida oficial do dia',?6,?7,?8) ON CONFLICT(event_id) DO NOTHING`)
      .bind(crypto.randomUUID(), dailyEventId, input.userId, input.organizationId, input.dailyBonusXp, input.sourceType, input.dailyWindowKey, now),
    env.DB.prepare(`UPDATE user_platform_progress SET
      total_xp=total_xp
        + COALESCE((SELECT amount FROM platform_xp_ledger WHERE event_id=?1 AND user_id=?4 AND organization_id=?5 AND applied_at IS NULL),0)
        + COALESCE((SELECT amount FROM platform_xp_ledger WHERE event_id=?2 AND user_id=?4 AND organization_id=?5 AND applied_at IS NULL),0),
      coins=coins+COALESCE((SELECT amount FROM platform_coin_ledger WHERE event_id=?3 AND user_id=?4 AND organization_id=?5 AND applied_at IS NULL),0),
      updated_at=?6 WHERE user_id=?4 AND organization_id=?5`)
      .bind(baseXpEventId, dailyEventId, coinEventId, input.userId, input.organizationId, now),
    env.DB.prepare("UPDATE platform_xp_ledger SET applied_at=?1 WHERE event_id IN (?2,?3) AND user_id=?4 AND organization_id=?5 AND applied_at IS NULL")
      .bind(now, baseXpEventId, dailyEventId, input.userId, input.organizationId),
    env.DB.prepare("UPDATE platform_coin_ledger SET applied_at=?1 WHERE event_id=?2 AND user_id=?3 AND organization_id=?4 AND applied_at IS NULL")
      .bind(now, coinEventId, input.userId, input.organizationId),
  ]);
  const appliedXpEntries = Number((results[5] as any)?.meta?.changes || 0);
  const appliedCoins = Number((results[6] as any)?.meta?.changes || 0) === 1;
  return {
    applied: appliedXpEntries > 0 || appliedCoins,
    dailyBonusApplied: appliedXpEntries === 2,
    progress: await getUserProgress(env, input.userId, input.organizationId),
  };
}

async function grant(env: AppEnv, ledger: "platform_xp_ledger" | "platform_coin_ledger", balance: "total_xp" | "coins", input: GrantInput) {
  validateGrant(input);
  const active = await env.DB.prepare(
    "SELECT id FROM users WHERE id=?1 AND organization_id=?2 AND status='active'",
  ).bind(input.userId, input.organizationId).first();
  if (!active) throw new Error("progress_user_unavailable");
  const now = Date.now();
  const results = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO user_platform_progress(user_id,organization_id,total_xp,coins,created_at,updated_at) VALUES(?1,?2,0,0,?3,?3) ON CONFLICT(user_id) DO NOTHING",
    ).bind(input.userId, input.organizationId, now),
    env.DB.prepare(
      `INSERT INTO ${ledger}(id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9) ON CONFLICT(event_id) DO NOTHING`,
    ).bind(crypto.randomUUID(), input.eventId, input.userId, input.organizationId, input.amount, input.reason.trim(), input.sourceType.trim(), input.sourceId || null, now),
    env.DB.prepare(
      `UPDATE user_platform_progress SET ${balance}=${balance}+?1,updated_at=?2 WHERE user_id=?3 AND organization_id=?4 AND EXISTS(SELECT 1 FROM ${ledger} WHERE event_id=?5 AND user_id=?3 AND organization_id=?4 AND applied_at IS NULL)`,
    ).bind(input.amount, now, input.userId, input.organizationId, input.eventId),
    env.DB.prepare(
      `UPDATE ${ledger} SET applied_at=?1 WHERE event_id=?2 AND user_id=?3 AND organization_id=?4 AND applied_at IS NULL`,
    ).bind(now, input.eventId, input.userId, input.organizationId),
  ]);
  return { applied: Number((results[2] as any)?.meta?.changes || 0) === 1, progress: await getUserProgress(env, input.userId, input.organizationId) };
}

export function grantXp(env: AppEnv, input: GrantInput) {
  return grant(env, "platform_xp_ledger", "total_xp", input);
}

export function grantCoins(env: AppEnv, input: GrantInput) {
  return grant(env, "platform_coin_ledger", "coins", input);
}
