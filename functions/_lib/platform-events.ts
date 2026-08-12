import { GameType } from "../../shared/content";
import { GameMode } from "../../shared/game-modes";
import type { AppEnv } from "./auth";
import { grantCoins, grantXp } from "./platform-progress";
import { publishOfficialCoreEvent } from "./platform-event-runtime";
import { sha256 } from "./security";
import { findGeneratedSelectionById } from "./universal-game-generator";
import { generatedSelectionHistoricalContents, generatedSelectionSafePayload } from "./platform-daily-objectives";
import { listEligibleUniversalContent } from "./universal-eligible-content-catalog";

export const EventStatus = Object.freeze({
  DRAFT: "DRAFT", SCHEDULED: "SCHEDULED", ACTIVE: "ACTIVE",
  FINISHED: "FINISHED", CANCELLED: "CANCELLED",
} as const);
export type EventStatus = typeof EventStatus[keyof typeof EventStatus];

const GAME_TYPES = new Set(Object.values(GameType));
const ID = /^[a-zA-Z0-9._:-]{8,160}$/;
export const EVENT_MAX_REWARDS = Object.freeze({ participationXp: 100, victoryCoins: 20, completionBonusXp: 250, perfectBonusCoins: 50 });
const GAME_ROUTES: Readonly<Record<GameType, string>> = {
  [GameType.QUIZ]: "/jogar",
  [GameType.WORDLE]: "/jogos/wordle-biblico",
  [GameType.TIMELINE]: "/jogos/linha-do-tempo-biblica",
  [GameType.MEMORY]: "/jogos/memoria-biblica",
  [GameType.ASSOCIATION]: "/jogos/associacao-de-temas",
  [GameType.WHO_AM_I]: "/jogos/quem-sou-eu",
  [GameType.THREE_CLUES]: "/jogos/jogo-das-3-pistas",
};
const GAME_EVENT_SERVICES: Readonly<Record<GameType, string>> = {
  [GameType.QUIZ]: "quiz-service",
  [GameType.WORDLE]: "wordle-service",
  [GameType.TIMELINE]: "timeline-service",
  [GameType.MEMORY]: "memory-service",
  [GameType.ASSOCIATION]: "theme-association-service",
  [GameType.WHO_AM_I]: "who-am-i-service",
  [GameType.THREE_CLUES]: "three-clues-service",
};
const GAME_TITLES: Readonly<Record<GameType, string>> = {
  [GameType.QUIZ]: "Quiz Bíblico", [GameType.WORDLE]: "Wordle Bíblico",
  [GameType.TIMELINE]: "Linha do Tempo Bíblica", [GameType.MEMORY]: "Memória Bíblica",
  [GameType.ASSOCIATION]: "Associação de Temas", [GameType.WHO_AM_I]: "Quem Sou Eu?",
  [GameType.THREE_CLUES]: "Jogo das 3 Pistas",
};
type Identity = { organizationId: string; userId: string };
type EventInput = {
  title?: unknown; description?: unknown; coverUrl?: unknown; coverAssetId?: unknown; startsAt?: unknown; endsAt?: unknown;
  timeZone?: unknown; completionRule?: unknown; minimumParticipations?: unknown;
  participationXp?: unknown; victoryCoins?: unknown; completionBonusXp?: unknown; perfectBonusCoins?: unknown;
  games?: unknown;
};
type GameInput = { gameType: string; contentItems: Array<{ contentId: string; contentVersion: number }> };

const normalizedText = (value: unknown, max: number) => String(value ?? "").normalize("NFKC").trim().slice(0, max);
const integer = (value: unknown, fallback = 0) => Number.isSafeInteger(Number(value)) ? Number(value) : fallback;

function parseGames(value: unknown): GameInput[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > GAME_TYPES.size) throw new Error("invalid_event_games");
  const seen = new Set<string>();
  return value.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("invalid_event_games");
    const raw = item as Record<string, unknown>;
    const gameType = String(raw.gameType ?? "");
    if (!GAME_TYPES.has(gameType as any) || seen.has(gameType)) throw new Error("invalid_event_games");
    seen.add(gameType);
    if (!Array.isArray(raw.contentItems)) throw new Error("invalid_event_content");
    const contentItems = raw.contentItems.map(entry => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("invalid_event_content");
      const record = entry as Record<string, unknown>;
      const contentId = String(record.contentId ?? "");
      const contentVersion = Number(record.contentVersion);
      if (!ID.test(contentId) || !Number.isSafeInteger(contentVersion) || contentVersion < 1) throw new Error("invalid_event_content");
      return { contentId, contentVersion };
    });
    const expected = gameType === GameType.QUIZ ? 5 : 1;
    if (contentItems.length !== expected || new Set(contentItems.map(content => content.contentId)).size !== contentItems.length) {
      throw new Error("invalid_event_content_count");
    }
    return { gameType, contentItems };
  });
}

function normalizeEvent(input: EventInput) {
  const title = normalizedText(input.title, 120);
  const description = normalizedText(input.description, 1000);
  const coverUrl = normalizedText(input.coverUrl, 500) || null;
  const coverAssetId = normalizedText(input.coverAssetId, 160) || null;
  const startsAt = integer(input.startsAt);
  const endsAt = integer(input.endsAt);
  const timeZone = normalizedText(input.timeZone, 80) || "America/Sao_Paulo";
  const completionRule = input.completionRule === "MINIMUM" ? "MINIMUM" : "ALL";
  const games = parseGames(input.games);
  const minimumParticipations = completionRule === "ALL" ? games.length : integer(input.minimumParticipations, 1);
  const rewards = {
    participationXp: integer(input.participationXp), victoryCoins: integer(input.victoryCoins),
    completionBonusXp: integer(input.completionBonusXp), perfectBonusCoins: integer(input.perfectBonusCoins),
  };
  if (title.length < 3 || !Number.isSafeInteger(startsAt) || !Number.isSafeInteger(endsAt) || endsAt <= startsAt
    || minimumParticipations < 1 || minimumParticipations > games.length
    || rewards.participationXp < 0 || rewards.participationXp > EVENT_MAX_REWARDS.participationXp
    || rewards.victoryCoins < 0 || rewards.victoryCoins > EVENT_MAX_REWARDS.victoryCoins
    || rewards.completionBonusXp < 0 || rewards.completionBonusXp > EVENT_MAX_REWARDS.completionBonusXp
    || rewards.perfectBonusCoins < 0 || rewards.perfectBonusCoins > EVENT_MAX_REWARDS.perfectBonusCoins) {
    throw new Error("invalid_event");
  }
  return { title, description, coverUrl, coverAssetId, startsAt, endsAt, timeZone, completionRule, minimumParticipations, rewards, games };
}

async function assertEventAsset(env: AppEnv, organizationId: string, assetId: string | null) {
  if (!assetId) return;
  const owned = await env.DB.prepare("SELECT 1 ok FROM asset_registry WHERE id=?1 AND organization_id=?2 AND status='ACTIVE'")
    .bind(assetId, organizationId).first();
  if (!owned) throw new Error("invalid_event_cover_asset");
}

async function audit(env: AppEnv, identity: Identity, action: string, eventId: string, details: Record<string, unknown>, now: number) {
  await env.DB.prepare(`INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at)
    VALUES(?1,?2,?3,?4,'platform_event',?5,?6,?7)`)
    .bind(crypto.randomUUID(), identity.organizationId, identity.userId, action, eventId, JSON.stringify(details), now).run();
}

export async function createPlatformEvent(env: AppEnv, identity: Identity, input: EventInput, now = Date.now()) {
  const value = normalizeEvent(input);
  await assertEventAsset(env, identity.organizationId, value.coverAssetId);
  const id = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [env.DB.prepare(`INSERT INTO platform_events(
    id,organization_id,title,description,cover_url,starts_at,ends_at,time_zone,status,completion_rule,
    minimum_participations,participation_xp,victory_coins,completion_bonus_xp,perfect_bonus_coins,created_by,created_at,updated_at,cover_asset_id
  ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,'DRAFT',?9,?10,?11,?12,?13,?14,?15,?16,?16,?17)`)
    .bind(id, identity.organizationId, value.title, value.description, value.coverUrl, value.startsAt, value.endsAt,
      value.timeZone, value.completionRule, value.minimumParticipations, value.rewards.participationXp,
      value.rewards.victoryCoins, value.rewards.completionBonusXp, value.rewards.perfectBonusCoins, identity.userId, now, value.coverAssetId)];
  value.games.forEach((game, gameIndex) => {
    statements.push(env.DB.prepare(`INSERT INTO platform_event_games(event_id,organization_id,game_type,position)
      VALUES(?1,?2,?3,?4)`).bind(id, identity.organizationId, game.gameType, gameIndex + 1));
    game.contentItems.forEach((content, index) => statements.push(env.DB.prepare(`INSERT INTO platform_event_content_items(
      event_id,organization_id,game_type,content_id,content_version,position,algorithm_version
    ) VALUES(?1,?2,?3,?4,?5,?6,1)`).bind(id, identity.organizationId, game.gameType, content.contentId, content.contentVersion, index + 1)));
  });
  await env.DB.batch(statements);
  await audit(env, identity, "platform_event.created", id, { games: value.games.map(game => game.gameType) }, now);
  return getAdminEvent(env, identity.organizationId, id, now);
}

export async function updatePlatformEvent(env: AppEnv, identity: Identity, eventId: string, input: EventInput, now = Date.now()) {
  const current = await env.DB.prepare("SELECT status FROM platform_events WHERE id=?1 AND organization_id=?2")
    .bind(eventId, identity.organizationId).first<{ status: string }>();
  if (!current) throw new Error("event_not_found");
  if (current.status !== EventStatus.DRAFT) throw new Error("event_locked");
  const value = normalizeEvent(input);
  await assertEventAsset(env, identity.organizationId, value.coverAssetId);
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(`UPDATE platform_events SET title=?1,description=?2,cover_url=?3,starts_at=?4,ends_at=?5,time_zone=?6,
      completion_rule=?7,minimum_participations=?8,participation_xp=?9,victory_coins=?10,completion_bonus_xp=?11,
      perfect_bonus_coins=?12,updated_at=?13,cover_asset_id=?14 WHERE id=?15 AND organization_id=?16 AND status='DRAFT'`)
      .bind(value.title, value.description, value.coverUrl, value.startsAt, value.endsAt, value.timeZone,
        value.completionRule, value.minimumParticipations, value.rewards.participationXp, value.rewards.victoryCoins,
        value.rewards.completionBonusXp, value.rewards.perfectBonusCoins, now, value.coverAssetId, eventId, identity.organizationId),
    env.DB.prepare("DELETE FROM platform_event_content_items WHERE event_id=?1 AND organization_id=?2").bind(eventId, identity.organizationId),
    env.DB.prepare("DELETE FROM platform_event_games WHERE event_id=?1 AND organization_id=?2").bind(eventId, identity.organizationId),
  ];
  value.games.forEach((game, gameIndex) => {
    statements.push(env.DB.prepare("INSERT INTO platform_event_games(event_id,organization_id,game_type,position) VALUES(?1,?2,?3,?4)")
      .bind(eventId, identity.organizationId, game.gameType, gameIndex + 1));
    game.contentItems.forEach((content, index) => statements.push(env.DB.prepare(`INSERT INTO platform_event_content_items(
      event_id,organization_id,game_type,content_id,content_version,position,algorithm_version
    ) VALUES(?1,?2,?3,?4,?5,?6,1)`).bind(eventId, identity.organizationId, game.gameType, content.contentId, content.contentVersion, index + 1)));
  });
  await env.DB.batch(statements);
  await audit(env, identity, "platform_event.updated", eventId, { games: value.games.map(game => game.gameType) }, now);
  return getAdminEvent(env, identity.organizationId, eventId, now);
}

export async function validatePlatformEvent(env: AppEnv, organizationId: string, eventId: string, now = Date.now()) {
  const event = await getAdminEvent(env, organizationId, eventId, now);
  if (!event) throw new Error("event_not_found");
  const errors: string[] = [];
  if (event.endsAt <= event.startsAt) errors.push("invalid_window");
  if (!event.games.length) errors.push("games_required");
  for (const game of event.games) {
    const expected = game.gameType === GameType.QUIZ ? 5 : 1;
    if (game.contents.length !== expected) errors.push(`invalid_content_count:${game.gameType}`);
    for (const content of game.contents) {
      const row = await env.DB.prepare(`SELECT item.id FROM content_items item JOIN universal_content_library library
        ON library.organization_id=item.organization_id AND library.content_id=item.id AND library.content_version=item.version
        WHERE item.id=?1 AND item.organization_id=?2 AND item.game_type=?3 AND item.version=?4 AND item.status='PUBLISHED'
          AND library.availability_status IN ('AVAILABLE','RESERVED_EVENT')`).bind(content.contentId, organizationId, game.gameType, content.contentVersion).first();
      if (!row) errors.push(`content_unavailable:${game.gameType}:${content.contentId}`);
      const conflict = await env.DB.prepare(`SELECT reservation.event_id FROM platform_event_content_reservations reservation
        WHERE reservation.organization_id=?1 AND reservation.content_id=?2 AND reservation.content_version=?3
          AND reservation.released_at IS NULL AND reservation.event_id<>?4
          AND reservation.starts_at<?6 AND reservation.ends_at>?5 LIMIT 1`)
        .bind(organizationId, content.contentId, content.contentVersion, eventId, event.startsAt, event.endsAt).first();
      if (conflict) errors.push(`content_conflict:${content.contentId}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export async function schedulePlatformEvent(env: AppEnv, identity: Identity, eventId: string, now = Date.now()) {
  const event = await getAdminEvent(env, identity.organizationId, eventId, now);
  if (!event) throw new Error("event_not_found");
  if (event.status !== EventStatus.DRAFT) throw new Error("invalid_event_transition");
  const validation = await validatePlatformEvent(env, identity.organizationId, eventId, now);
  if (!validation.valid) return { scheduled: false, validation };
  const statements: D1PreparedStatement[] = [];
  for (const game of event.games) {
    const selectionId = `event_selection_${(await sha256(`${eventId}:${game.gameType}`)).slice(0, 24)}`;
    const seedHash = await sha256(`${identity.organizationId}|${eventId}|${game.gameType}|event-v1`);
    const fingerprint = await sha256(JSON.stringify(game.contents));
    statements.push(env.DB.prepare(`INSERT INTO generated_game_selections(
      id,organization_id,requested_by_user_id,game_type,mode,selection_key,algorithm_version,seed_hash,
      request_fingerprint,status,filters_json,created_at,expires_at
    ) VALUES(?1,?2,NULL,?3,'EVENT',?4,1,?5,?6,'ACTIVE','{}',?7,?8)`)
      .bind(selectionId, identity.organizationId, game.gameType, `event:${eventId}:${game.gameType}`, seedHash, fingerprint, now, event.endsAt));
    game.contents.forEach((content, index) => statements.push(env.DB.prepare(`INSERT INTO generated_game_selection_items(
      selection_id,organization_id,content_id,content_version,position,audit_metadata_json,created_at
    ) SELECT ?1,?2,library.content_id,library.content_version,?3,json_object(
      'difficulty',library.difficulty,'themes',json(library.themes_json),'books',json(library.books_json),
      'tags',json(library.tags_json),'priority',library.priority,'usageCount',library.usage_count),?4
      FROM universal_content_library library WHERE library.organization_id=?2 AND library.content_id=?5 AND library.content_version=?6`)
      .bind(selectionId, identity.organizationId, index + 1, now, content.contentId, content.contentVersion)));
    statements.push(env.DB.prepare("UPDATE platform_event_games SET selection_id=?1 WHERE event_id=?2 AND organization_id=?3 AND game_type=?4")
      .bind(selectionId, eventId, identity.organizationId, game.gameType));
    for (const content of game.contents) {
      statements.push(env.DB.prepare(`INSERT INTO platform_event_content_reservations(
        id,event_id,organization_id,content_id,content_version,starts_at,ends_at,created_at
      ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)`)
        .bind(crypto.randomUUID(), eventId, identity.organizationId, content.contentId, content.contentVersion, event.startsAt, event.endsAt, now));
      statements.push(env.DB.prepare(`UPDATE universal_content_library SET availability_status='RESERVED_EVENT',updated_at=?1
        WHERE organization_id=?2 AND content_id=?3 AND content_version=?4 AND availability_status='AVAILABLE'`)
        .bind(now, identity.organizationId, content.contentId, content.contentVersion));
    }
  }
  statements.push(env.DB.prepare("UPDATE platform_events SET status='SCHEDULED',scheduled_at=?1,updated_at=?1 WHERE id=?2 AND organization_id=?3 AND status='DRAFT'")
    .bind(now, eventId, identity.organizationId));
  await env.DB.batch(statements);
  await audit(env, identity, "platform_event.scheduled", eventId, { reservations: event.games.reduce((sum, game) => sum + game.contents.length, 0) }, now);
  return { scheduled: true, validation, event: await getAdminEvent(env, identity.organizationId, eventId, now) };
}

async function releaseEventReservations(env: AppEnv, organizationId: string, eventId: string, now: number) {
  const rows = await env.DB.prepare(`SELECT content_id contentId,content_version contentVersion FROM platform_event_content_reservations
    WHERE event_id=?1 AND organization_id=?2 AND released_at IS NULL`).bind(eventId, organizationId).all<any>();
  const statements: D1PreparedStatement[] = [env.DB.prepare(`UPDATE platform_event_content_reservations SET released_at=?1
    WHERE event_id=?2 AND organization_id=?3 AND released_at IS NULL`).bind(now, eventId, organizationId)];
  for (const row of rows.results) statements.push(env.DB.prepare(`UPDATE universal_content_library SET availability_status='AVAILABLE',updated_at=?1
    WHERE organization_id=?2 AND content_id=?3 AND content_version=?4 AND availability_status='RESERVED_EVENT'
      AND NOT EXISTS(SELECT 1 FROM platform_event_content_reservations active WHERE active.organization_id=?2
        AND active.content_id=?3 AND active.content_version=?4 AND active.released_at IS NULL AND active.event_id<>?5)`)
    .bind(now, organizationId, row.contentId, row.contentVersion, eventId));
  await env.DB.batch(statements);
}

export async function cancelPlatformEvent(env: AppEnv, identity: Identity, eventId: string, now = Date.now()) {
  const row = await env.DB.prepare("SELECT status FROM platform_events WHERE id=?1 AND organization_id=?2")
    .bind(eventId, identity.organizationId).first<{ status: string }>();
  if (!row) throw new Error("event_not_found");
  if (![EventStatus.DRAFT, EventStatus.SCHEDULED, EventStatus.ACTIVE].includes(row.status as EventStatus)) throw new Error("invalid_event_transition");
  await releaseEventReservations(env, identity.organizationId, eventId, now);
  await env.DB.batch([
    env.DB.prepare("UPDATE platform_events SET status='CANCELLED',cancelled_at=?1,updated_at=?1 WHERE id=?2 AND organization_id=?3")
      .bind(now, eventId, identity.organizationId),
    env.DB.prepare("UPDATE generated_game_selections SET status='EXPIRED' WHERE organization_id=?1 AND mode='EVENT' AND selection_key LIKE ?2")
      .bind(identity.organizationId, `event:${eventId}:%`),
  ]);
  await audit(env, identity, "platform_event.cancelled", eventId, {}, now);
  return { cancelled: true };
}

function effectiveStatus(row: any, now: number): EventStatus {
  if ([EventStatus.CANCELLED, EventStatus.FINISHED, EventStatus.DRAFT].includes(row.status)) return row.status;
  if (now >= Number(row.ends_at ?? row.endsAt)) return EventStatus.FINISHED;
  if (now >= Number(row.starts_at ?? row.startsAt)) return EventStatus.ACTIVE;
  return EventStatus.SCHEDULED;
}

export async function reconcileFinishedEvents(env: AppEnv, organizationId: string, now = Date.now()) {
  const expired = await env.DB.prepare(`SELECT id FROM platform_events WHERE organization_id=?1
    AND status IN ('SCHEDULED','ACTIVE') AND ends_at<=?2 ORDER BY ends_at,id LIMIT 25`).bind(organizationId, now).all<{ id: string }>();
  for (const item of expired.results) {
    await releaseEventReservations(env, organizationId, item.id, now);
    await env.DB.batch([
      env.DB.prepare("UPDATE platform_events SET status='FINISHED',updated_at=?1 WHERE id=?2 AND organization_id=?3 AND status IN ('SCHEDULED','ACTIVE')").bind(now, item.id, organizationId),
      env.DB.prepare("UPDATE platform_event_participations SET status='EXPIRED',updated_at=?1 WHERE event_id=?2 AND organization_id=?3 AND status IN ('CREATED','STARTED')").bind(now, item.id, organizationId),
      env.DB.prepare("UPDATE generated_game_selections SET status='EXPIRED' WHERE organization_id=?1 AND mode='EVENT' AND selection_key LIKE ?2").bind(organizationId, `event:${item.id}:%`),
    ]);
  }
  return { finished: expired.results.length };
}

export async function reconcilePlatformEvents(env: AppEnv, now = Date.now(), limit = 100) {
  const boundedLimit = Math.max(1, Math.min(250, Math.trunc(limit)));
  const expired = await env.DB.prepare(`SELECT id,organization_id organizationId FROM platform_events
    WHERE status IN ('SCHEDULED','ACTIVE') AND ends_at<=?1 ORDER BY ends_at,id LIMIT ?2`)
    .bind(now, boundedLimit).all<{ id: string; organizationId: string }>();
  let finished = 0;
  for (const item of expired.results) {
    const result = await reconcileFinishedEvents(env, item.organizationId, now);
    finished += result.finished;
  }
  return { scanned: expired.results.length, finished };
}

export async function listAdminEvents(env: AppEnv, organizationId: string, now = Date.now()) {
  await reconcileFinishedEvents(env, organizationId, now);
  const rows = await env.DB.prepare("SELECT * FROM platform_events WHERE organization_id=?1 ORDER BY starts_at DESC,id")
    .bind(organizationId).all<any>();
  return Promise.all(rows.results.map(row => hydrateEvent(env, row, now, false)));
}

export async function getAdminEvent(env: AppEnv, organizationId: string, eventId: string, now = Date.now()) {
  await reconcileFinishedEvents(env, organizationId, now);
  const row = await env.DB.prepare("SELECT * FROM platform_events WHERE id=?1 AND organization_id=?2")
    .bind(eventId, organizationId).first<any>();
  return row ? hydrateEvent(env, row, now, false) : null;
}

async function hydrateEvent(env: AppEnv, row: any, now: number, participant: boolean, userId?: string) {
  const games = await env.DB.prepare(`SELECT game.game_type gameType,game.position,game.selection_id selectionId,
    content.content_id contentId,content.content_version contentVersion,content.position contentPosition,
    item.category,item.difficulty,item.biblical_reference biblicalReference,json_extract(item.payload_json,'$.title') contentTitle
    FROM platform_event_games game LEFT JOIN platform_event_content_items content ON content.event_id=game.event_id AND content.game_type=game.game_type
    LEFT JOIN content_items item ON item.id=content.content_id AND item.organization_id=content.organization_id
    WHERE game.event_id=?1 AND game.organization_id=?2 ORDER BY game.position,content.position`)
    .bind(String(row.id), String(row.organization_id)).all<any>();
  const grouped = new Map<string, any>();
  for (const game of games.results) {
    if (!grouped.has(game.gameType)) grouped.set(game.gameType, { gameType: game.gameType, title: GAME_TITLES[game.gameType as GameType], position: game.position, selectionId: game.selectionId, contents: [] });
    if (game.contentId) grouped.get(game.gameType).contents.push({ contentId: game.contentId, contentVersion: game.contentVersion,
      position: game.contentPosition, title: game.contentTitle || game.contentId, category: game.category,
      difficulty: game.difficulty, biblicalReference: game.biblicalReference });
  }
  let progress: any[] = [];
  if (participant && userId) {
    const states = await env.DB.prepare(`SELECT game_type gameType,status,outcome,selection_id selectionId
      FROM platform_event_participations WHERE event_id=?1 AND organization_id=?2 AND user_id=?3`)
      .bind(String(row.id), String(row.organization_id), userId).all<any>();
    const byGame = new Map(states.results.map(item => [item.gameType, item]));
    progress = [...grouped.values()].map(game => ({ ...game, status: byGame.get(game.gameType)?.status ?? "CREATED", outcome: byGame.get(game.gameType)?.outcome ?? null,
      playHref: game.selectionId ? `${GAME_ROUTES[game.gameType]}?event=${encodeURIComponent(game.selectionId)}&eventId=${encodeURIComponent(String(row.id))}` : null }));
  }
  return {
    id: String(row.id), title: String(row.title), description: String(row.description), coverUrl: row.cover_url ?? null,
    coverAssetId: row.cover_asset_id ?? null,
    startsAt: Number(row.starts_at), endsAt: Number(row.ends_at), timeZone: String(row.time_zone), status: effectiveStatus(row, now),
    completionRule: String(row.completion_rule), minimumParticipations: Number(row.minimum_participations),
    rewards: { participationXp: Number(row.participation_xp), victoryCoins: Number(row.victory_coins),
      completionBonusXp: Number(row.completion_bonus_xp), perfectBonusCoins: Number(row.perfect_bonus_coins) },
    games: participant ? progress : [...grouped.values()],
  };
}

export async function listParticipantEvents(env: AppEnv, identity: Identity, now = Date.now()) {
  await reconcileFinishedEvents(env, identity.organizationId, now);
  const rows = await env.DB.prepare(`SELECT * FROM platform_events WHERE organization_id=?1 AND status IN ('SCHEDULED','ACTIVE','FINISHED')
    AND ends_at>=?2 ORDER BY CASE WHEN starts_at<=?3 THEN 0 ELSE 1 END,starts_at LIMIT 20`)
    .bind(identity.organizationId, now - 30 * 86400000, now).all<any>();
  return Promise.all(rows.results.map(row => hydrateEvent(env, row, now, true, identity.userId)));
}

export async function getParticipantEvent(env: AppEnv, identity: Identity, eventId: string, now = Date.now()) {
  await reconcileFinishedEvents(env, identity.organizationId, now);
  const row = await env.DB.prepare(`SELECT * FROM platform_events WHERE id=?1 AND organization_id=?2
    AND status IN ('SCHEDULED','ACTIVE','FINISHED')`).bind(eventId, identity.organizationId).first<any>();
  return row ? hydrateEvent(env, row, now, true, identity.userId) : null;
}

export async function startEventSelection(env: AppEnv, identity: Identity, eventId: string, selectionId: string, now = Date.now()) {
  const event = await env.DB.prepare(`SELECT event.*,game.game_type gameType FROM platform_events event JOIN platform_event_games game ON game.event_id=event.id
    WHERE event.id=?1 AND event.organization_id=?2 AND game.selection_id=?3`).bind(eventId, identity.organizationId, selectionId).first<any>();
  if (!event) throw new Error("invalid_event_selection");
  if (effectiveStatus(event, now) !== EventStatus.ACTIVE || now < Number(event.starts_at) || now >= Number(event.ends_at)) throw new Error("event_not_active");
  const selection = await findGeneratedSelectionById(env, identity.organizationId, selectionId);
  if (!selection || selection.mode !== GameMode.EVENT || selection.gameType !== event.gameType) throw new Error("invalid_event_selection");
  const id = `event_participation_${(await sha256(`${eventId}:${selectionId}:${identity.userId}`)).slice(0, 24)}`;
  await env.DB.prepare(`INSERT INTO platform_event_participations(
    id,event_id,selection_id,organization_id,user_id,game_type,status,created_at,updated_at
  ) VALUES(?1,?2,?3,?4,?5,?6,'CREATED',?7,?7) ON CONFLICT(event_id,user_id,game_type) DO NOTHING`)
    .bind(id, eventId, selectionId, identity.organizationId, identity.userId, selection.gameType, now).run();
  const participation = await env.DB.prepare(`SELECT * FROM platform_event_participations
    WHERE event_id=?1 AND selection_id=?2 AND organization_id=?3 AND user_id=?4`).bind(eventId, selectionId, identity.organizationId, identity.userId).first<any>();
  if (!participation || participation.status === "FINISHED") throw new Error("event_attempt_finished");
  const eventIdStarted = `event:${eventId}:${selectionId}:${identity.userId}:started`;
  await env.DB.prepare(`UPDATE platform_event_participations SET status='STARTED',started_at=COALESCE(started_at,?1),
    start_event_id=COALESCE(start_event_id,?2),updated_at=?1 WHERE id=?3 AND status IN ('CREATED','STARTED')`)
    .bind(now, eventIdStarted, participation.id).run();
  if (!participation.start_event_id) await publishOfficialCoreEvent(env, {
    eventId: eventIdStarted, eventType: "GAME_STARTED", occurredAt: now, organizationId: identity.organizationId, userId: identity.userId,
    source: { kind: "game", service: GAME_EVENT_SERVICES[selection.gameType as GameType], gameId: selection.gameType, sourceId: String(participation.id) },
    payload: { sessionType: "event" }, version: 1,
  }, now);
  return { participationId: String(participation.id), status: "STARTED" };
}

export async function eventSelectionContext(env: AppEnv, identity: Identity, eventId: string, selectionId: string, gameType: string, now = Date.now()) {
  const event = await env.DB.prepare("SELECT * FROM platform_events WHERE id=?1 AND organization_id=?2")
    .bind(eventId, identity.organizationId).first<any>();
  if (!event || effectiveStatus(event, now) !== EventStatus.ACTIVE || now >= Number(event.ends_at)) throw new Error("event_not_active");
  const selection = await findGeneratedSelectionById(env, identity.organizationId, selectionId);
  if (!selection || selection.mode !== GameMode.EVENT || selection.gameType !== gameType) throw new Error("invalid_event_selection");
  const participation = await env.DB.prepare(`SELECT * FROM platform_event_participations WHERE event_id=?1 AND selection_id=?2
    AND organization_id=?3 AND user_id=?4 AND game_type=?5`).bind(eventId, selectionId, identity.organizationId, identity.userId, gameType).first<any>();
  if (!participation || participation.status !== "STARTED") throw new Error("event_participation_not_started");
  return { event, selection, participation, contents: await generatedSelectionHistoricalContents(env, identity.organizationId, selection) };
}

export async function getEventSelection(env: AppEnv, identity: Identity, eventId: string, selectionId: string, now = Date.now()) {
  const game = await env.DB.prepare("SELECT game_type gameType FROM platform_event_games WHERE event_id=?1 AND organization_id=?2 AND selection_id=?3")
    .bind(eventId, identity.organizationId, selectionId).first<any>();
  if (!game) throw new Error("invalid_event_selection");
  const context = await eventSelectionContext(env, identity, eventId, selectionId, String(game.gameType), now);
  const content = await generatedSelectionSafePayload(context.selection, context.contents);
  return { selectionId, participationId: String(context.participation.id), gameType: context.selection.gameType,
    title: "Desafio do evento", content, expiresAt: Number(context.event.ends_at) };
}

export async function finishEventParticipation(env: AppEnv, identity: Identity, eventId: string, selectionId: string, finishEventId: string, outcome: "won" | "lost", now = Date.now()) {
  const row = await env.DB.prepare(`SELECT participation.*,event.participation_xp participationXp,event.victory_coins victoryCoins,
    event.completion_bonus_xp completionBonusXp,event.perfect_bonus_coins perfectBonusCoins,event.completion_rule completionRule,
    event.minimum_participations minimumParticipations
    FROM platform_event_participations participation JOIN platform_events event ON event.id=participation.event_id
    WHERE participation.event_id=?1 AND participation.selection_id=?2 AND participation.organization_id=?3 AND participation.user_id=?4`)
    .bind(eventId, selectionId, identity.organizationId, identity.userId).first<any>();
  if (!row) throw new Error("event_participation_not_found");
  if (row.status === "FINISHED") return { duplicate: true };
  if (row.status !== "STARTED") throw new Error("event_participation_not_active");
  await env.DB.prepare(`UPDATE platform_event_participations SET status='FINISHED',outcome=?1,finished_at=?2,finish_event_id=?3,updated_at=?2
    WHERE id=?4 AND status='STARTED'`).bind(outcome, now, finishEventId, row.id).run();
  if (Number(row.participationXp) > 0) await grantXp(env, { eventId: `event-participation:${eventId}:${identity.userId}`,
    userId: identity.userId, organizationId: identity.organizationId, amount: Number(row.participationXp), reason: "Participação em evento", sourceType: "platform_event", sourceId: eventId });
  if (Number(row.participationXp) > 0) await recordEventReward(env, identity, eventId, "participation", Number(row.participationXp), 0, now);
  if (outcome === "won" && Number(row.victoryCoins) > 0) await grantCoins(env, { eventId: `event-victory:${eventId}:${identity.userId}`,
    userId: identity.userId, organizationId: identity.organizationId, amount: Number(row.victoryCoins), reason: "Vitória em evento", sourceType: "platform_event", sourceId: eventId });
  if (outcome === "won" && Number(row.victoryCoins) > 0) await recordEventReward(env, identity, eventId, "victory", 0, Number(row.victoryCoins), now);
  const totals = await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM platform_event_games WHERE event_id=?1 AND organization_id=?2) total,
    COUNT(*) started,SUM(CASE WHEN status='FINISHED' THEN 1 ELSE 0 END) finished,
    SUM(CASE WHEN outcome='won' THEN 1 ELSE 0 END) wins FROM platform_event_participations
    WHERE event_id=?1 AND organization_id=?2 AND user_id=?3`).bind(eventId, identity.organizationId, identity.userId).first<any>();
  const completed = row.completionRule === "ALL" ? Number(totals?.finished) === Number(totals?.total) : Number(totals?.finished) >= Number(row.minimumParticipations);
  if (completed && Number(row.completionBonusXp) > 0) await grantXp(env, { eventId: `event-completion:${eventId}:${identity.userId}`,
    userId: identity.userId, organizationId: identity.organizationId, amount: Number(row.completionBonusXp), reason: "Evento concluído", sourceType: "platform_event", sourceId: eventId });
  if (completed && Number(row.completionBonusXp) > 0) await recordEventReward(env, identity, eventId, "completion", Number(row.completionBonusXp), 0, now);
  if (completed && Number(totals?.wins) === Number(totals?.total) && Number(totals?.started) === Number(totals?.total) && Number(row.perfectBonusCoins) > 0) await grantCoins(env, { eventId: `event-perfect:${eventId}:${identity.userId}`,
    userId: identity.userId, organizationId: identity.organizationId, amount: Number(row.perfectBonusCoins), reason: "Evento perfeito", sourceType: "platform_event", sourceId: eventId });
  if (completed && Number(totals?.wins) === Number(totals?.total) && Number(totals?.started) === Number(totals?.total) && Number(row.perfectBonusCoins) > 0) await recordEventReward(env, identity, eventId, "perfect", 0, Number(row.perfectBonusCoins), now);
  return { duplicate: false, completed };
}

async function recordEventReward(env: AppEnv, identity: Identity, eventId: string, rewardType: "participation" | "victory" | "completion" | "perfect", xp: number, coins: number, now: number) {
  const id = `event_reward_${(await sha256(`${eventId}:${identity.userId}:${rewardType}`)).slice(0, 24)}`;
  await env.DB.prepare(`INSERT INTO platform_event_reward_ledger(id,event_id,organization_id,user_id,reward_type,xp_amount,coin_amount,created_at)
    VALUES(?1,?2,?3,?4,?5,?6,?7,?8) ON CONFLICT(event_id,user_id,reward_type) DO NOTHING`)
    .bind(id, eventId, identity.organizationId, identity.userId, rewardType, xp, coins, now).run();
}

export async function suggestEventContent(env: AppEnv, organizationId: string, input: Record<string, unknown>) {
  const gameType = String(input.gameType ?? "");
  const count = Math.max(1, Math.min(gameType === GameType.QUIZ ? 20 : 10, integer(input.count, gameType === GameType.QUIZ ? 5 : 1)));
  if (!GAME_TYPES.has(gameType as any)) throw new Error("invalid_event_game");
  const items = await listEligibleUniversalContent(env, { organizationId, gameType, difficulty: input.difficulty as any, theme: normalizedText(input.theme, 100) || undefined, limit: 200 });
  return items.slice(0, count).map(item => ({ contentId: item.contentId, contentVersion: item.contentVersion, gameType: item.gameType,
    difficulty: item.difficulty, themes: item.themes, books: item.books, tags: item.tags }));
}

export async function listEventContentOptions(env: AppEnv, organizationId: string, input: Record<string, unknown>) {
  const gameType = String(input.gameType ?? "");
  if (!GAME_TYPES.has(gameType as GameType)) throw new Error("invalid_event_game");
  const difficulty = normalizedText(input.difficulty, 30) || undefined;
  const theme = normalizedText(input.theme, 100) || undefined;
  const search = normalizedText(input.search, 120).toLocaleLowerCase("pt-BR");
  const eligible = await listEligibleUniversalContent(env, {
    organizationId,
    gameType,
    difficulty: difficulty as any,
    theme,
    limit: 200,
  });
  const ids = eligible.map(item => item.contentId);
  const details = new Map<string, { title: string; category: string; biblicalReference: string | null }>();
  for (let offset = 0; offset < ids.length; offset += 90) {
    const batch = ids.slice(offset, offset + 90);
    if (!batch.length) continue;
    const placeholders = batch.map((_, index) => `?${index + 2}`).join(",");
    const rows = await env.DB.prepare(`SELECT id,category,biblical_reference biblicalReference,
      COALESCE(json_extract(payload_json,'$.title'),json_extract(payload_json,'$.question'),category) title
      FROM content_items WHERE organization_id=?1 AND id IN (${placeholders}) AND status='PUBLISHED'`)
      .bind(organizationId, ...batch).all<any>();
    for (const row of rows.results) details.set(String(row.id), {
      title: normalizedText(row.title, 180) || "Conteúdo publicado",
      category: normalizedText(row.category, 100),
      biblicalReference: row.biblicalReference ? normalizedText(row.biblicalReference, 160) : null,
    });
  }
  const availability = await env.DB.prepare(`SELECT availability_status status,COUNT(*) total
    FROM universal_content_library WHERE organization_id=?1 AND game_type=?2 GROUP BY availability_status`)
    .bind(organizationId, gameType).all<{ status: string; total: number }>();
  const counts = Object.fromEntries(availability.results.map(row => [row.status, Number(row.total)]));
  const options = eligible.map(item => ({
    contentId: item.contentId,
    contentVersion: item.contentVersion,
    gameType: item.gameType,
    difficulty: item.difficulty,
    themes: item.themes,
    tags: item.tags,
    title: details.get(item.contentId)?.title ?? "Conteúdo publicado",
    category: details.get(item.contentId)?.category ?? "",
    biblicalReference: details.get(item.contentId)?.biblicalReference ?? null,
  })).filter(item => !search || [item.title, item.category, item.biblicalReference, ...item.themes, ...item.tags]
    .filter(Boolean).some(value => String(value).toLocaleLowerCase("pt-BR").includes(search)));
  return { options, counts: { available: counts.AVAILABLE ?? 0, reserved: counts.RESERVED_EVENT ?? 0, archived: counts.ARCHIVED ?? 0 } };
}
