import type { AppEnv } from "./auth";
import { progressFromBalances } from "./platform-progress";

export const PLATFORM_RANKING_GAMES = Object.freeze([
  { id: "quiz-biblico", name: "Quiz Bíblico", available: true, criterion: "Melhor pontuação em uma partida" },
  { id: "wordle-biblico", name: "Wordle Bíblico", available: true, criterion: "Melhor pontuação em uma partida" },
  { id: "linha-do-tempo-biblica", name: "Linha do Tempo Bíblica", available: true, criterion: "Melhor pontuação em uma partida" },
  { id: "memoria-biblica", name: "Memória Bíblica", available: true, criterion: "Melhor desempenho normalizado" },
  { id: "associacao-de-temas", name: "Associação de Temas", available: true, criterion: "Melhor desempenho normalizado" },
  { id: "quem-sou-eu", name: "Quem Sou Eu?", available: true, criterion: "Melhor desempenho normalizado" },
  { id: "jogo-tres-pistas", name: "Jogo das 3 Pistas", available: true, criterion: "Melhor desempenho normalizado" },
] as const);

export type RankingScope = "overall" | "weekly" | "game";
export type RankingRequest = { scope: RankingScope; gameId: string | null; limit: number };

type RankingRow = {
  position: number;
  userId: string;
  displayName: string;
  totalXp: number;
  value: number;
  sessionsCompleted: number | null;
  avatarId: string | null;
  frameId: string | null;
};

const IDENTITY_CTE = `identity AS (
  SELECT u.id userId,
    CASE WHEN u.use_nickname_in_ranking=1 AND TRIM(COALESCE(u.nickname,''))<>'' THEN u.nickname ELSE u.display_name END displayName,
    MAX(CASE WHEN equipment.reason='avatar' THEN equipment.source_id END) avatarId,
    MAX(CASE WHEN equipment.reason='frame' THEN equipment.source_id END) frameId
  FROM users u
  LEFT JOIN platform_coin_ledger equipment ON equipment.user_id=u.id AND equipment.organization_id=u.organization_id
    AND equipment.source_type='shop_equipment' AND equipment.applied_at IS NOT NULL
  WHERE u.organization_id=?1 AND u.status='active'
  GROUP BY u.id,u.nickname,u.use_nickname_in_ranking,u.display_name
)`;

function integer(value: unknown) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function publicRow(row: RankingRow, currentUserId: string) {
  const totalXp = integer(row.totalXp);
  return {
    position: integer(row.position),
    displayName: String(row.displayName || "Participante"),
    level: progressFromBalances(totalXp, 0).level,
    totalXp,
    value: integer(row.value),
    sessionsCompleted: row.sessionsCompleted == null ? null : integer(row.sessionsCompleted),
    equipment: { avatar: row.avatarId || null, frame: row.frameId || null },
    isCurrentUser: row.userId === currentUserId,
  };
}

/** Parses only the documented finite contract; no SQL fragment comes from the client. */
export function parseRankingRequest(url: URL): RankingRequest {
  const scope = url.searchParams.get("scope") || "overall";
  if (!(["overall", "weekly", "game"] as const).includes(scope as RankingScope)) throw new Error("invalid_ranking_scope");
  const rawLimit = url.searchParams.get("limit");
  const limit = rawLimit === null ? 10 : Number(rawLimit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 25) throw new Error("invalid_ranking_limit");
  const gameId = url.searchParams.get("gameId");
  if (scope === "game" && !PLATFORM_RANKING_GAMES.some(game => game.id === gameId)) throw new Error("invalid_ranking_game");
  return { scope: scope as RankingScope, gameId: scope === "game" ? gameId : null, limit };
}

function localParts(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(new Date(timestamp));
  const value = (type: string) => parts.find(part => part.type === type)?.value || "";
  return { year: Number(value("year")), month: Number(value("month")), day: Number(value("day")), weekday: value("weekday") };
}

function zonedMidnightUtc(year: number, month: number, day: number, timeZone: string) {
  const target = Date.UTC(year, month - 1, day);
  let candidate = target;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = formatter.formatToParts(new Date(candidate));
    const value = (type: string) => Number(parts.find(part => part.type === type)?.value || 0);
    const represented = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
    const correction = target - represented;
    candidate += correction;
    if (correction === 0) break;
  }
  return candidate;
}

export function organizationWeekWindow(now: number, timeZone: string) {
  const local = localParts(now, timeZone);
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(local.weekday);
  if (weekday < 0) throw new Error("invalid_organization_timezone");
  const mondayDate = new Date(Date.UTC(local.year, local.month - 1, local.day - weekday));
  const from = zonedMidnightUtc(mondayDate.getUTCFullYear(), mondayDate.getUTCMonth() + 1, mondayDate.getUTCDate(), timeZone);
  const nextMonday = new Date(Date.UTC(mondayDate.getUTCFullYear(), mondayDate.getUTCMonth(), mondayDate.getUTCDate() + 7));
  const to = zonedMidnightUtc(nextMonday.getUTCFullYear(), nextMonday.getUTCMonth() + 1, nextMonday.getUTCDate(), timeZone);
  return { from, to, timeZone };
}

function rankedSql(source: string) {
  return `WITH ${IDENTITY_CTE}, source AS (${source}), ranked AS (
    SELECT source.*,identity.displayName,identity.avatarId,identity.frameId,
      ROW_NUMBER() OVER (ORDER BY source.value DESC,source.secondary DESC,source.tieAt ASC,source.userId ASC) position
    FROM source JOIN identity ON identity.userId=source.userId
  ) SELECT position,userId,displayName,totalXp,value,sessionsCompleted,avatarId,frameId FROM ranked`;
}

async function queryRanking(env: AppEnv, sql: string, binds: unknown[], currentUserId: string, limit: number) {
  const top = await env.DB.prepare(`${sql} LIMIT ?${binds.length + 1}`).bind(...binds, limit).all<RankingRow>();
  const own = await env.DB.prepare(`${sql} WHERE userId=?${binds.length + 1}`)
    .bind(...binds, currentUserId).first<RankingRow>();
  const entries = (top.results || []).map(row => publicRow(row, currentUserId));
  return { entries, me: own ? publicRow(own, currentUserId) : null };
}

export async function getPlatformRanking(
  env: AppEnv,
  identity: { userId: string; organizationId: string },
  request: RankingRequest,
  now = Date.now(),
) {
  if (request.scope === "overall") {
    const sql = rankedSql(`SELECT p.user_id userId,p.total_xp totalXp,p.total_xp value,
      COALESCE(statistics.sessions_completed,0) secondary,p.created_at tieAt,NULL sessionsCompleted
      FROM user_platform_progress p LEFT JOIN user_platform_statistics statistics
        ON statistics.user_id=p.user_id AND statistics.organization_id=p.organization_id
      WHERE p.organization_id=?1`);
    const result = await queryRanking(env, sql, [identity.organizationId], identity.userId, request.limit);
    return { scope: "overall", criterion: "XP total acumulado", ...result, games: PLATFORM_RANKING_GAMES };
  }

  if (request.scope === "weekly") {
    const organization = await env.DB.prepare("SELECT timezone FROM organizations WHERE id=?1")
      .bind(identity.organizationId).first<{ timezone: string | null }>();
    if (!organization) throw new Error("ranking_organization_unavailable");
    const window = organizationWeekWindow(now, String(organization.timezone || "America/Sao_Paulo"));
    const sql = rankedSql(`SELECT ledger.user_id userId,MAX(progress.total_xp) totalXp,SUM(ledger.amount) value,
      MAX(progress.total_xp) secondary,MAX(ledger.applied_at) tieAt,NULL sessionsCompleted
      FROM platform_xp_ledger ledger JOIN user_platform_progress progress
        ON progress.user_id=ledger.user_id AND progress.organization_id=ledger.organization_id
      WHERE ledger.organization_id=?1 AND ledger.applied_at IS NOT NULL AND ledger.applied_at>=?2 AND ledger.applied_at<?3
      GROUP BY ledger.user_id`);
    const result = await queryRanking(env, sql, [identity.organizationId, window.from, window.to], identity.userId, request.limit);
    return { scope: "weekly", criterion: "XP ganho na semana", period: window, ...result, games: PLATFORM_RANKING_GAMES };
  }

  const game = PLATFORM_RANKING_GAMES.find(item => item.id === request.gameId)!;
  const normalized = ["memoria-biblica", "associacao-de-temas", "quem-sou-eu", "jogo-tres-pistas"].includes(game.id);
  const valueColumn = normalized ? "stats.best_normalized_performance" : "stats.best_score";
  const sql = rankedSql(`SELECT stats.user_id userId,progress.total_xp totalXp,${valueColumn} value,
    stats.sessions_completed secondary,stats.updated_at tieAt,stats.sessions_completed sessionsCompleted
    FROM user_platform_game_statistics stats JOIN user_platform_progress progress
      ON progress.user_id=stats.user_id AND progress.organization_id=stats.organization_id
    WHERE stats.organization_id=?1 AND stats.game_id=?2 AND stats.sessions_completed>0 AND ${valueColumn} IS NOT NULL`);
  const result = await queryRanking(env, sql, [identity.organizationId, game.id], identity.userId, request.limit);
  return { scope: "game", gameId: game.id, criterion: game.criterion,
    valueFormat: normalized ? "percentage" : "points", ...result, games: PLATFORM_RANKING_GAMES };
}
