import type { AppEnv } from "./auth";

export type AchievementScope = "global" | "game";

export type AchievementView = {
  code: string;
  version: number;
  name: string;
  description: string;
  icon: string | null;
  scopeType: AchievementScope;
  gameId: string | null;
  secret: boolean;
  criterion: unknown | null;
  unlocked: boolean;
  unlockedAt: number | null;
};

type UnlockInput = {
  userId: string;
  organizationId: string;
  achievementCode: string;
  sourceEventId: string;
  scopeKey?: string;
};

function safeJson(value: unknown) {
  try { return JSON.parse(String(value || "{}")); } catch { return {}; }
}

function validateToken(value: string, error: string, max = 120) {
  const normalized = value.trim();
  if (!normalized || normalized.length > max || !/^[a-zA-Z0-9._:-]+$/.test(normalized)) throw new Error(error);
  return normalized;
}

export async function listAchievements(env: AppEnv, userId: string, organizationId: string): Promise<AchievementView[]> {
  const result = await env.DB.prepare(
    `WITH visible AS (
       SELECT d.* FROM platform_achievement_definitions d
        WHERE d.status='active'
          AND d.version=(SELECT MAX(current.version) FROM platform_achievement_definitions current WHERE current.code=d.code AND current.status='active')
       UNION ALL
       SELECT historical.* FROM platform_achievement_definitions historical
       JOIN user_platform_achievements owned ON owned.definition_id=historical.id AND owned.user_id=?1 AND owned.organization_id=?2
        WHERE NOT EXISTS(SELECT 1 FROM platform_achievement_definitions active WHERE active.code=historical.code AND active.status='active')
     )
     SELECT d.code,d.version,d.name,d.description,d.icon,d.scope_type scopeType,d.game_id gameId,d.criterion_json criterionJson,d.secret,
            ua.unlocked_at unlockedAt
       FROM visible d
       LEFT JOIN user_platform_achievements ua
         ON ua.achievement_code=d.code AND ua.user_id=?1 AND ua.organization_id=?2
      ORDER BY d.scope_type,d.code,d.version DESC`,
  ).bind(userId, organizationId).all<any>();
  const seen = new Set<string>();
  const views: AchievementView[] = [];
  for (const row of result.results || []) {
    if (seen.has(row.code)) continue;
    seen.add(row.code);
    const unlocked = row.unlockedAt !== null && row.unlockedAt !== undefined;
    views.push({
      code: row.code,
      version: Number(row.version),
      name: row.secret && !unlocked ? "Conquista secreta" : row.name,
      description: row.secret && !unlocked ? "Continue explorando a plataforma para descobrir." : row.description,
      icon: row.secret && !unlocked ? null : row.icon || null,
      scopeType: row.scopeType,
      gameId: row.gameId || null,
      secret: Boolean(row.secret),
      criterion: row.secret && !unlocked ? null : safeJson(row.criterionJson),
      unlocked,
      unlockedAt: unlocked ? Number(row.unlockedAt) : null,
    });
  }
  return views;
}

export async function getAchievementSummary(env: AppEnv, userId: string, organizationId: string) {
  const achievements = await listAchievements(env, userId, organizationId);
  const unlocked = achievements.filter(item => item.unlocked).length;
  return { total: achievements.length, unlocked, pending: achievements.length - unlocked };
}

export async function unlockAchievement(env: AppEnv, input: UnlockInput) {
  const code = validateToken(input.achievementCode, "invalid_achievement_code", 80);
  const sourceEventId = validateToken(input.sourceEventId, "invalid_achievement_event");
  const user = await env.DB.prepare(
    "SELECT id FROM users WHERE id=?1 AND organization_id=?2 AND status='active'",
  ).bind(input.userId, input.organizationId).first();
  if (!user) throw new Error("achievement_user_unavailable");
  const definition = await env.DB.prepare(
    `SELECT id,code,version,name,scope_type scopeType,game_id gameId
       FROM platform_achievement_definitions
      WHERE code=?1 AND status='active'
      ORDER BY version DESC LIMIT 1`,
  ).bind(code).first<any>();
  if (!definition) throw new Error("achievement_not_found");
  const expectedScope = definition.scopeType === "global" ? "global" : `game:${definition.gameId}`;
  const scopeKey = input.scopeKey ? validateToken(input.scopeKey, "invalid_achievement_scope") : expectedScope;
  if (scopeKey !== expectedScope) throw new Error("invalid_achievement_scope");
  const now = Date.now();
  const id = crypto.randomUUID();
  const inserted = await env.DB.prepare(
    `INSERT INTO user_platform_achievements(id,user_id,organization_id,definition_id,achievement_code,scope_key,source_event_id,unlocked_at)
     VALUES(?1,?2,?3,?4,?5,?6,?7,?8)
     ON CONFLICT(user_id,achievement_code,scope_key) DO NOTHING`,
  ).bind(id, input.userId, input.organizationId, definition.id, code, scopeKey, sourceEventId, now).run();
  const persisted = await env.DB.prepare(
    `SELECT id,source_event_id sourceEventId,unlocked_at unlockedAt
       FROM user_platform_achievements
      WHERE user_id=?1 AND organization_id=?2 AND achievement_code=?3 AND scope_key=?4`,
  ).bind(input.userId, input.organizationId, code, scopeKey).first<any>();
  const unlocked = Number((inserted as any)?.meta?.changes || 0) === 1;
  return {
    unlocked,
    achievement: { code: definition.code, version: Number(definition.version), name: definition.name, scopeType: definition.scopeType, gameId: definition.gameId || null },
    record: persisted,
    domainEvent: unlocked ? { type: "achievement.unlocked.v1", eventId: sourceEventId, userId: input.userId, organizationId: input.organizationId, achievementCode: code, scopeKey, occurredAt: now } : null,
  };
}
