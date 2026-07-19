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
