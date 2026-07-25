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

export type PlatformAchievementRewardInput = {
  identity: string;
  unlockId: string;
  unlockStatement: D1PreparedStatement;
  userId: string;
  organizationId: string;
  achievementCode: string;
  xpAmount: number;
  coinAmount: number;
};

export type PlatformMissionRewardInput = {
  identity: string;
  claimStatement: D1PreparedStatement;
  userId: string;
  organizationId: string;
  assignmentId: string;
  missionCode: string;
  xpAmount: number;
  coinAmount: number;
};

export type PlatformRetentionRewardInput = {
  identity: string;
  userId: string;
  organizationId: string;
  xpAmount: number;
  coinAmount: number;
  reason: string;
  sourceType: "daily_login" | "daily_chest";
  sourceId: string;
};

export type PlatformShopPurchaseInput = {
  itemId: string;
  itemName: string;
  price: number;
  userId: string;
  organizationId: string;
};

export type PlatformEquipmentInput = {
  itemId: string;
  category: "frame" | "avatar";
  userId: string;
  organizationId: string;
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

/** Executes an Achievement-owned unlock statement and its Progress-owned rewards as one D1 transaction. */
export async function grantPlatformAchievementReward(env: AppEnv, input: PlatformAchievementRewardInput) {
  if (!Number.isSafeInteger(input.xpAmount) || input.xpAmount < 1 || input.xpAmount > MAX_GRANT
    || !Number.isSafeInteger(input.coinAmount) || input.coinAmount < 1 || input.coinAmount > MAX_GRANT) {
    throw new Error("invalid_achievement_reward");
  }
  const xpEventId = await compactEventId("achievement-xp", input.identity);
  const coinEventId = await compactEventId("achievement-coins", input.identity);
  const reason = `Conquista: ${input.achievementCode}`;
  const sourceType = "platform_achievement";
  const expectedBase = {
    userId: input.userId, organizationId: input.organizationId, reason,
    sourceType, sourceId: input.achievementCode,
  };
  assertExpectedLedger(await existingLedger(env, "platform_xp_ledger", xpEventId), {
    ...expectedBase, eventId: xpEventId, amount: input.xpAmount,
  });
  assertExpectedLedger(await existingLedger(env, "platform_coin_ledger", coinEventId), {
    ...expectedBase, eventId: coinEventId, amount: input.coinAmount,
  });

  const now = Date.now();
  const results = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO user_platform_progress(user_id,organization_id,total_xp,coins,created_at,updated_at) VALUES(?1,?2,0,0,?3,?3) ON CONFLICT(user_id) DO NOTHING",
    ).bind(input.userId, input.organizationId, now),
    input.unlockStatement,
    env.DB.prepare(`INSERT INTO platform_xp_ledger(id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at)
      SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9 WHERE EXISTS(
        SELECT 1 FROM user_platform_achievements WHERE id=?10 AND user_id=?3 AND organization_id=?4
      ) ON CONFLICT(event_id) DO NOTHING`).bind(
      crypto.randomUUID(), xpEventId, input.userId, input.organizationId, input.xpAmount,
      reason, sourceType, input.achievementCode, now, input.unlockId,
    ),
    env.DB.prepare(`INSERT INTO platform_coin_ledger(id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at)
      SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9 WHERE EXISTS(
        SELECT 1 FROM user_platform_achievements WHERE id=?10 AND user_id=?3 AND organization_id=?4
      ) ON CONFLICT(event_id) DO NOTHING`).bind(
      crypto.randomUUID(), coinEventId, input.userId, input.organizationId, input.coinAmount,
      reason, sourceType, input.achievementCode, now, input.unlockId,
    ),
    env.DB.prepare(`UPDATE user_platform_progress SET
      total_xp=total_xp+COALESCE((SELECT amount FROM platform_xp_ledger WHERE event_id=?1 AND applied_at IS NULL),0),
      coins=coins+COALESCE((SELECT amount FROM platform_coin_ledger WHERE event_id=?2 AND applied_at IS NULL),0),
      updated_at=?3 WHERE user_id=?4 AND organization_id=?5`).bind(
      xpEventId, coinEventId, now, input.userId, input.organizationId,
    ),
    env.DB.prepare("UPDATE platform_xp_ledger SET applied_at=?1 WHERE event_id=?2 AND user_id=?3 AND organization_id=?4 AND applied_at IS NULL")
      .bind(now, xpEventId, input.userId, input.organizationId),
    env.DB.prepare("UPDATE platform_coin_ledger SET applied_at=?1 WHERE event_id=?2 AND user_id=?3 AND organization_id=?4 AND applied_at IS NULL")
      .bind(now, coinEventId, input.userId, input.organizationId),
  ]);
  return {
    unlocked: Number((results[1] as any)?.meta?.changes || 0) === 1,
    rewarded: Number((results[5] as any)?.meta?.changes || 0) === 1
      && Number((results[6] as any)?.meta?.changes || 0) === 1,
    progress: await getUserProgress(env, input.userId, input.organizationId),
  };
}

/** Applies one Mission claim and its Progress-owned rewards in the same D1 batch. */
export async function grantPlatformMissionReward(env: AppEnv, input: PlatformMissionRewardInput) {
  if (!Number.isSafeInteger(input.xpAmount) || input.xpAmount < 0 || input.xpAmount > MAX_GRANT
    || !Number.isSafeInteger(input.coinAmount) || input.coinAmount < 0 || input.coinAmount > MAX_GRANT) {
    throw new Error("invalid_mission_reward");
  }
  const xpEventId = await compactEventId("mission-xp", input.identity);
  const coinEventId = await compactEventId("mission-coins", input.identity);
  const reason = `Missão: ${input.missionCode}`;
  const sourceType = "mission";
  const expectedBase = {
    userId: input.userId, organizationId: input.organizationId, reason,
    sourceType, sourceId: input.assignmentId,
  };
  if (input.xpAmount) assertExpectedLedger(await existingLedger(env, "platform_xp_ledger", xpEventId), {
    ...expectedBase, eventId: xpEventId, amount: input.xpAmount,
  });
  if (input.coinAmount) assertExpectedLedger(await existingLedger(env, "platform_coin_ledger", coinEventId), {
    ...expectedBase, eventId: coinEventId, amount: input.coinAmount,
  });

  const now = Date.now();
  const results = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO user_platform_progress(user_id,organization_id,total_xp,coins,created_at,updated_at) VALUES(?1,?2,0,0,?3,?3) ON CONFLICT(user_id) DO NOTHING",
    ).bind(input.userId, input.organizationId, now),
    input.claimStatement,
    env.DB.prepare(`INSERT INTO platform_xp_ledger(id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at)
      SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9 WHERE ?5>0 AND EXISTS(
        SELECT 1 FROM user_platform_missions WHERE id=?10 AND user_id=?3 AND organization_id=?4 AND state='claimed'
      ) ON CONFLICT(event_id) DO NOTHING`).bind(
      crypto.randomUUID(), xpEventId, input.userId, input.organizationId, input.xpAmount,
      reason, sourceType, input.assignmentId, now, input.assignmentId,
    ),
    env.DB.prepare(`INSERT INTO platform_coin_ledger(id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at)
      SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9 WHERE ?5>0 AND EXISTS(
        SELECT 1 FROM user_platform_missions WHERE id=?10 AND user_id=?3 AND organization_id=?4 AND state='claimed'
      ) ON CONFLICT(event_id) DO NOTHING`).bind(
      crypto.randomUUID(), coinEventId, input.userId, input.organizationId, input.coinAmount,
      reason, sourceType, input.assignmentId, now, input.assignmentId,
    ),
    env.DB.prepare(`UPDATE user_platform_progress SET
      total_xp=total_xp+COALESCE((SELECT amount FROM platform_xp_ledger WHERE event_id=?1 AND applied_at IS NULL),0),
      coins=coins+COALESCE((SELECT amount FROM platform_coin_ledger WHERE event_id=?2 AND applied_at IS NULL),0),
      updated_at=?3 WHERE user_id=?4 AND organization_id=?5`).bind(
      xpEventId, coinEventId, now, input.userId, input.organizationId,
    ),
    env.DB.prepare("UPDATE platform_xp_ledger SET applied_at=?1 WHERE event_id=?2 AND user_id=?3 AND organization_id=?4 AND applied_at IS NULL")
      .bind(now, xpEventId, input.userId, input.organizationId),
    env.DB.prepare("UPDATE platform_coin_ledger SET applied_at=?1 WHERE event_id=?2 AND user_id=?3 AND organization_id=?4 AND applied_at IS NULL")
      .bind(now, coinEventId, input.userId, input.organizationId),
  ]);
  return {
    claimed: Number((results[1] as any)?.meta?.changes || 0) === 1,
    rewarded: Number((results[5] as any)?.meta?.changes || 0) === 1
      || Number((results[6] as any)?.meta?.changes || 0) === 1,
    progress: await getUserProgress(env, input.userId, input.organizationId),
  };
}

/** Applies a daily retention reward atomically through the existing Progress ledgers. */
export async function grantPlatformRetentionReward(env: AppEnv, input: PlatformRetentionRewardInput) {
  if (!Number.isSafeInteger(input.xpAmount) || input.xpAmount < 0 || input.xpAmount > MAX_GRANT
    || !Number.isSafeInteger(input.coinAmount) || input.coinAmount < 0 || input.coinAmount > MAX_GRANT
    || input.xpAmount + input.coinAmount < 1) {
    throw new Error("invalid_retention_reward");
  }
  const xpEventId = await compactEventId("retention-xp", input.identity);
  const coinEventId = await compactEventId("retention-coins", input.identity);
  const base = {
    userId: input.userId,
    organizationId: input.organizationId,
    reason: input.reason,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
  };
  if (input.xpAmount) assertExpectedLedger(await existingLedger(env, "platform_xp_ledger", xpEventId), {
    ...base, eventId: xpEventId, amount: input.xpAmount,
  });
  if (input.coinAmount) assertExpectedLedger(await existingLedger(env, "platform_coin_ledger", coinEventId), {
    ...base, eventId: coinEventId, amount: input.coinAmount,
  });
  const active = await env.DB.prepare(
    "SELECT id FROM users WHERE id=?1 AND organization_id=?2 AND status='active'",
  ).bind(input.userId, input.organizationId).first();
  if (!active) throw new Error("progress_user_unavailable");

  const now = Date.now();
  const results = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO user_platform_progress(user_id,organization_id,total_xp,coins,created_at,updated_at) VALUES(?1,?2,0,0,?3,?3) ON CONFLICT(user_id) DO NOTHING",
    ).bind(input.userId, input.organizationId, now),
    env.DB.prepare(`INSERT INTO platform_xp_ledger(id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at)
      SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9 WHERE ?5>0 ON CONFLICT(event_id) DO NOTHING`)
      .bind(crypto.randomUUID(), xpEventId, input.userId, input.organizationId, input.xpAmount, input.reason, input.sourceType, input.sourceId, now),
    env.DB.prepare(`INSERT INTO platform_coin_ledger(id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at)
      SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9 WHERE ?5>0 ON CONFLICT(event_id) DO NOTHING`)
      .bind(crypto.randomUUID(), coinEventId, input.userId, input.organizationId, input.coinAmount, input.reason, input.sourceType, input.sourceId, now),
    env.DB.prepare(`UPDATE user_platform_progress SET
      total_xp=total_xp+COALESCE((SELECT amount FROM platform_xp_ledger WHERE event_id=?1 AND user_id=?4 AND organization_id=?5 AND applied_at IS NULL),0),
      coins=coins+COALESCE((SELECT amount FROM platform_coin_ledger WHERE event_id=?2 AND user_id=?4 AND organization_id=?5 AND applied_at IS NULL),0),
      updated_at=?3 WHERE user_id=?4 AND organization_id=?5`)
      .bind(xpEventId, coinEventId, now, input.userId, input.organizationId),
    env.DB.prepare("UPDATE platform_xp_ledger SET applied_at=?1 WHERE event_id=?2 AND user_id=?3 AND organization_id=?4 AND applied_at IS NULL")
      .bind(now, xpEventId, input.userId, input.organizationId),
    env.DB.prepare("UPDATE platform_coin_ledger SET applied_at=?1 WHERE event_id=?2 AND user_id=?3 AND organization_id=?4 AND applied_at IS NULL")
      .bind(now, coinEventId, input.userId, input.organizationId),
  ]);
  return {
    applied: Number((results[3] as any)?.meta?.changes || 0) === 1
      && (Number((results[4] as any)?.meta?.changes || 0) === 1 || Number((results[5] as any)?.meta?.changes || 0) === 1),
    progress: await getUserProgress(env, input.userId, input.organizationId),
  };
}

/** Debits coins and records item ownership in the existing coin ledger atomically. */
export async function purchasePlatformItem(env: AppEnv, input: PlatformShopPurchaseInput) {
  if (!/^[a-z0-9-]{3,80}$/.test(input.itemId)
    || !input.itemName.trim() || input.itemName.length > 100
    || !Number.isSafeInteger(input.price) || input.price < 1 || input.price > MAX_GRANT) {
    throw new Error("invalid_shop_item");
  }
  const eventId = await compactEventId(
    "shop-purchase",
    `${input.organizationId}:${input.userId}:${input.itemId}`,
  );
  const reason = `Compra: ${input.itemName}`;
  const expected = {
    eventId,
    userId: input.userId,
    organizationId: input.organizationId,
    amount: input.price,
    reason,
    sourceType: "shop_purchase",
    sourceId: input.itemId,
  };
  const current = await existingLedger(env, "platform_coin_ledger", eventId);
  assertExpectedLedger(current, expected);
  if (current?.appliedAt) {
    return { purchased: false, owned: true, progress: await getUserProgress(env, input.userId, input.organizationId) };
  }
  const active = await env.DB.prepare(
    "SELECT id FROM users WHERE id=?1 AND organization_id=?2 AND status='active'",
  ).bind(input.userId, input.organizationId).first();
  if (!active) throw new Error("progress_user_unavailable");

  const now = Date.now();
  const results = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO user_platform_progress(user_id,organization_id,total_xp,coins,created_at,updated_at) VALUES(?1,?2,0,0,?3,?3) ON CONFLICT(user_id) DO NOTHING",
    ).bind(input.userId, input.organizationId, now),
    env.DB.prepare(`INSERT INTO platform_coin_ledger(id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at)
      SELECT ?1,?2,?3,?4,?5,?6,'shop_purchase',?7,?8
      WHERE EXISTS(SELECT 1 FROM user_platform_progress
        WHERE user_id=?3 AND organization_id=?4 AND coins>=?5)
      ON CONFLICT(event_id) DO NOTHING`)
      .bind(crypto.randomUUID(), eventId, input.userId, input.organizationId, input.price, reason, input.itemId, now),
    env.DB.prepare(`UPDATE user_platform_progress SET
      coins=coins-COALESCE((SELECT amount FROM platform_coin_ledger
        WHERE event_id=?1 AND user_id=?2 AND organization_id=?3 AND applied_at IS NULL),0),
      updated_at=?4
      WHERE user_id=?2 AND organization_id=?3`)
      .bind(eventId, input.userId, input.organizationId, now),
    env.DB.prepare(`UPDATE platform_coin_ledger SET applied_at=?1
      WHERE event_id=?2 AND user_id=?3 AND organization_id=?4 AND applied_at IS NULL`)
      .bind(now, eventId, input.userId, input.organizationId),
  ]);
  const purchased = Number((results[3] as any)?.meta?.changes || 0) === 1;
  if (!purchased) {
    const raced = await existingLedger(env, "platform_coin_ledger", eventId);
    if (!raced?.appliedAt) throw new Error("insufficient_coins");
    assertExpectedLedger(raced, expected);
  }
  return {
    purchased,
    owned: true,
    progress: await getUserProgress(env, input.userId, input.organizationId),
  };
}

export async function getOwnedPlatformItemIds(env: AppEnv, userId: string, organizationId: string) {
  const rows = await env.DB.prepare(`SELECT source_id itemId FROM platform_coin_ledger
    WHERE user_id=?1 AND organization_id=?2 AND source_type='shop_purchase' AND applied_at IS NOT NULL
    ORDER BY created_at ASC`).bind(userId, organizationId).all<any>();
  return rows.results.map(row => String(row.itemId));
}

export async function getPlatformEquipment(env: AppEnv, userId: string, organizationId: string) {
  const rows = await env.DB.prepare(`SELECT reason category,source_id itemId
    FROM platform_coin_ledger
    WHERE user_id=?1 AND organization_id=?2 AND source_type='shop_equipment'
      AND reason IN ('frame','avatar') AND applied_at IS NOT NULL`)
    .bind(userId, organizationId).all<any>();
  const equipment: { frame: string | null; avatar: string | null } = { frame: null, avatar: null };
  for (const row of rows.results) {
    const category = String(row.category);
    if (category === "frame" || category === "avatar") equipment[category] = String(row.itemId);
  }
  return equipment;
}

/** Persists one current item per category without changing the coin balance. */
export async function equipPlatformItem(env: AppEnv, input: PlatformEquipmentInput) {
  if (!/^[a-z0-9-]{3,80}$/.test(input.itemId)
    || !["frame", "avatar"].includes(input.category)) throw new Error("invalid_shop_item");
  const owned = await env.DB.prepare(`SELECT 1 owned FROM platform_coin_ledger
    WHERE user_id=?1 AND organization_id=?2 AND source_type='shop_purchase'
      AND source_id=?3 AND applied_at IS NOT NULL`)
    .bind(input.userId, input.organizationId, input.itemId).first();
  if (!owned) throw new Error("shop_item_not_owned");

  const eventId = await compactEventId(
    "shop-equipment",
    `${input.organizationId}:${input.userId}:${input.category}`,
  );
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO platform_coin_ledger(
      id,event_id,user_id,organization_id,amount,reason,source_type,source_id,created_at,applied_at
    ) VALUES(?1,?2,?3,?4,1,?5,'shop_equipment',?6,?7,?7)
    ON CONFLICT(event_id) DO UPDATE SET
      source_id=excluded.source_id,applied_at=excluded.applied_at
    WHERE platform_coin_ledger.user_id=excluded.user_id
      AND platform_coin_ledger.organization_id=excluded.organization_id
      AND platform_coin_ledger.source_type='shop_equipment'
      AND platform_coin_ledger.reason=excluded.reason`)
    .bind(crypto.randomUUID(), eventId, input.userId, input.organizationId, input.category, input.itemId, now)
    .run();
  return getPlatformEquipment(env, input.userId, input.organizationId);
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
