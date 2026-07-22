import type { AppEnv } from "./auth";
import type { CoreEventConsumer, CorePlatformEvent } from "./platform-event-engine";

export const STATISTICS_CONSUMER_ID = "platform-statistics";
export const STATISTICS_CONSUMER_VERSION = 1;
const SUPPORTED_EVENTS = ["DAILY_LOGIN", "GAME_STARTED", "GAME_FINISHED", "QUESTION_ANSWERED"] as const;

type StatisticsEvent = CorePlatformEvent<Record<string, unknown>>;

function localDayKey(at: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));
}

function consecutiveDays(left: string, right: string) {
  const leftAt = Date.parse(`${left}T00:00:00Z`);
  const rightAt = Date.parse(`${right}T00:00:00Z`);
  return Number.isFinite(leftAt) && Number.isFinite(rightAt) && rightAt - leftAt === 86_400_000;
}

function streaks(dayKeys: string[]) {
  if (!dayKeys.length) return { current: 0, best: 0 };
  let run = 1;
  let best = 1;
  for (let index = 1; index < dayKeys.length; index += 1) {
    run = consecutiveDays(dayKeys[index - 1], dayKeys[index]) ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { current: run, best };
}

function requireGameId(event: StatisticsEvent) {
  const gameId = event.source.gameId;
  if (!gameId || event.source.kind !== "game") throw new Error("statistics_event_game_required");
  return gameId;
}

async function refreshDerivedStatistics(env: AppEnv, userId: string, organizationId: string, now: number) {
  const [days, officialDays] = await Promise.all([env.DB.prepare(
    "SELECT day_key dayKey FROM user_platform_statistics_active_days WHERE user_id=?1 AND organization_id=?2 ORDER BY day_key",
  ).bind(userId, organizationId).all<any>(), env.DB.prepare(
    "SELECT COUNT(*) total FROM user_platform_statistics_official_days_utc WHERE user_id=?1 AND organization_id=?2",
  ).bind(userId, organizationId).first<any>()]);
  const values = streaks((days.results || []).map(row => String(row.dayKey)));
  await env.DB.prepare(`UPDATE user_platform_statistics SET
      games_used=(SELECT COUNT(*) FROM user_platform_game_statistics WHERE user_id=?1 AND organization_id=?2),
      active_days=?3,current_daily_streak=?4,best_daily_streak=MAX(best_daily_streak,?5),
      distinct_official_play_days_utc=?6,updated_at=?7
    WHERE user_id=?1 AND organization_id=?2`).bind(
    userId,
    organizationId,
    days.results.length,
    values.current,
    values.best,
    Number(officialDays?.total || 0),
    now,
  ).run();
}

async function applyStatisticsEvent(event: StatisticsEvent, env: AppEnv) {
  const organization = await env.DB.prepare(
    "SELECT timezone FROM organizations WHERE id=?1",
  ).bind(event.organizationId).first<any>();
  if (!organization) throw new Error("statistics_organization_unavailable");

  const now = Date.now();
  const dayKey = localDayKey(event.occurredAt, organization.timezone || "America/Sao_Paulo");
  const isGameEvent = event.eventType === "GAME_STARTED" || event.eventType === "GAME_FINISHED" || event.eventType === "QUESTION_ANSWERED";
  const gameId = isGameEvent ? requireGameId(event) : null;
  const score = event.eventType === "GAME_FINISHED" && Number.isSafeInteger(event.payload.score)
    ? Number(event.payload.score)
    : null;
  const correct = event.eventType === "QUESTION_ANSWERED" ? event.payload.correct === true : false;
  const officialCompletion = event.eventType === "GAME_FINISHED" && event.version === 2
    && event.payload.status === "completed" && event.payload.mode === "official";
  const officialQuestions = officialCompletion ? Number(event.payload.questionsAnswered) : 0;
  const perfect = officialCompletion && officialQuestions > 0
    && Number(event.payload.correctAnswers) === officialQuestions;
  const completedAt = officialCompletion ? Number(event.payload.completedAt) : null;
  const officialDayUtc = completedAt === null ? null : new Date(completedAt).toISOString().slice(0, 10);

  const statements = [
    env.DB.prepare(`INSERT INTO user_platform_statistics(user_id,organization_id,created_at,updated_at)
      VALUES(?1,?2,?3,?3) ON CONFLICT(user_id,organization_id) DO NOTHING`).bind(event.userId, event.organizationId, now),
  ];
  if (gameId) {
    statements.push(env.DB.prepare(`INSERT INTO user_platform_game_statistics(user_id,organization_id,game_id,created_at,updated_at)
      VALUES(?1,?2,?3,?4,?4) ON CONFLICT(user_id,organization_id,game_id) DO NOTHING`).bind(event.userId, event.organizationId, gameId, now));
  }
  statements.push(
    env.DB.prepare(`INSERT INTO platform_statistics_event_checkpoints(event_id,user_id,organization_id,consumer_version,state,created_at)
      VALUES(?1,?2,?3,?4,'processing',?5) ON CONFLICT(event_id,consumer_version) DO NOTHING`).bind(
      event.eventId, event.userId, event.organizationId, STATISTICS_CONSUMER_VERSION, now,
    ),
    env.DB.prepare(`INSERT INTO user_platform_statistics_active_days(user_id,organization_id,day_key,first_activity_at,last_activity_at)
      SELECT ?1,?2,?3,?4,?4 WHERE EXISTS(
        SELECT 1 FROM platform_statistics_event_checkpoints WHERE event_id=?5 AND consumer_version=?6 AND state='processing'
      ) ON CONFLICT(user_id,organization_id,day_key) DO UPDATE SET
        first_activity_at=MIN(first_activity_at,excluded.first_activity_at),
        last_activity_at=MAX(last_activity_at,excluded.last_activity_at)`).bind(
      event.userId, event.organizationId, dayKey, event.occurredAt, event.eventId, STATISTICS_CONSUMER_VERSION,
    ),
  );
  if (officialCompletion) {
    statements.push(env.DB.prepare(`INSERT INTO user_platform_statistics_official_days_utc(
      user_id,organization_id,day_key,first_completion_at,last_completion_at)
      SELECT ?1,?2,?3,?4,?4 WHERE EXISTS(
        SELECT 1 FROM platform_statistics_event_checkpoints WHERE event_id=?5 AND consumer_version=?6 AND state='processing'
      ) ON CONFLICT(user_id,organization_id,day_key) DO UPDATE SET
        first_completion_at=MIN(first_completion_at,excluded.first_completion_at),
        last_completion_at=MAX(last_completion_at,excluded.last_completion_at)`)
      .bind(event.userId, event.organizationId, officialDayUtc, completedAt, event.eventId, STATISTICS_CONSUMER_VERSION));
  }
  statements.push(
    env.DB.prepare(`UPDATE user_platform_statistics SET
      sessions_completed=sessions_completed+?1,
      official_games_completed=official_games_completed+?2,
      official_questions_answered=official_questions_answered+?3,
      perfect_games=perfect_games+?4,
      last_activity_at=CASE WHEN last_activity_at IS NULL OR last_activity_at<?5 THEN ?5 ELSE last_activity_at END,
      updated_at=?6
      WHERE user_id=?7 AND organization_id=?8 AND EXISTS(
        SELECT 1 FROM platform_statistics_event_checkpoints WHERE event_id=?9 AND consumer_version=?10 AND state='processing'
      )`).bind(event.eventType === "GAME_FINISHED" ? 1 : 0, officialCompletion ? 1 : 0,
      officialQuestions, perfect ? 1 : 0, event.occurredAt, now, event.userId, event.organizationId,
      event.eventId, STATISTICS_CONSUMER_VERSION),
  );
  if (gameId) {
    statements.push(env.DB.prepare(`UPDATE user_platform_game_statistics SET
      sessions_started=sessions_started+?1,
      sessions_completed=sessions_completed+?2,
      questions_answered=questions_answered+?3,
      correct_answers=correct_answers+?4,
      incorrect_answers=incorrect_answers+?5,
      best_score=CASE WHEN ?6 IS NULL THEN best_score WHEN best_score IS NULL OR best_score<?6 THEN ?6 ELSE best_score END,
      last_activity_at=CASE WHEN last_activity_at IS NULL OR last_activity_at<?7 THEN ?7 ELSE last_activity_at END,
      updated_at=?8
      WHERE user_id=?9 AND organization_id=?10 AND game_id=?11 AND EXISTS(
        SELECT 1 FROM platform_statistics_event_checkpoints WHERE event_id=?12 AND consumer_version=?13 AND state='processing'
      )`).bind(
      event.eventType === "GAME_STARTED" ? 1 : 0,
      event.eventType === "GAME_FINISHED" ? 1 : 0,
      event.eventType === "QUESTION_ANSWERED" ? 1 : 0,
      event.eventType === "QUESTION_ANSWERED" && correct ? 1 : 0,
      event.eventType === "QUESTION_ANSWERED" && !correct ? 1 : 0,
      score,
      event.occurredAt,
      now,
      event.userId,
      event.organizationId,
      gameId,
      event.eventId,
      STATISTICS_CONSUMER_VERSION,
    ));
  }
  statements.push(env.DB.prepare(`UPDATE platform_statistics_event_checkpoints SET state='completed',applied_at=?1
    WHERE event_id=?2 AND consumer_version=?3 AND state='processing'`).bind(now, event.eventId, STATISTICS_CONSUMER_VERSION));

  await env.DB.batch(statements);
  await refreshDerivedStatistics(env, event.userId, event.organizationId, now);
}

export const platformStatisticsConsumer: CoreEventConsumer = {
  id: STATISTICS_CONSUMER_ID,
  handlerVersion: STATISTICS_CONSUMER_VERSION,
  eventTypes: SUPPORTED_EVENTS,
  handle: applyStatisticsEvent,
};

export async function getUserStatistics(env: AppEnv, userId: string, organizationId: string) {
  const [globalRow, games] = await Promise.all([
    env.DB.prepare(`SELECT sessions_completed sessionsCompleted,games_used gamesUsed,total_play_time_ms totalPlayTimeMs,
      timed_sessions timedSessions,last_activity_at lastActivityAt,active_days activeDays,
      current_daily_streak currentDailyStreak,best_daily_streak bestDailyStreak,
      official_games_completed officialGamesCompleted,official_questions_answered questionsAnswered,
      perfect_games perfectGames,distinct_official_play_days_utc distinctOfficialPlayDaysUtc
      FROM user_platform_statistics WHERE user_id=?1 AND organization_id=?2`).bind(userId, organizationId).first<any>(),
    env.DB.prepare(`SELECT g.game_id gameId,g.sessions_started sessionsStarted,g.sessions_completed sessionsCompleted,
      g.questions_answered questionsAnswered,g.correct_answers correctAnswers,g.incorrect_answers incorrectAnswers,
      g.best_score bestScore,g.total_play_time_ms totalPlayTimeMs,g.timed_sessions timedSessions,g.last_activity_at lastActivityAt,
      (SELECT d.difficulty_key FROM user_platform_game_difficulty_statistics d
        WHERE d.user_id=g.user_id AND d.organization_id=g.organization_id AND d.game_id=g.game_id
        ORDER BY d.sessions_completed DESC,d.difficulty_key LIMIT 1) mostUsedDifficulty
      FROM user_platform_game_statistics g WHERE g.user_id=?1 AND g.organization_id=?2 ORDER BY g.last_activity_at DESC,g.game_id`).bind(userId, organizationId).all<any>(),
  ]);
  const globalValues = globalRow || {};
  return {
    global: {
      sessionsCompleted: Number(globalValues.sessionsCompleted || 0),
      gamesUsed: Number(globalValues.gamesUsed || 0),
      totalPlayTimeMs: Number(globalValues.totalPlayTimeMs || 0),
      lastActivityAt: globalValues.lastActivityAt == null ? null : Number(globalValues.lastActivityAt),
      activeDays: Number(globalValues.activeDays || 0),
      currentDailyStreak: Number(globalValues.currentDailyStreak || 0),
      bestDailyStreak: Number(globalValues.bestDailyStreak || 0),
      officialGamesCompleted: Number(globalValues.officialGamesCompleted || 0),
      questionsAnswered: Number(globalValues.questionsAnswered || 0),
      perfectGames: Number(globalValues.perfectGames || 0),
      distinctOfficialPlayDaysUtc: Number(globalValues.distinctOfficialPlayDaysUtc || 0),
    },
    games: (games.results || []).map((row: any) => ({
      gameId: row.gameId,
      sessionsStarted: Number(row.sessionsStarted || 0),
      sessionsCompleted: Number(row.sessionsCompleted || 0),
      questionsAnswered: Number(row.questionsAnswered || 0),
      correctAnswers: Number(row.correctAnswers || 0),
      incorrectAnswers: Number(row.incorrectAnswers || 0),
      accuracy: Number(row.questionsAnswered || 0) > 0
        ? Math.round((Number(row.correctAnswers || 0) / Number(row.questionsAnswered)) * 10_000) / 100
        : null,
      bestScore: row.bestScore == null ? null : Number(row.bestScore),
      totalPlayTimeMs: Number(row.totalPlayTimeMs || 0),
      averageTimeMs: Number(row.timedSessions || 0) > 0
        ? Math.round(Number(row.totalPlayTimeMs || 0) / Number(row.timedSessions))
        : null,
      mostUsedDifficulty: row.mostUsedDifficulty || null,
      lastActivityAt: row.lastActivityAt == null ? null : Number(row.lastActivityAt),
    })),
  };
}

export async function rebuildUserStatistics(env: AppEnv, userId: string, organizationId: string) {
  const events = await env.DB.prepare(`SELECT e.event_id eventId,e.event_type eventType,e.event_version version,e.occurred_at occurredAt,
    e.organization_id organizationId,e.user_id userId,e.source_kind sourceKind,e.source_service sourceService,
    e.source_game_id sourceGameId,e.source_id sourceId,e.payload_json payloadJson,e.correlation_id correlationId,e.causation_id causationId
    FROM core_platform_events e
    WHERE e.user_id=?1 AND e.organization_id=?2
      AND e.event_type IN ('DAILY_LOGIN','GAME_STARTED','GAME_FINISHED','QUESTION_ANSWERED')
      AND (
        EXISTS(SELECT 1 FROM core_platform_event_processing p
          WHERE p.event_id=e.event_id AND p.consumer_id=?3 AND p.handler_version=?4 AND p.state='completed')
        OR EXISTS(SELECT 1 FROM platform_statistics_event_checkpoints c
          WHERE c.event_id=e.event_id AND c.consumer_version=?4 AND c.state='completed')
      )
    ORDER BY e.occurred_at,e.event_id`).bind(userId, organizationId, STATISTICS_CONSUMER_ID, STATISTICS_CONSUMER_VERSION).all<any>();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM platform_statistics_event_checkpoints WHERE user_id=?1 AND organization_id=?2").bind(userId, organizationId),
    env.DB.prepare("DELETE FROM user_platform_game_difficulty_statistics WHERE user_id=?1 AND organization_id=?2").bind(userId, organizationId),
    env.DB.prepare("DELETE FROM user_platform_statistics_active_days WHERE user_id=?1 AND organization_id=?2").bind(userId, organizationId),
    env.DB.prepare("DELETE FROM user_platform_statistics_official_days_utc WHERE user_id=?1 AND organization_id=?2").bind(userId, organizationId),
    env.DB.prepare("DELETE FROM user_platform_game_statistics WHERE user_id=?1 AND organization_id=?2").bind(userId, organizationId),
    env.DB.prepare("DELETE FROM user_platform_statistics WHERE user_id=?1 AND organization_id=?2").bind(userId, organizationId),
  ]);
  for (const row of events.results || []) {
    await applyStatisticsEvent({
      eventId: row.eventId,
      eventType: row.eventType,
      occurredAt: Number(row.occurredAt),
      organizationId: row.organizationId,
      userId: row.userId,
      source: { kind: row.sourceKind, service: row.sourceService, gameId: row.sourceGameId || undefined, sourceId: row.sourceId },
      payload: JSON.parse(row.payloadJson),
      version: Number(row.version),
      correlationId: row.correlationId || undefined,
      causationId: row.causationId || undefined,
    }, env);
  }
  return getUserStatistics(env, userId, organizationId);
}
