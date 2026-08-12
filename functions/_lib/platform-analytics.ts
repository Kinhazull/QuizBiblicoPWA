import type { AppEnv } from "./auth";

export const PLATFORM_GAME_TYPES = [
  "quiz-biblico", "wordle-biblico", "linha-do-tempo-biblica", "memoria-biblica",
  "associacao-de-temas", "quem-sou-eu", "jogo-tres-pistas",
] as const;
export type AnalyticsPeriodKey = "today" | "7d" | "30d" | "custom";
export type AnalyticsPeriod = { key: AnalyticsPeriodKey; from: number; to: number; timeZone?: string };

const DAY = 86_400_000;
const MAX_RANGE = 90 * DAY;
const number = (value: unknown) => Number(value || 0);
const rate = (part: number, total: number) => total ? Math.round(part * 10_000 / total) / 100 : 0;

export function compareAnalyticsMetric(current: number, previous: number) {
  const difference = current - previous;
  return {
    current,
    previous,
    difference,
    percentChange: previous === 0 ? null : Math.round((difference * 10_000) / previous) / 100,
  };
}

function localDayKey(at: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
}

function startOfLocalDay(at: number, timeZone: string) {
  const key = localDayKey(at, timeZone);
  let low = at - 32 * 60 * 60 * 1000;
  let high = at;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (localDayKey(middle, timeZone) === key) high = middle;
    else low = middle;
  }
  return high;
}

export function parseAnalyticsPeriod(url: URL, now = Date.now(), timeZone = "America/Sao_Paulo"): AnalyticsPeriod {
  const key = (url.searchParams.get("period") || "7d") as AnalyticsPeriodKey;
  if (!(["today", "7d", "30d", "custom"] as string[]).includes(key)) throw new Error("analytics_invalid_period");
  let from: number;
  let to = now;
  if (key === "today") from = startOfLocalDay(now, timeZone);
  else if (key === "7d") from = now - 7 * DAY;
  else if (key === "30d") from = now - 30 * DAY;
  else {
    from = Number(url.searchParams.get("from"));
    to = Number(url.searchParams.get("to"));
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to || to - from > MAX_RANGE || to > now + DAY) {
      throw new Error("analytics_invalid_period");
    }
  }
  return { key, from, to, timeZone };
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

async function getAnalyticsSnapshot(env: AppEnv, organizationId: string, period: AnalyticsPeriod) {
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

  const [playerCounts, dailyUsers, dailyOpened, content, usage, usageDetails, activeDays, retention, economy, rewards, topItems, eventSummary, eventDetails] = await Promise.all([
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
    env.DB.prepare(`SELECT p.game_type gameType,i.difficulty,i.category,l.themes_json themesJson,u.content_id contentId,COUNT(*) uses,
      COUNT(DISTINCT u.participation_id) sample,SUM(CASE WHEN p.status='FINISHED' THEN 1 ELSE 0 END) completed FROM generated_game_participation_usage u
      JOIN generated_game_participations p ON p.id=u.participation_id AND p.organization_id=u.organization_id
      JOIN content_items i ON i.id=u.content_id AND i.organization_id=u.organization_id
      JOIN universal_content_library l ON l.organization_id=u.organization_id AND l.content_id=u.content_id AND l.content_version=u.content_version
      WHERE u.organization_id=?1 AND u.recorded_at>=?2 AND u.recorded_at<?3 GROUP BY p.game_type,i.difficulty,i.category,l.themes_json,u.content_id ORDER BY uses DESC,contentId LIMIT 200`).bind(organizationId, period.from, period.to).all<any>(),
    env.DB.prepare(`SELECT day_key day,COUNT(DISTINCT user_id) players FROM user_platform_statistics_active_days WHERE organization_id=?1 AND first_activity_at>=?2 AND first_activity_at<?3 GROUP BY day_key ORDER BY day_key`).bind(organizationId, period.from, period.to).all<any>(),
    env.DB.prepare(`WITH active AS (SELECT DISTINCT user_id FROM user_platform_statistics_active_days
      WHERE organization_id=?1 AND first_activity_at>=?2 AND first_activity_at<?3)
      SELECT COUNT(CASE WHEN u.created_at>=?2 AND u.created_at<?3 THEN u.id END) newUsers,
      COUNT(CASE WHEN u.created_at<?2 AND EXISTS(SELECT 1 FROM user_platform_statistics_active_days previous WHERE previous.organization_id=?1 AND previous.user_id=u.id AND previous.first_activity_at<?2) THEN u.id END) returningUsers,
      COALESCE(ROUND(AVG(stats.current_daily_streak),2),0) averageStreak,
      SUM(CASE WHEN stats.current_daily_streak=0 THEN 1 ELSE 0 END) streak0,SUM(CASE WHEN stats.current_daily_streak BETWEEN 1 AND 2 THEN 1 ELSE 0 END) streak1to2,
      SUM(CASE WHEN stats.current_daily_streak BETWEEN 3 AND 6 THEN 1 ELSE 0 END) streak3to6,SUM(CASE WHEN stats.current_daily_streak>=7 THEN 1 ELSE 0 END) streak7plus
      FROM active a JOIN users u ON u.id=a.user_id AND u.organization_id=?1
      LEFT JOIN user_platform_statistics stats ON stats.user_id=u.id AND stats.organization_id=u.organization_id`).bind(organizationId, period.from, period.to).first<any>(),
    env.DB.prepare(`SELECT COALESCE((SELECT SUM(amount) FROM platform_xp_ledger WHERE organization_id=?1 AND applied_at IS NOT NULL AND created_at>=?2 AND created_at<?3),0) xpGranted,
      COALESCE((SELECT SUM(amount) FROM platform_coin_ledger WHERE organization_id=?1 AND applied_at IS NOT NULL AND source_type<>'shop_purchase' AND source_type<>'shop_equipment' AND created_at>=?2 AND created_at<?3),0) coinsGranted,
      COALESCE((SELECT SUM(amount) FROM platform_coin_ledger WHERE organization_id=?1 AND applied_at IS NOT NULL AND source_type='shop_purchase' AND created_at>=?2 AND created_at<?3),0) coinsSpent,
      COALESCE((SELECT SUM(coins) FROM user_platform_progress WHERE organization_id=?1),0) aggregateBalance,
      COALESCE((SELECT COUNT(*) FROM platform_coin_ledger WHERE organization_id=?1 AND applied_at IS NOT NULL AND source_type='shop_purchase' AND created_at>=?2 AND created_at<?3),0) purchases,
      COALESCE((SELECT COUNT(*) FROM (SELECT user_id,source_id,SUM(amount) total FROM platform_coin_ledger
        WHERE organization_id=?1 AND applied_at IS NOT NULL AND source_type='game_finished_free_play' AND created_at>=?2 AND created_at<?3
        GROUP BY user_id,source_id HAVING total>=15)),0) freePlayCapReachedUsers`).bind(organizationId, period.from, period.to).first<any>(),
    env.DB.prepare(`SELECT asset,source,COUNT(*) entries,SUM(amount) amount FROM (
      SELECT 'xp' asset,source_type source,amount FROM platform_xp_ledger WHERE organization_id=?1 AND applied_at IS NOT NULL AND created_at>=?2 AND created_at<?3
      UNION ALL SELECT 'coins',source_type,amount FROM platform_coin_ledger WHERE organization_id=?1 AND applied_at IS NOT NULL AND source_type<>'shop_equipment' AND created_at>=?2 AND created_at<?3
      ) GROUP BY asset,source ORDER BY amount DESC LIMIT 24`).bind(organizationId, period.from, period.to).all<any>(),
    env.DB.prepare(`SELECT source_id itemId,COUNT(*) purchases FROM platform_coin_ledger WHERE organization_id=?1 AND applied_at IS NOT NULL AND source_type='shop_purchase' AND created_at>=?2 AND created_at<?3 GROUP BY source_id ORDER BY purchases DESC,source_id LIMIT 10`).bind(organizationId, period.from, period.to).all<any>(),
    env.DB.prepare(`SELECT COUNT(DISTINCT event_id) events,COUNT(DISTINCT user_id) participants,
      COUNT(DISTINCT CASE WHEN started_at IS NOT NULL THEN user_id END) startedParticipants,
      COUNT(DISTINCT CASE WHEN status='FINISHED' THEN user_id END) progressedParticipants,COUNT(*) games,
      SUM(CASE WHEN status='FINISHED' THEN 1 ELSE 0 END) completed,SUM(CASE WHEN outcome='won' THEN 1 ELSE 0 END) wins,SUM(CASE WHEN outcome='lost' OR status='EXPIRED' THEN 1 ELSE 0 END) losses
      ,COALESCE((SELECT SUM(xp_amount) FROM platform_event_reward_ledger WHERE organization_id=?1 AND created_at>=?2 AND created_at<?3),0) xpRewarded
      ,COALESCE((SELECT SUM(coin_amount) FROM platform_event_reward_ledger WHERE organization_id=?1 AND created_at>=?2 AND created_at<?3),0) coinsRewarded
      FROM platform_event_participations WHERE organization_id=?1 AND COALESCE(started_at,created_at)>=?2 AND COALESCE(started_at,created_at)<?3`).bind(organizationId, period.from, period.to).first<any>(),
    env.DB.prepare(`SELECT e.id eventId,e.title,e.starts_at startsAt,e.ends_at endsAt,
      COUNT(DISTINCT p.user_id) participants,COUNT(p.id) sessions,COUNT(DISTINCT p.game_type) games,
      SUM(CASE WHEN p.status='FINISHED' THEN 1 ELSE 0 END) completed,
      COALESCE((SELECT SUM(r.xp_amount) FROM platform_event_reward_ledger r WHERE r.organization_id=e.organization_id AND r.event_id=e.id AND r.created_at>=?2 AND r.created_at<?3),0) xpRewarded,
      COALESCE((SELECT SUM(r.coin_amount) FROM platform_event_reward_ledger r WHERE r.organization_id=e.organization_id AND r.event_id=e.id AND r.created_at>=?2 AND r.created_at<?3),0) coinsRewarded
      FROM platform_events e LEFT JOIN platform_event_participations p ON p.event_id=e.id AND p.organization_id=e.organization_id
        AND COALESCE(p.started_at,p.created_at)>=?2 AND COALESCE(p.started_at,p.created_at)<?3
      WHERE e.organization_id=?1 AND e.starts_at<?3 AND e.ends_at>=?2
      GROUP BY e.id,e.title,e.starts_at,e.ends_at ORDER BY e.starts_at DESC LIMIT 20`).bind(organizationId, period.from, period.to).all<any>(),
  ]);

  const playerCount = new Map((playerCounts.results || []).map((row: any) => [`${row.dimension}:${row.key}`, number(row.players)]));
  const usageByGame = new Map((usage.results || []).map((row: any) => [row.gameType, number(row.used)]));
  const detailRows = usageDetails.results || [];
  const contentByGame = new Map((content.results || []).map((row: any) => [row.gameType, row]));
  const games = PLATFORM_GAME_TYPES.map(gameType => {
    const gameRows = rows.filter(row => row.gameType === gameType); const summary = summarize(gameRows);
    const library: any = contentByGame.get(gameType) || {};
    const details = detailRows.filter((row: any) => row.gameType === gameType);
    const difficultyTotals = details.reduce((all: Record<string, { uses: number; sample: number; completed: number }>, row: any) => {
      const current = all[row.difficulty] || { uses: 0, sample: 0, completed: 0 };
      current.uses += number(row.uses); current.sample += number(row.sample); current.completed += number(row.completed); all[row.difficulty] = current; return all;
    }, {});
    const difficulties = Object.entries(difficultyTotals).map(([difficulty, values]) => ({ difficulty, ...values,
      completionRate: rate(values.completed, values.sample), sufficientSample: values.sample >= 10 }));
    const categories = Object.entries(details.reduce((all: Record<string, number>, row: any) => ({ ...all, [row.category]: (all[row.category] || 0) + number(row.uses) }), {})).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([category, uses])=>({category,uses}));
    const themeTotals: Record<string, number> = {};
    for (const row of details) { try { for (const theme of JSON.parse(String(row.themesJson || "[]"))) if (typeof theme === "string") themeTotals[theme]=(themeTotals[theme]||0)+number(row.uses); } catch { /* invalid metadata is excluded from theme aggregation */ } }
    const themes=Object.entries(themeTotals).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([theme,uses])=>({theme,uses}));
    const topContent = details.slice(0, 5).map((row: any) => ({ contentId: row.contentId, uses: number(row.uses), category: row.category }));
    const leastUsedContent = [...details].sort((a: any,b: any)=>number(a.uses)-number(b.uses)||String(a.contentId).localeCompare(String(b.contentId))).slice(0,5)
      .map((row: any)=>({contentId:row.contentId,uses:number(row.uses),category:row.category}));
    return { gameType, ...summary, players: playerCount.get(`game:${gameType}`) || 0, usedContent: usageByGame.get(gameType) || 0, difficulties, categories, themes, topContent, leastUsedContent, published: number(library.published), available: number(library.available), reservedEvent: number(library.reservedEvent), neverUsed: number(library.neverUsed), exhaustionRisk: number(library.available) < 5 };
  });
  const modes = ["FREE_PLAY", "DAILY", "EVENT"].map(mode => ({ mode, ...summarize(rows.filter(row => row.mode === mode)), players: playerCount.get(`mode:${mode}`) || 0 }));
  const overview = { ...summarize(rows), players: playerCount.get("overview:all") || 0 };
  return {
    period, overview, modes, games,
    daily: { opened: { available: true, users: number(dailyOpened?.users), opens: number(dailyOpened?.opens) }, started: summarize(rows.filter(row => row.mode === "DAILY")).started, completed: summarize(rows.filter(row => row.mode === "DAILY")).completed, wins: summarize(rows.filter(row => row.mode === "DAILY")).wins, completed3: number(dailyUsers?.completed3), completed7: number(dailyUsers?.completed7) },
    events: { ...eventSummary, funnel: { stages: [
      funnelStage("participated", number(eventSummary?.participants), null),
      funnelStage("started", number(eventSummary?.startedParticipants), number(eventSummary?.participants)),
      funnelStage("progressed", number(eventSummary?.progressedParticipants), number(eventSummary?.startedParticipants)),
    ] }, items: eventDetails.results || [], completion: { available: false, reason: "event_completion_not_projected" } },
    content: games.map(({ gameType, published, available, reservedEvent, usedContent, neverUsed, exhaustionRisk }) => ({ gameType, published, available, reservedEvent, usedContent, neverUsed, exhaustionRisk })),
    retention: { activeByDay: activeDays.results || [], newUsers: number(retention?.newUsers), returningUsers: number(retention?.returningUsers), returnRate: rate(number(retention?.returningUsers), number(retention?.newUsers)+number(retention?.returningUsers)), averageStreak: number(retention?.averageStreak), streakDistribution: { zero: number(retention?.streak0), oneToTwo: number(retention?.streak1to2), threeToSix: number(retention?.streak3to6), sevenPlus: number(retention?.streak7plus) } },
    economy: { ...economy, netCoins: number(economy?.coinsGranted)-number(economy?.coinsSpent), freePlayCap: { amount: 15, reachedUsers: number(economy?.freePlayCapReachedUsers), blockedCoins: { available: false, reason: "blocked_coins_not_persisted" } }, rewardOrigins: rewards.results || [], topItems: topItems.results || [] },
  };
}

function previousPeriod(period: AnalyticsPeriod): AnalyticsPeriod {
  const duration = period.to - period.from;
  return { key: "custom", from: period.from - duration, to: period.from, timeZone: period.timeZone };
}

function funnelStage(name: string, users: number, previousUsers: number | null) {
  return { name, users, conversionFromPrevious: previousUsers == null ? null : rate(users, previousUsers), abandonmentFromPrevious: previousUsers == null ? null : Math.max(0, previousUsers-users) };
}

async function analyticsTrends(env: AppEnv, organizationId: string, period: AnalyticsPeriod) {
  const result = await env.DB.prepare(`WITH activity AS (
    SELECT date(COALESCE(started_at,created_at)/1000,'unixepoch') day,user_id,'session' kind,
      CASE WHEN started_at IS NOT NULL THEN 1 ELSE 0 END started,CASE WHEN status='FINISHED' THEN 1 ELSE 0 END completed,CASE WHEN mode='DAILY' THEN 1 ELSE 0 END daily,0 xp,0 coins
    FROM generated_game_participations WHERE organization_id=?1 AND COALESCE(started_at,created_at)>=?2 AND COALESCE(started_at,created_at)<?3
    UNION ALL SELECT date(COALESCE(started_at,created_at)/1000,'unixepoch'),user_id,'session',CASE WHEN started_at IS NOT NULL THEN 1 ELSE 0 END,CASE WHEN status='FINISHED' THEN 1 ELSE 0 END,0,0,0
    FROM platform_event_participations WHERE organization_id=?1 AND COALESCE(started_at,created_at)>=?2 AND COALESCE(started_at,created_at)<?3
    UNION ALL SELECT date(created_at/1000,'unixepoch'),user_id,'xp',0,0,0,amount,0 FROM platform_xp_ledger WHERE organization_id=?1 AND applied_at IS NOT NULL AND created_at>=?2 AND created_at<?3
    UNION ALL SELECT date(created_at/1000,'unixepoch'),user_id,'coins',0,0,0,0,CASE WHEN source_type='shop_purchase' THEN -amount ELSE amount END FROM platform_coin_ledger WHERE organization_id=?1 AND applied_at IS NOT NULL AND source_type<>'shop_equipment' AND created_at>=?2 AND created_at<?3
  ) SELECT day,COUNT(DISTINCT CASE WHEN kind='session' THEN user_id END) activeUsers,SUM(started) started,SUM(completed) completed,SUM(daily) daily,SUM(xp) xp,SUM(coins) netCoins
    FROM activity GROUP BY day ORDER BY day`).bind(organizationId,period.from,period.to).all<any>();
  return (result.results || []).map((row:any)=>({day:String(row.day),activeUsers:number(row.activeUsers),started:number(row.started),completed:number(row.completed),daily:number(row.daily),xp:number(row.xp),netCoins:number(row.netCoins)}));
}

export async function getPlatformAnalytics(env: AppEnv, organizationId: string, period: AnalyticsPeriod) {
  const priorPeriod = previousPeriod(period);
  const [current, previous, trends] = await Promise.all([
    getAnalyticsSnapshot(env, organizationId, period),
    getAnalyticsSnapshot(env, organizationId, priorPeriod),
    analyticsTrends(env, organizationId, period),
  ]);
  const startedUsers = number(current.modes.find((item:any)=>item.mode==="DAILY")?.players);
  const stages = [
    funnelStage("opened", number(current.daily.opened.users), null),
    funnelStage("started", startedUsers, number(current.daily.opened.users)),
    funnelStage("completed3", number(current.daily.completed3), startedUsers),
    funnelStage("completed7", number(current.daily.completed7), number(current.daily.completed3)),
  ];
  return {
    ...current,
    previousPeriod: priorPeriod,
    comparisons: {
      activeUsers: compareAnalyticsMetric(number(current.overview.players), number(previous.overview.players)),
      started: compareAnalyticsMetric(number(current.overview.started), number(previous.overview.started)),
      completed: compareAnalyticsMetric(number(current.overview.completed), number(previous.overview.completed)),
      dailyOpened: compareAnalyticsMetric(number(current.daily.opened.users), number(previous.daily.opened.users)),
      returningUsers: compareAnalyticsMetric(number(current.retention.returningUsers), number(previous.retention.returningUsers)),
      xpGranted: compareAnalyticsMetric(number(current.economy.xpGranted), number(previous.economy.xpGranted)),
      netCoins: compareAnalyticsMetric(number(current.economy.netCoins), number(previous.economy.netCoins)),
    },
    trends,
    daily: { ...current.daily, funnel: { stages, note: "DAILY_OPENED is emitted only by the Daily page; Home views are excluded." } },
    definitions: {
      previousPeriod: "Immediately preceding interval with the same duration.",
      returningUsers: "Users active in the selected period with at least one activity before its start.",
      returnRate: "Returning users divided by new plus returning users in the period.",
      difficultyMinimumSample: 10,
      trendTimeZone: "UTC",
      organizationTimeZone: period.timeZone || "America/Sao_Paulo",
    },
  };
}
