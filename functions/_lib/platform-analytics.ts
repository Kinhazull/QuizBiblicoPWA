import type { AppEnv } from "./auth";

export const PLATFORM_GAME_TYPES = [
  "quiz-biblico", "wordle-biblico", "linha-do-tempo-biblica", "memoria-biblica",
  "associacao-de-temas", "quem-sou-eu", "jogo-tres-pistas",
] as const;
export type AnalyticsPeriodKey = "today" | "7d" | "30d" | "custom";
export type AnalyticsPeriod = { key: AnalyticsPeriodKey; from: number; to: number };

const DAY = 86_400_000;
const MAX_RANGE = 90 * DAY;
const number = (value: unknown) => Number(value || 0);
const rate = (part: number, total: number) => total ? Math.round(part * 10_000 / total) / 100 : 0;

export function parseAnalyticsPeriod(url: URL, now = Date.now()): AnalyticsPeriod {
  const key = (url.searchParams.get("period") || "7d") as AnalyticsPeriodKey;
  if (!(["today", "7d", "30d", "custom"] as string[]).includes(key)) throw new Error("analytics_invalid_period");
  let from: number;
  let to = now;
  if (key === "today") { const date = new Date(now); date.setHours(0, 0, 0, 0); from = date.getTime(); }
  else if (key === "7d") from = now - 7 * DAY;
  else if (key === "30d") from = now - 30 * DAY;
  else {
    from = Number(url.searchParams.get("from"));
    to = Number(url.searchParams.get("to"));
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to || to - from > MAX_RANGE || to > now + DAY) {
      throw new Error("analytics_invalid_period");
    }
  }
  return { key, from, to };
}

type ParticipationRow = { mode: string; gameType: string; players: number; started: number; completed: number; abandoned: number; wins: number; losses: number; durationTotal: number; durationCount: number };

function summarize(rows: ParticipationRow[]) {
  const aggregate = rows.reduce((sum, row) => ({
    players: sum.players + number(row.players), started: sum.started + number(row.started), completed: sum.completed + number(row.completed),
    abandoned: sum.abandoned + number(row.abandoned), wins: sum.wins + number(row.wins), losses: sum.losses + number(row.losses),
    durationTotal: sum.durationTotal + number(row.durationTotal), durationCount: sum.durationCount + number(row.durationCount),
  }), { players: 0, started: 0, completed: 0, abandoned: 0, wins: 0, losses: 0, durationTotal: 0, durationCount: 0 });
  return { ...aggregate, completionRate: rate(aggregate.completed, aggregate.started), winRate: rate(aggregate.wins, aggregate.completed),
    averageDurationMs: aggregate.durationCount ? Math.round(aggregate.durationTotal / aggregate.durationCount) : null };
}

export async function getPlatformAnalytics(env: AppEnv, organizationId: string, period: AnalyticsPeriod) {
  const generated = await env.DB.prepare(`SELECT p.mode mode,p.game_type gameType,COUNT(DISTINCT p.user_id) players,
    SUM(CASE WHEN p.started_at IS NOT NULL THEN 1 ELSE 0 END) started,
    SUM(CASE WHEN p.status='FINISHED' THEN 1 ELSE 0 END) completed,SUM(CASE WHEN p.status='EXPIRED' AND p.started_at IS NOT NULL THEN 1 ELSE 0 END) abandoned,
    SUM(CASE WHEN p.status='FINISHED' AND CAST(json_extract(e.payload_json,'$.correctAnswers') AS INTEGER)=CAST(json_extract(e.payload_json,'$.questionsAnswered') AS INTEGER) THEN 1 ELSE 0 END) wins,
    SUM(CASE WHEN p.status='FINISHED' AND CAST(json_extract(e.payload_json,'$.correctAnswers') AS INTEGER)<CAST(json_extract(e.payload_json,'$.questionsAnswered') AS INTEGER) THEN 1 ELSE 0 END) losses,
    COALESCE(SUM(CASE WHEN p.finished_at IS NOT NULL AND p.started_at IS NOT NULL THEN p.finished_at-p.started_at ELSE 0 END),0) durationTotal,
    SUM(CASE WHEN p.finished_at IS NOT NULL AND p.started_at IS NOT NULL THEN 1 ELSE 0 END) durationCount
    FROM generated_game_participations p LEFT JOIN core_platform_events e ON e.event_id=p.finish_event_id AND e.organization_id=p.organization_id
    WHERE p.organization_id=?1 AND COALESCE(p.started_at,p.created_at)>=?2 AND COALESCE(p.started_at,p.created_at)<?3 GROUP BY p.mode,p.game_type`)
    .bind(organizationId, period.from, period.to).all<ParticipationRow>();
  const event = await env.DB.prepare(`SELECT 'EVENT' mode,p.game_type gameType,COUNT(DISTINCT p.user_id) players,
    SUM(CASE WHEN p.started_at IS NOT NULL THEN 1 ELSE 0 END) started,SUM(CASE WHEN p.status='FINISHED' THEN 1 ELSE 0 END) completed,
    SUM(CASE WHEN p.status='EXPIRED' AND p.started_at IS NOT NULL THEN 1 ELSE 0 END) abandoned,
    SUM(CASE WHEN p.outcome='won' THEN 1 ELSE 0 END) wins,SUM(CASE WHEN p.outcome='lost' THEN 1 ELSE 0 END) losses,
    COALESCE(SUM(CASE WHEN p.finished_at IS NOT NULL AND p.started_at IS NOT NULL THEN p.finished_at-p.started_at ELSE 0 END),0) durationTotal,
    SUM(CASE WHEN p.finished_at IS NOT NULL AND p.started_at IS NOT NULL THEN 1 ELSE 0 END) durationCount
    FROM platform_event_participations p WHERE p.organization_id=?1 AND COALESCE(p.started_at,p.created_at)>=?2 AND COALESCE(p.started_at,p.created_at)<?3 GROUP BY p.game_type`)
    .bind(organizationId, period.from, period.to).all<ParticipationRow>();
  const rows = [...(generated.results || []), ...(event.results || [])];

  const [playerCounts, dailyUsers, dailyOpened, content, usage, usageDetails, activeDays, retention, economy, rewards, topItems, eventSummary] = await Promise.all([
    env.DB.prepare(`WITH activity AS (
      SELECT mode,game_type gameType,user_id userId FROM generated_game_participations WHERE organization_id=?1 AND started_at>=?2 AND started_at<?3
      UNION ALL SELECT 'EVENT',game_type,user_id FROM platform_event_participations WHERE organization_id=?1 AND started_at>=?2 AND started_at<?3
    ) SELECT 'overview' dimension,'all' key,COUNT(DISTINCT userId) players FROM activity
      UNION ALL SELECT 'mode',mode,COUNT(DISTINCT userId) FROM activity GROUP BY mode
      UNION ALL SELECT 'game',gameType,COUNT(DISTINCT userId) FROM activity GROUP BY gameType`).bind(organizationId, period.from, period.to).all<any>(),
    env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN won>=3 THEN user_id END) completed3,COUNT(DISTINCT CASE WHEN won>=7 THEN user_id END) completed7 FROM
      (SELECT p.user_id,COUNT(DISTINCT CASE WHEN p.status='FINISHED' AND CAST(json_extract(e.payload_json,'$.correctAnswers') AS INTEGER)>0 THEN p.game_type END) won
       FROM generated_game_participations p LEFT JOIN core_platform_events e ON e.event_id=p.finish_event_id AND e.organization_id=p.organization_id
      WHERE p.organization_id=?1 AND p.mode='DAILY' AND p.finished_at>=?2 AND p.finished_at<?3 GROUP BY p.user_id)`).bind(organizationId, period.from, period.to).first<any>(),
    env.DB.prepare(`SELECT COUNT(DISTINCT user_id) users,COUNT(*) opens FROM core_platform_events
      WHERE organization_id=?1 AND event_type='DAILY_OPENED' AND occurred_at>=?2 AND occurred_at<?3`)
      .bind(organizationId, period.from, period.to).first<any>(),
    env.DB.prepare(`SELECT i.game_type gameType,SUM(CASE WHEN i.status='PUBLISHED' THEN 1 ELSE 0 END) published,
      SUM(CASE WHEN l.availability_status='AVAILABLE' THEN 1 ELSE 0 END) available,SUM(CASE WHEN l.availability_status='RESERVED_EVENT' THEN 1 ELSE 0 END) reservedEvent,
      SUM(CASE WHEN l.usage_count=0 THEN 1 ELSE 0 END) neverUsed FROM content_items i LEFT JOIN universal_content_library l ON i.id=l.content_id AND i.organization_id=l.organization_id
      WHERE i.organization_id=?1 GROUP BY i.game_type`).bind(organizationId).all<any>(),
    env.DB.prepare(`SELECT p.game_type gameType,COUNT(DISTINCT u.content_id) used FROM generated_game_participation_usage u JOIN generated_game_participations p ON p.id=u.participation_id AND p.organization_id=u.organization_id
      WHERE u.organization_id=?1 AND u.recorded_at>=?2 AND u.recorded_at<?3 GROUP BY p.game_type`).bind(organizationId, period.from, period.to).all<any>(),
    env.DB.prepare(`SELECT p.game_type gameType,i.difficulty,i.category,l.themes_json themesJson,u.content_id contentId,COUNT(*) uses FROM generated_game_participation_usage u
      JOIN generated_game_participations p ON p.id=u.participation_id AND p.organization_id=u.organization_id
      JOIN content_items i ON i.id=u.content_id AND i.organization_id=u.organization_id
      JOIN universal_content_library l ON l.organization_id=u.organization_id AND l.content_id=u.content_id AND l.content_version=u.content_version
      WHERE u.organization_id=?1 AND u.recorded_at>=?2 AND u.recorded_at<?3 GROUP BY p.game_type,i.difficulty,i.category,l.themes_json,u.content_id ORDER BY uses DESC,contentId LIMIT 200`).bind(organizationId, period.from, period.to).all<any>(),
    env.DB.prepare(`SELECT day_key day,COUNT(DISTINCT user_id) players FROM user_platform_statistics_active_days WHERE organization_id=?1 AND first_activity_at>=?2 AND first_activity_at<?3 GROUP BY day_key ORDER BY day_key`).bind(organizationId, period.from, period.to).all<any>(),
    env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN u.created_at>=?2 AND u.created_at<?3 THEN u.id END) newUsers,
      COUNT(DISTINCT CASE WHEN s.first_activity_at>=?2 AND EXISTS(SELECT 1 FROM user_platform_statistics_active_days previous WHERE previous.organization_id=s.organization_id AND previous.user_id=s.user_id AND previous.first_activity_at<?2) THEN s.user_id END) returningUsers,
      COALESCE(ROUND(AVG(stats.current_daily_streak),2),0) averageStreak,
      SUM(CASE WHEN stats.current_daily_streak=0 THEN 1 ELSE 0 END) streak0,SUM(CASE WHEN stats.current_daily_streak BETWEEN 1 AND 2 THEN 1 ELSE 0 END) streak1to2,
      SUM(CASE WHEN stats.current_daily_streak BETWEEN 3 AND 6 THEN 1 ELSE 0 END) streak3to6,SUM(CASE WHEN stats.current_daily_streak>=7 THEN 1 ELSE 0 END) streak7plus
      FROM users u LEFT JOIN user_platform_statistics stats ON stats.user_id=u.id AND stats.organization_id=u.organization_id
      LEFT JOIN user_platform_statistics_active_days s ON s.user_id=u.id AND s.organization_id=u.organization_id AND s.first_activity_at>=?2 AND s.first_activity_at<?3
      WHERE u.organization_id=?1`).bind(organizationId, period.from, period.to).first<any>(),
    env.DB.prepare(`SELECT COALESCE((SELECT SUM(amount) FROM platform_xp_ledger WHERE organization_id=?1 AND applied_at IS NOT NULL AND created_at>=?2 AND created_at<?3),0) xpGranted,
      COALESCE((SELECT SUM(amount) FROM platform_coin_ledger WHERE organization_id=?1 AND applied_at IS NOT NULL AND source_type<>'shop_purchase' AND source_type<>'shop_equipment' AND created_at>=?2 AND created_at<?3),0) coinsGranted,
      COALESCE((SELECT SUM(amount) FROM platform_coin_ledger WHERE organization_id=?1 AND applied_at IS NOT NULL AND source_type='shop_purchase' AND created_at>=?2 AND created_at<?3),0) coinsSpent,
      COALESCE((SELECT SUM(coins) FROM user_platform_progress WHERE organization_id=?1),0) aggregateBalance,
      COALESCE((SELECT COUNT(*) FROM platform_coin_ledger WHERE organization_id=?1 AND applied_at IS NOT NULL AND source_type='shop_purchase' AND created_at>=?2 AND created_at<?3),0) purchases`).bind(organizationId, period.from, period.to).first<any>(),
    env.DB.prepare(`SELECT asset,source,COUNT(*) entries,SUM(amount) amount FROM (
      SELECT 'xp' asset,source_type source,amount FROM platform_xp_ledger WHERE organization_id=?1 AND applied_at IS NOT NULL AND created_at>=?2 AND created_at<?3
      UNION ALL SELECT 'coins',source_type,amount FROM platform_coin_ledger WHERE organization_id=?1 AND applied_at IS NOT NULL AND source_type<>'shop_equipment' AND created_at>=?2 AND created_at<?3
      ) GROUP BY asset,source ORDER BY amount DESC LIMIT 24`).bind(organizationId, period.from, period.to).all<any>(),
    env.DB.prepare(`SELECT source_id itemId,COUNT(*) purchases FROM platform_coin_ledger WHERE organization_id=?1 AND applied_at IS NOT NULL AND source_type='shop_purchase' AND created_at>=?2 AND created_at<?3 GROUP BY source_id ORDER BY purchases DESC,source_id LIMIT 10`).bind(organizationId, period.from, period.to).all<any>(),
    env.DB.prepare(`SELECT COUNT(DISTINCT event_id) events,COUNT(DISTINCT user_id) participants,COUNT(*) games,
      SUM(CASE WHEN status='FINISHED' THEN 1 ELSE 0 END) completed,SUM(CASE WHEN outcome='won' THEN 1 ELSE 0 END) wins,SUM(CASE WHEN outcome='lost' OR status='EXPIRED' THEN 1 ELSE 0 END) losses
      ,COALESCE((SELECT SUM(xp_amount) FROM platform_event_reward_ledger WHERE organization_id=?1 AND created_at>=?2 AND created_at<?3),0) xpRewarded
      ,COALESCE((SELECT SUM(coin_amount) FROM platform_event_reward_ledger WHERE organization_id=?1 AND created_at>=?2 AND created_at<?3),0) coinsRewarded
      FROM platform_event_participations WHERE organization_id=?1 AND COALESCE(started_at,created_at)>=?2 AND COALESCE(started_at,created_at)<?3`).bind(organizationId, period.from, period.to).first<any>(),
  ]);

  const playerCount = new Map((playerCounts.results || []).map((row: any) => [`${row.dimension}:${row.key}`, number(row.players)]));
  const usageByGame = new Map((usage.results || []).map((row: any) => [row.gameType, number(row.used)]));
  const detailRows = usageDetails.results || [];
  const contentByGame = new Map((content.results || []).map((row: any) => [row.gameType, row]));
  const games = PLATFORM_GAME_TYPES.map(gameType => {
    const gameRows = rows.filter(row => row.gameType === gameType); const summary = summarize(gameRows);
    const library: any = contentByGame.get(gameType) || {};
    const details = detailRows.filter((row: any) => row.gameType === gameType);
    const difficulties = Object.entries(details.reduce((all: Record<string, number>, row: any) => ({ ...all, [row.difficulty]: (all[row.difficulty] || 0) + number(row.uses) }), {})).map(([difficulty, uses]) => ({ difficulty, uses }));
    const categories = Object.entries(details.reduce((all: Record<string, number>, row: any) => ({ ...all, [row.category]: (all[row.category] || 0) + number(row.uses) }), {})).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([category, uses])=>({category,uses}));
    const themeTotals: Record<string, number> = {};
    for (const row of details) { try { for (const theme of JSON.parse(String(row.themesJson || "[]"))) if (typeof theme === "string") themeTotals[theme]=(themeTotals[theme]||0)+number(row.uses); } catch { /* invalid metadata is excluded from theme aggregation */ } }
    const themes=Object.entries(themeTotals).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([theme,uses])=>({theme,uses}));
    const topContent = details.slice(0, 5).map((row: any) => ({ contentId: row.contentId, uses: number(row.uses), category: row.category }));
    return { gameType, ...summary, players: playerCount.get(`game:${gameType}`) || 0, usedContent: usageByGame.get(gameType) || 0, difficulties, categories, themes, topContent, published: number(library.published), available: number(library.available), reservedEvent: number(library.reservedEvent), neverUsed: number(library.neverUsed), exhaustionRisk: number(library.available) < 5 };
  });
  const modes = ["FREE_PLAY", "DAILY", "EVENT"].map(mode => ({ mode, ...summarize(rows.filter(row => row.mode === mode)), players: playerCount.get(`mode:${mode}`) || 0 }));
  const overview = { ...summarize(rows), players: playerCount.get("overview:all") || 0 };
  return {
    period, overview, modes, games,
    daily: { opened: { available: true, users: number(dailyOpened?.users), opens: number(dailyOpened?.opens) }, started: summarize(rows.filter(row => row.mode === "DAILY")).started, completed: summarize(rows.filter(row => row.mode === "DAILY")).completed, wins: summarize(rows.filter(row => row.mode === "DAILY")).wins, completed3: number(dailyUsers?.completed3), completed7: number(dailyUsers?.completed7) },
    events: { ...eventSummary, completion: { available: false, reason: "event_completion_not_projected" } },
    content: games.map(({ gameType, published, available, reservedEvent, usedContent, neverUsed, exhaustionRisk }) => ({ gameType, published, available, reservedEvent, usedContent, neverUsed, exhaustionRisk })),
    retention: { activeByDay: activeDays.results || [], newUsers: number(retention?.newUsers), returningUsers: number(retention?.returningUsers), averageStreak: number(retention?.averageStreak), streakDistribution: { zero: number(retention?.streak0), oneToTwo: number(retention?.streak1to2), threeToSix: number(retention?.streak3to6), sevenPlus: number(retention?.streak7plus) } },
    economy: { ...economy, rewardOrigins: rewards.results || [], topItems: topItems.results || [] },
  };
}
