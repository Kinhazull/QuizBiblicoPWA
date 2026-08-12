import type { AppEnv } from "./auth";
import { getLibraryHealth } from "./library-health";
import { getGameGenerationCapability } from "./universal-game-generation-capabilities";

export const PLATFORM_PLANNING_MAX_RANGE_DAYS = 184;
export const PLATFORM_PLANNING_DEFAULT_TIME_ZONE = "America/Sao_Paulo";
const DAY = 86_400_000;
const STATUSES = new Set(["DRAFT", "SCHEDULED", "ACTIVE", "FINISHED", "CANCELLED"]);

type Filters = { from: number; to: number; status?: string | null; gameType?: string | null; now?: number };
type Row = Record<string, unknown>;

function results<T>(value: D1Result<T>) { return value.results || []; }
function number(value: unknown) { return Number(value || 0); }

export async function getPlatformPlanningCalendar(env: AppEnv, organizationId: string, filters: Filters) {
  const { from, to } = filters;
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) throw new Error("invalid_planning_interval");
  if (to - from > PLATFORM_PLANNING_MAX_RANGE_DAYS * DAY) throw new Error("planning_interval_too_large");
  if (filters.status && !STATUSES.has(filters.status)) throw new Error("invalid_planning_status");
  if (filters.gameType && !getGameGenerationCapability(filters.gameType)) throw new Error("invalid_planning_game");
  const now = filters.now ?? Date.now();
  const statusClause = filters.status ? " AND event.status=?4" : " AND event.status IN ('DRAFT','SCHEDULED','ACTIVE')";
  const gameClause = filters.gameType ? ` AND EXISTS(SELECT 1 FROM platform_event_games filter_game
    WHERE filter_game.event_id=event.id AND filter_game.organization_id=event.organization_id AND filter_game.game_type=?${filters.status ? 5 : 4})` : "";
  const bindings: unknown[] = [organizationId, to, from];
  if (filters.status) bindings.push(filters.status);
  if (filters.gameType) bindings.push(filters.gameType);
  const windowWhere = `event.organization_id=?1 AND event.starts_at<?2 AND event.ends_at>?3${statusClause}${gameClause}`;

  const [eventRows, gameRows, reservationRows, reviewRow, conflictRows, health] = await Promise.all([
    env.DB.prepare(`SELECT event.id,event.title,event.description,event.starts_at startsAt,event.ends_at endsAt,
      event.time_zone timeZone,event.status,event.cover_asset_id coverAssetId,asset.status coverAssetStatus,
      event.participation_xp participationXp,event.victory_coins victoryCoins,
      event.completion_bonus_xp completionBonusXp,event.perfect_bonus_coins perfectBonusCoins
      FROM platform_events event LEFT JOIN asset_registry asset ON asset.id=event.cover_asset_id AND asset.organization_id=event.organization_id
      WHERE ${windowWhere} ORDER BY event.starts_at,event.id LIMIT 100`).bind(...bindings).all<Row>(),
    env.DB.prepare(`SELECT event.id eventId,game.game_type gameType,COUNT(content.content_id) selectedCount,
      SUM(CASE WHEN item.status='PUBLISHED' AND item.version=content.content_version
        AND library.availability_status IN ('AVAILABLE','RESERVED_EVENT') THEN 1 ELSE 0 END) validCount
      FROM platform_events event JOIN platform_event_games game ON game.event_id=event.id AND game.organization_id=event.organization_id
      LEFT JOIN platform_event_content_items content ON content.event_id=game.event_id AND content.organization_id=game.organization_id AND content.game_type=game.game_type
      LEFT JOIN content_items item ON item.id=content.content_id AND item.organization_id=content.organization_id
      LEFT JOIN universal_content_library library ON library.content_id=content.content_id AND library.content_version=content.content_version AND library.organization_id=content.organization_id
      WHERE ${windowWhere} GROUP BY event.id,game.game_type ORDER BY event.id,game.position`).bind(...bindings).all<Row>(),
    env.DB.prepare(`SELECT event.id eventId,content.game_type gameType,COUNT(reservation.id) total
      FROM platform_events event JOIN platform_event_content_reservations reservation ON reservation.event_id=event.id AND reservation.organization_id=event.organization_id
      JOIN platform_event_content_items content ON content.event_id=reservation.event_id AND content.organization_id=reservation.organization_id
        AND content.content_id=reservation.content_id AND content.content_version=reservation.content_version
      WHERE ${windowWhere} AND reservation.released_at IS NULL GROUP BY event.id,content.game_type ORDER BY event.id,content.game_type`).bind(...bindings).all<Row>(),
    env.DB.prepare("SELECT COUNT(*) total FROM content_items WHERE organization_id=?1 AND editorial_status='IN_REVIEW'").bind(organizationId).first<Row>(),
    env.DB.prepare(`SELECT left_reservation.event_id leftEventId,right_reservation.event_id rightEventId,COUNT(*) total
      FROM platform_event_content_reservations left_reservation JOIN platform_event_content_reservations right_reservation
       ON right_reservation.organization_id=left_reservation.organization_id AND right_reservation.id>left_reservation.id
       AND right_reservation.content_id=left_reservation.content_id AND right_reservation.content_version=left_reservation.content_version
       AND right_reservation.starts_at<left_reservation.ends_at AND right_reservation.ends_at>left_reservation.starts_at
      WHERE left_reservation.organization_id=?1 AND left_reservation.released_at IS NULL AND right_reservation.released_at IS NULL
      GROUP BY left_reservation.event_id,right_reservation.event_id`).bind(organizationId).all<Row>(),
    getLibraryHealth(env, organizationId, now),
  ]);

  const games = new Map<string, Array<{ gameType: string; selectedCount: number; validCount: number }>>();
  for (const row of results(gameRows)) games.set(String(row.eventId), [...(games.get(String(row.eventId)) || []), { gameType: String(row.gameType), selectedCount: number(row.selectedCount), validCount: number(row.validCount) }]);
  const reservations = new Map<string, Array<{ gameType: string; count: number }>>();
  for (const row of results(reservationRows)) reservations.set(String(row.eventId), [...(reservations.get(String(row.eventId)) || []), { gameType: String(row.gameType), count: number(row.total) }]);
  const conflicted = new Set(results(conflictRows).flatMap(row => [String(row.leftEventId), String(row.rightEventId)]));
  const events = results(eventRows).map(row => {
    const eventGames = games.get(String(row.id)) || [];
    const issues: Array<{ code: string; label: string }> = [];
    if (!eventGames.length) issues.push({ code: "games_required", label: "Selecione ao menos um jogo." });
    for (const game of eventGames) {
      const required = getGameGenerationCapability(game.gameType)?.minimumContents ?? 1;
      if (game.selectedCount < required) issues.push({ code: `content_missing:${game.gameType}`, label: `${game.gameType}: faltam conteúdos (${game.selectedCount}/${required}).` });
      else if (game.validCount < game.selectedCount) issues.push({ code: `content_invalid:${game.gameType}`, label: `${game.gameType}: há conteúdo indisponível ou inválido.` });
    }
    if (number(row.endsAt) <= number(row.startsAt)) issues.push({ code: "invalid_dates", label: "Revise o período do Evento." });
    if (conflicted.has(String(row.id))) issues.push({ code: "reservation_conflict", label: "Há conflito real de reserva." });
    return { id: String(row.id), title: String(row.title), description: String(row.description || ""), status: String(row.status), startsAt: number(row.startsAt), endsAt: number(row.endsAt), timeZone: String(row.timeZone || PLATFORM_PLANNING_DEFAULT_TIME_ZONE), coverAssetId: row.coverAssetId ? String(row.coverAssetId) : null, coverAssetStatus: row.coverAssetStatus ? String(row.coverAssetStatus) : null,
      rewards: { participationXp: number(row.participationXp), victoryCoins: number(row.victoryCoins), completionBonusXp: number(row.completionBonusXp), perfectBonusCoins: number(row.perfectBonusCoins) },
      games: eventGames, reservations: reservations.get(String(row.id)) || [], checklist: { ready: issues.length === 0, issues }, editorHref: "/admin/eventos" };
  });
  const upcoming = events.some(event => event.status !== "CANCELLED" && event.endsAt > now && event.startsAt < now + 14 * DAY);
  return {
    generatedAt: now, from, to, maxRangeDays: PLATFORM_PLANNING_MAX_RANGE_DAYS,
    timeZone: events[0]?.timeZone || PLATFORM_PLANNING_DEFAULT_TIME_ZONE,
    events,
    editorial: { awaitingReview: number(reviewRow?.total), insights: health.insights.filter(item => ["critical", "attention"].includes(item.severity)).slice(0, 6) },
    libraryHealth: health,
    summary: { totalEvents: events.length, reservations: [...reservations.values()].flat().reduce((sum, item) => sum + item.count, 0), noEventsNext14Days: !upcoming, conflicts: conflicted.size },
  };
}
