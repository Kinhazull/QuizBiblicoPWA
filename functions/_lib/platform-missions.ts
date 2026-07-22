import type { AppEnv } from "./auth";
import { grantPlatformMissionReward } from "./platform-progress";

export type MissionState = "active" | "completed" | "claimed" | "expired";
export type MissionCadence = "daily" | "weekly";

type MissionReward = { xp: number; coins: number };
type MissionRow = {
  id: string; code: string; version: number; name: string; description: string; icon: string | null;
  cadence: MissionCadence; scopeType: "global" | "game"; gameId: string | null; target: number;
  progressUnit: string; rewardJson: string; state: MissionState; progress: number; expiresAt: number;
};

function token(value: string, error: string, max = 120) {
  const normalized = value.trim();
  if (!normalized || normalized.length > max || !/^[a-zA-Z0-9._:-]+$/.test(normalized)) throw new Error(error);
  return normalized;
}

function dateKey(at: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
}

function dailyWindow(at: number, timeZone: string) {
  const windowKey = dateKey(at, timeZone);
  let high = at + 60 * 60 * 1000;
  while (dateKey(high, timeZone) === windowKey && high < at + 32 * 60 * 60 * 1000) high += 60 * 60 * 1000;
  let low = high - 60 * 60 * 1000;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (dateKey(middle, timeZone) === windowKey) low = middle; else high = middle;
  }
  return { windowKey, expiresAt: high };
}

function reward(value: string): MissionReward {
  try {
    const parsed = JSON.parse(value || "{}");
    const xp = Number(parsed.xp || 0), coins = Number(parsed.coins || 0);
    if (!Number.isSafeInteger(xp) || xp < 0 || !Number.isSafeInteger(coins) || coins < 0) throw new Error();
    return { xp, coins };
  } catch { throw new Error("invalid_mission_reward"); }
}

function scopeKey(row: { scopeType: string; gameId?: string | null }) {
  return row.scopeType === "global" ? "global" : `game:${row.gameId}`;
}

function view(row: MissionRow) {
  const parsedReward = reward(row.rewardJson);
  const labels = [parsedReward.xp ? `+${parsedReward.xp} XP` : "", parsedReward.coins ? `+${parsedReward.coins} moedas` : ""].filter(Boolean);
  return {
    id: row.id, code: row.code, version: Number(row.version), name: row.name, description: row.description,
    icon: row.icon || null, cadence: row.cadence, scopeType: row.scopeType, gameId: row.gameId || null,
    state: row.state, progress: Number(row.progress), target: Number(row.target), progressUnit: row.progressUnit,
    expiresAt: Number(row.expiresAt), reward: { ...parsedReward, label: labels.join(" + ") || "Sem recompensa" },
  };
}

async function activeUser(env: AppEnv, userId: string, organizationId: string) {
  const row = await env.DB.prepare("SELECT u.id,o.timezone FROM users u JOIN organizations o ON o.id=u.organization_id WHERE u.id=?1 AND u.organization_id=?2 AND u.status='active'").bind(userId, organizationId).first<any>();
  if (!row) throw new Error("mission_user_unavailable");
  return row;
}

async function readAssignment(env: AppEnv, id: string, userId: string, organizationId: string) {
  return env.DB.prepare(`SELECT m.id,d.code,d.version,d.name,d.description,d.icon,d.cadence,d.scope_type scopeType,d.game_id gameId,
    m.target,d.progress_unit progressUnit,d.reward_json rewardJson,m.state,m.progress,m.expires_at expiresAt
    FROM user_platform_missions m JOIN platform_mission_definitions d ON d.id=m.definition_id
    WHERE m.id=?1 AND m.user_id=?2 AND m.organization_id=?3`).bind(id, userId, organizationId).first<MissionRow>();
}

export async function expireMissions(env: AppEnv, userId: string, organizationId: string, now = Date.now()) {
  return env.DB.prepare(`UPDATE user_platform_missions SET state='expired'
    WHERE user_id=?1 AND organization_id=?2 AND state='active' AND expires_at<=?3`).bind(userId, organizationId, now).run();
}

export async function getCurrentDailyMission(env: AppEnv, userId: string, organizationId: string, now = Date.now()) {
  const user = await activeUser(env, userId, organizationId);
  await expireMissions(env, userId, organizationId, now);
  const window = dailyWindow(now, user.timezone || "America/Sao_Paulo");
  const existing = await env.DB.prepare(`SELECT m.id FROM user_platform_missions m
    WHERE m.user_id=?1 AND m.organization_id=?2 AND m.cadence='daily' AND m.window_key=?3
    ORDER BY m.assigned_at LIMIT 1`).bind(userId, organizationId, window.windowKey).first<any>();
  if (existing) return view((await readAssignment(env, existing.id, userId, organizationId))!);
  const definition = await env.DB.prepare(`SELECT d.id,d.code,d.version,d.name,d.description,d.icon,d.cadence,d.scope_type scopeType,d.game_id gameId,d.target,d.progress_unit progressUnit,d.reward_json rewardJson
    FROM platform_mission_definitions d WHERE d.status='active' AND d.cadence='daily'
      AND (d.available_from IS NULL OR d.available_from<=?1) AND (d.available_until IS NULL OR d.available_until>?1)
      AND d.version=(SELECT MAX(v.version) FROM platform_mission_definitions v WHERE v.code=d.code AND v.status='active')
    ORDER BY d.code LIMIT 1`).bind(now).first<any>();
  if (!definition) return null;
  reward(definition.rewardJson);
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO user_platform_missions(id,user_id,organization_id,definition_id,mission_code,cadence,scope_key,window_key,target,progress,state,assigned_at,expires_at)
    VALUES(?1,?2,?3,?4,?5,'daily',?6,?7,?8,0,'active',?9,?10)
    ON CONFLICT(user_id,mission_code,scope_key,window_key) DO NOTHING`).bind(id, userId, organizationId, definition.id, definition.code, scopeKey(definition), window.windowKey, definition.target, now, window.expiresAt).run();
  const assigned = await env.DB.prepare("SELECT id FROM user_platform_missions WHERE user_id=?1 AND organization_id=?2 AND mission_code=?3 AND scope_key=?4 AND window_key=?5").bind(userId, organizationId, definition.code, scopeKey(definition), window.windowKey).first<any>();
  return view((await readAssignment(env, assigned.id, userId, organizationId))!);
}

export async function completeMission(env: AppEnv, assignmentId: string, userId: string, organizationId: string, now = Date.now()) {
  await env.DB.prepare("UPDATE user_platform_missions SET state='completed',completed_at=COALESCE(completed_at,?1) WHERE id=?2 AND user_id=?3 AND organization_id=?4 AND state='active' AND progress>=target AND expires_at>?1").bind(now, assignmentId, userId, organizationId).run();
  const row = await readAssignment(env, assignmentId, userId, organizationId);
  if (!row) throw new Error("mission_not_found");
  return view(row);
}

export async function recordMissionProgress(env: AppEnv, input: { assignmentId: string; userId: string; organizationId: string; eventId: string; amount: number; now?: number }) {
  const assignmentId = token(input.assignmentId, "invalid_mission_assignment");
  const eventId = token(input.eventId, "invalid_mission_event");
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > 1_000_000) throw new Error("invalid_mission_progress");
  await activeUser(env, input.userId, input.organizationId);
  const now = input.now ?? Date.now();
  await expireMissions(env, input.userId, input.organizationId, now);
  const before = await readAssignment(env, assignmentId, input.userId, input.organizationId);
  if (!before) throw new Error("mission_not_found");
  if (before.state !== "active") return view(before);
  const progressId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO user_platform_mission_progress_events(id,assignment_id,user_id,organization_id,event_id,amount,created_at)
      VALUES(?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(assignment_id,event_id) DO NOTHING`).bind(progressId, assignmentId, input.userId, input.organizationId, eventId, input.amount, now),
    env.DB.prepare(`UPDATE user_platform_missions SET progress=MIN(target,progress+?1),last_progress_at=?2
      WHERE id=?3 AND user_id=?4 AND organization_id=?5 AND state='active' AND expires_at>?2
      AND EXISTS(SELECT 1 FROM user_platform_mission_progress_events e WHERE e.assignment_id=?3 AND e.event_id=?6 AND e.applied_at IS NULL)`).bind(input.amount, now, assignmentId, input.userId, input.organizationId, eventId),
    env.DB.prepare("UPDATE user_platform_mission_progress_events SET applied_at=?1 WHERE assignment_id=?2 AND event_id=?3 AND applied_at IS NULL").bind(now, assignmentId, eventId),
  ]);
  return completeMission(env, assignmentId, input.userId, input.organizationId, now);
}

export async function claimMissionReward(env: AppEnv, assignmentIdValue: string, userId: string, organizationId: string, now = Date.now()) {
  const assignmentId = token(assignmentIdValue, "invalid_mission_assignment");
  await activeUser(env, userId, organizationId);
  const row = await readAssignment(env, assignmentId, userId, organizationId);
  if (!row) throw new Error("mission_not_found");
  if (row.state === "claimed") return view(row);
  if (row.state !== "completed") throw new Error("mission_not_claimable");
  const parsedReward = reward(row.rewardJson);
  await grantPlatformMissionReward(env, {
    identity: `mission:${assignmentId}:claim`,
    claimStatement: env.DB.prepare("UPDATE user_platform_missions SET state='claimed',claimed_at=COALESCE(claimed_at,?1) WHERE id=?2 AND user_id=?3 AND organization_id=?4 AND state='completed'").bind(now, assignmentId, userId, organizationId),
    userId,
    organizationId,
    assignmentId,
    missionCode: row.code,
    xpAmount: parsedReward.xp,
    coinAmount: parsedReward.coins,
  });
  return view((await readAssignment(env, assignmentId, userId, organizationId))!);
}
