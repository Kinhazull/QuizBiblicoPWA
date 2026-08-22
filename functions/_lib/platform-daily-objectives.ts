import {
  ContentStatus,
  Difficulty,
  GameType,
  validateContent,
  type AssociationContentPayload,
  type GameType as GameTypeValue,
  type MemoryContentPayload,
  type QuizContentPayload,
  type ThreeCluesContentPayload,
  type TimelineContentPayload,
  type WhoAmIContentPayload,
  type WordleContentPayload,
} from "../../shared/content";
import type { AppEnv } from "./auth";
import { associationRoundFromContent } from "./game-integrations/association-content";
import { memorySetFromContent } from "./game-integrations/memory-content";
import { threeCluesChallengesFromContent } from "./game-integrations/three-clues-content";
import { timelineRoundFromContent } from "./game-integrations/timeline-content";
import { whoAmIChallengesFromContent } from "./game-integrations/who-am-i-content";
import { evaluateGuess, normalizeWord } from "../../app/games/wordle/engine";
import { isPublishedWordleGuess } from "./wordle-lexicon";
import { isCorrectTimelineOrder } from "../../app/games/timeline/engine";
import { normalizeThreeCluesAnswer } from "../../app/games/three-clues/engine";
import { normalizeWhoAmIAnswer } from "../../app/games/who-am-i/engine";
import { GameGenerationMode, type GeneratedGameSelection } from "./universal-game-generation-contract";
import { findGeneratedSelectionById, generateUniversalGameSelection } from "./universal-game-generator";
import { publishOfficialCoreEvent } from "./platform-event-runtime";
import { sha256 } from "./security";

const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
const DAILY_ALGORITHM_VERSION = 1;
const DAILY_GAMES = [
  GameType.WORDLE,
  GameType.QUIZ,
  GameType.TIMELINE,
  GameType.MEMORY,
  GameType.ASSOCIATION,
  GameType.WHO_AM_I,
  GameType.THREE_CLUES,
] as const;
type DailyGameType = typeof DAILY_GAMES[number];

export const DailyObjectiveLifecycle = Object.freeze({
  CREATED: "CREATED",
  STARTED: "STARTED",
  FINISHED: "FINISHED",
  EXPIRED: "EXPIRED",
} as const);
export type DailyObjectiveStatus = typeof DailyObjectiveLifecycle[keyof typeof DailyObjectiveLifecycle];

export const DailyObjectiveUnavailableReason = Object.freeze({
  INSUFFICIENT_CATALOG: "insufficient_catalog",
  NO_PUBLISHED_CONTENT: "no_published_content",
  UNSUPPORTED_GAME: "unsupported_game",
  GENERATION_FAILED: "generation_failed",
} as const);

type Identity = { organizationId: string; userId: string };
type HistoricalContent = {
  id: string;
  version: number;
  metadata: Record<string, unknown>;
  payload: Record<string, unknown>;
};

const safeJson = <T>(value: unknown, fallback: T): T => {
  try { return JSON.parse(String(value ?? "")) as T; } catch { return fallback; }
};

export function organizationDayKey(at: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(at));
}

function nextOrganizationDayStart(at: number, timeZone: string) {
  const current = organizationDayKey(at, timeZone);
  let high = at + 60 * 60 * 1000;
  while (organizationDayKey(high, timeZone) === current && high < at + 32 * 60 * 60 * 1000) {
    high += 60 * 60 * 1000;
  }
  let low = high - 60 * 60 * 1000;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (organizationDayKey(middle, timeZone) === current) low = middle;
    else high = middle;
  }
  return high;
}

export function dailySelectionKey(dayKey: string, gameType: DailyGameType) {
  return `daily:${dayKey}:${gameType}:v${DAILY_ALGORITHM_VERSION}`;
}

export function dailySeed(organizationId: string, dayKey: string, gameType: DailyGameType) {
  return `${organizationId}:${dayKey}:${gameType}:v${DAILY_ALGORITHM_VERSION}`;
}

export const dailyWordleSelectionKey = (dayKey: string) =>
  dailySelectionKey(dayKey, GameType.WORDLE);
export const dailyWordleSeed = (organizationId: string, dayKey: string) =>
  dailySeed(organizationId, dayKey, GameType.WORDLE);

function isDailyGameType(value: string): value is DailyGameType {
  return DAILY_GAMES.includes(value as DailyGameType);
}

async function organizationContext(env: AppEnv, organizationId: string) {
  const organization = await env.DB.prepare(
    "SELECT timezone FROM organizations WHERE id=?1",
  ).bind(organizationId).first<Record<string, unknown>>();
  if (!organization) throw new Error("daily_objective_organization_unavailable");
  return { timeZone: String(organization.timezone || DEFAULT_TIME_ZONE) };
}

function generationRequest(
  organizationId: string,
  dayKey: string,
  gameType: DailyGameType,
  expiresAt: number,
) {
  return {
    organizationId,
    gameType,
    mode: GameGenerationMode.DAILY,
    selectionKey: dailySelectionKey(dayKey, gameType),
    algorithmVersion: DAILY_ALGORITHM_VERSION,
    seed: dailySeed(organizationId, dayKey, gameType),
    count: gameType === GameType.QUIZ ? 5 : 1,
    difficultyDistribution: gameType === GameType.QUIZ ? {
      [Difficulty.EASY]: 2,
      [Difficulty.MEDIUM]: 2,
      [Difficulty.HARD]: 1,
    } : undefined,
    expiresAt,
  };
}

export async function generatedSelectionHistoricalContents(
  env: AppEnv,
  organizationId: string,
  selection: GeneratedGameSelection,
) {
  const contents: HistoricalContent[] = [];
  for (const item of selection.items) {
    const row = await env.DB.prepare(`SELECT metadata_json,payload_json
      FROM content_versions WHERE organization_id=?1 AND content_id=?2 AND version=?3`)
      .bind(organizationId, item.contentId, item.contentVersion)
      .first<Record<string, unknown>>();
    if (!row) throw new Error("daily_historical_content_unavailable");
    const metadata = safeJson<Record<string, unknown>>(row.metadata_json, {});
    const payload = safeJson<Record<string, unknown>>(row.payload_json, {});
    if (
      metadata.status !== ContentStatus.PUBLISHED
      || metadata.gameType !== selection.gameType
      || !validateContent(selection.gameType as GameTypeValue, metadata, payload).valid
    ) throw new Error("daily_historical_content_invalid");
    contents.push({ id: item.contentId, version: item.contentVersion, metadata, payload });
  }
  return contents;
}

async function deterministicOrder<T>(items: readonly T[], seed: string, identity: (item: T) => string) {
  const keyed = await Promise.all(items.map(async item => ({
    item,
    key: await sha256(`${seed}:${identity(item)}`),
  })));
  return keyed.sort((a, b) => a.key.localeCompare(b.key)).map(item => item.item);
}

export async function dailyMemoryCards(
  seed: string,
  contentId: string,
  payload: MemoryContentPayload,
) {
  const set = await memorySetFromContent(contentId, payload);
  const cards = await Promise.all(set.pairs.flatMap(pair => [
    { pairId: pair.id, side: "a" as const, label: pair.front },
    { pairId: pair.id, side: "b" as const, label: pair.back },
  ]).map(async card => ({
    ...card,
    id: `card-${(await sha256(`${seed}:${card.pairId}:${card.side}`)).slice(0, 24)}`,
  })));
  return { set, cards: await deterministicOrder(cards, seed, card => card.id) };
}

export async function generatedSelectionSafePayload(
  selection: GeneratedGameSelection,
  contents: HistoricalContent[],
) {
  const seed = selection.seedHash;
  if (selection.gameType === GameType.WORDLE) {
    const content = contents[0];
    const wordle = content.payload as WordleContentPayload;
    return {
      id: content.id,
      version: content.version,
      hint: wordle.hint,
      wordLength: normalizeWord(wordle.word).length,
      biblicalReference: content.metadata.biblicalReference ?? null,
    };
  }
  if (selection.gameType === GameType.QUIZ) {
    return {
      questions: await Promise.all(contents.map(async content => {
        const quiz = content.payload as QuizContentPayload;
        const choices = await deterministicOrder(
          quiz.choices.map((choice, index) => ({ id: `choice-${index + 1}`, text: choice.text })),
          `${seed}:${content.id}`,
          choice => choice.id,
        );
        return {
          id: content.id,
          version: content.version,
          prompt: quiz.prompt,
          choices,
          biblicalReference: content.metadata.biblicalReference ?? null,
        };
      })),
    };
  }
  if (selection.gameType === GameType.TIMELINE) {
    const content = contents[0];
    const round = await timelineRoundFromContent(content.id, content.payload as TimelineContentPayload);
    return {
      id: content.id,
      version: content.version,
      title: round.title,
      events: (await deterministicOrder(round.events, seed, event => event.id)).map(event => ({
        id: event.id, title: event.title, description: event.description ?? null,
      })),
      biblicalReference: content.metadata.biblicalReference ?? null,
    };
  }
  if (selection.gameType === GameType.MEMORY) {
    const content = contents[0];
    const { set, cards } = await dailyMemoryCards(
      seed,
      content.id,
      content.payload as MemoryContentPayload,
    );
    return {
      id: content.id,
      version: content.version,
      title: set.title,
      cards: cards.map(card => ({ id: card.id, label: card.label })),
      pairCount: set.pairs.length,
      biblicalReference: content.metadata.biblicalReference ?? null,
    };
  }
  if (selection.gameType === GameType.ASSOCIATION) {
    const content = contents[0];
    const round = await associationRoundFromContent(content.id, content.payload as AssociationContentPayload);
    return {
      id: content.id,
      version: content.version,
      title: round.title,
      leftItems: (await deterministicOrder(round.pairs, `${seed}:left`, pair => pair.leftId))
        .map(pair => ({ id: pair.leftId, label: pair.left, category: pair.category ?? null })),
      rightItems: (await deterministicOrder(round.pairs, `${seed}:right`, pair => pair.rightId))
        .map(pair => ({ id: pair.rightId, label: pair.right })),
      pairCount: round.pairs.length,
      biblicalReference: content.metadata.biblicalReference ?? null,
    };
  }
  if (selection.gameType === GameType.WHO_AM_I) {
    const content = contents[0];
    const challenges = await whoAmIChallengesFromContent(content.id, content.payload as WhoAmIContentPayload);
    return {
      id: content.id,
      version: content.version,
      title: (content.payload as WhoAmIContentPayload).title,
      challenges: challenges.map(challenge => ({ id: challenge.id, hints: challenge.hints })),
      biblicalReference: content.metadata.biblicalReference ?? null,
    };
  }
  if (selection.gameType === GameType.THREE_CLUES) {
    const content = contents[0];
    const challenges = await threeCluesChallengesFromContent(content.id, content.payload as ThreeCluesContentPayload);
    return {
      id: content.id,
      version: content.version,
      title: (content.payload as ThreeCluesContentPayload).title,
      challenges: challenges.map(challenge => ({ id: challenge.id, clues: challenge.clues })),
      biblicalReference: content.metadata.biblicalReference ?? null,
    };
  }
  throw new Error("unsupported_daily_game");
}

export async function ensureGeneratedParticipation(
  env: AppEnv,
  identity: Identity,
  selection: GeneratedGameSelection,
  now: number,
) {
  const id = `participation_${(await sha256(`${selection.id}:${identity.userId}`)).slice(0, 32)}`;
  await env.DB.prepare(`INSERT INTO generated_game_participations(
    id,selection_id,organization_id,user_id,game_type,mode,status,created_at,updated_at
  ) VALUES(?1,?2,?3,?4,?5,?6,'CREATED',?7,?7)
  ON CONFLICT(selection_id,user_id) DO NOTHING`)
    .bind(
      id,
      selection.id,
      identity.organizationId,
      identity.userId,
      selection.gameType,
      selection.mode,
      now,
    ).run();
  return env.DB.prepare(`SELECT * FROM generated_game_participations
    WHERE selection_id=?1 AND user_id=?2 AND organization_id=?3`)
    .bind(selection.id, identity.userId, identity.organizationId).first<Record<string, unknown>>();
}

function participationStatus(row: Record<string, unknown>, expiresAt: number, now: number) {
  return now >= expiresAt && row.status !== DailyObjectiveLifecycle.FINISHED
    ? DailyObjectiveLifecycle.EXPIRED
    : String(row.status) as DailyObjectiveStatus;
}

function objectiveTitle(gameType: DailyGameType) {
  return ({
    [GameType.WORDLE]: "Wordle Diário",
    [GameType.QUIZ]: "Quiz Diário",
    [GameType.TIMELINE]: "Linha do Tempo Diária",
    [GameType.MEMORY]: "Memória Diária",
    [GameType.ASSOCIATION]: "Associação Diária",
    [GameType.WHO_AM_I]: "Quem Sou Eu? Diário",
    [GameType.THREE_CLUES]: "Três Pistas Diário",
  } as const)[gameType];
}

function playHref(gameType: DailyGameType, selectionId: string) {
  const routes: Record<DailyGameType, string> = {
    [GameType.WORDLE]: "/jogos/wordle-biblico",
    [GameType.QUIZ]: "/jogar",
    [GameType.TIMELINE]: "/jogos/linha-do-tempo-biblica",
    [GameType.MEMORY]: "/jogos/memoria-biblica",
    [GameType.ASSOCIATION]: "/jogos/associacao-de-temas",
    [GameType.WHO_AM_I]: "/jogos/quem-sou-eu",
    [GameType.THREE_CLUES]: "/jogos/jogo-das-3-pistas",
  };
  return `${routes[gameType]}?daily=${encodeURIComponent(selectionId)}`;
}

function unavailability(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "insufficient_eligible_content") return DailyObjectiveUnavailableReason.INSUFFICIENT_CATALOG;
  if (message.includes("unsupported") || message === "invalid_generation_request") {
    return DailyObjectiveUnavailableReason.UNSUPPORTED_GAME;
  }
  if (message.includes("content_unavailable")) return DailyObjectiveUnavailableReason.NO_PUBLISHED_CONTENT;
  return DailyObjectiveUnavailableReason.GENERATION_FAILED;
}

export async function getDailyObjective(
  env: AppEnv,
  identity: Identity,
  gameType: string,
  now = Date.now(),
) {
  if (!isDailyGameType(gameType)) throw new Error("unsupported_daily_game");
  const { timeZone } = await organizationContext(env, identity.organizationId);
  const dayKey = organizationDayKey(now, timeZone);
  const expiresAt = nextOrganizationDayStart(now, timeZone);
  const generated = await generateUniversalGameSelection(
    env,
    generationRequest(identity.organizationId, dayKey, gameType, expiresAt),
    now,
  );
  if (!generated.ok) throw new Error(generated.error.code);
  const contents = await generatedSelectionHistoricalContents(env, identity.organizationId, generated.selection);
  const participation = await ensureGeneratedParticipation(env, identity, generated.selection, now);
  if (!participation) throw new Error("daily_participation_unavailable");
  const resolvedExpiry = generated.selection.expiresAt || expiresAt;
  return {
    id: generated.selection.id,
    selectionId: generated.selection.id,
    participationId: String(participation.id),
    gameType,
    title: objectiveTitle(gameType),
    dayKey,
    selectionKey: generated.selection.selectionKey,
    algorithmVersion: generated.selection.algorithmVersion,
    status: participationStatus(participation, resolvedExpiry, now),
    availability: "AVAILABLE" as const,
    unavailableReason: null,
    expiresAt: resolvedExpiry,
    content: await generatedSelectionSafePayload(generated.selection, contents),
    playHref: playHref(gameType, generated.selection.id),
  };
}

export async function listDailyObjectives(env: AppEnv, identity: Identity, now = Date.now()) {
  return Promise.all(DAILY_GAMES.map(async gameType => {
    try {
      const objective = await getDailyObjective(env, identity, gameType, now);
      return {
        gameType: objective.gameType,
        selectionId: objective.selectionId,
        title: objective.title,
        status: objective.status,
        availability: objective.availability,
        unavailableReason: null,
        playHref: objective.playHref,
        expiresAt: objective.expiresAt,
      };
    } catch (error) {
      console.error("daily_objective_generation_failed", {
        gameType,
        code: error instanceof Error ? error.message : "unknown_error",
      });
      return {
        gameType,
        selectionId: null,
        title: objectiveTitle(gameType),
        status: DailyObjectiveLifecycle.CREATED,
        availability: "UNAVAILABLE" as const,
        unavailableReason: unavailability(error),
        playHref: null,
        expiresAt: null,
      };
    }
  }));
}

export function getDailyWordleObjective(env: AppEnv, identity: Identity, now = Date.now()) {
  return getDailyObjective(env, identity, GameType.WORDLE, now);
}

export async function startDailyObjective(
  env: AppEnv,
  identity: Identity,
  selectionId: string,
  now = Date.now(),
) {
  const selection = await findGeneratedSelectionById(env, identity.organizationId, selectionId);
  if (!selection || selection.mode !== GameGenerationMode.DAILY || !isDailyGameType(selection.gameType)) {
    throw new Error("invalid_daily_selection");
  }
  if (selection.expiresAt === null || now >= selection.expiresAt) throw new Error("daily_selection_expired");
  return startGeneratedSelection(env, identity, selection, GameGenerationMode.DAILY, now);
}

export async function startGeneratedSelection(
  env: AppEnv,
  identity: Identity,
  selection: GeneratedGameSelection,
  expectedMode: typeof GameGenerationMode.DAILY | typeof GameGenerationMode.FREE_PLAY,
  now = Date.now(),
) {
  if (selection.mode !== expectedMode) throw new Error("invalid_generated_selection_mode");
  const participation = await ensureGeneratedParticipation(env, identity, selection, now);
  if (!participation) throw new Error("daily_participation_unavailable");
  const status = String(participation.status);
  if (status === DailyObjectiveLifecycle.FINISHED) return { participationId: String(participation.id), status };
  const modeName = expectedMode === GameGenerationMode.DAILY ? "daily" : "free_play";
  const eventId = `${modeName}:${selection.id}:${identity.userId}:started`;
  const eventOccurredAt = status === DailyObjectiveLifecycle.STARTED && Number(participation.started_at) > 0
    ? Number(participation.started_at)
    : now;
  const serviceByGame: Record<string, string> = {
    [GameType.WORDLE]: "wordle-service",
    [GameType.QUIZ]: "quiz-service",
    [GameType.TIMELINE]: "timeline-service",
    [GameType.MEMORY]: "memory-service",
    [GameType.ASSOCIATION]: "theme-association-service",
    [GameType.WHO_AM_I]: "who-am-i-service",
    [GameType.THREE_CLUES]: "three-clues-service",
  };
  const usageRows = selection.items.map(item =>
    env.DB.prepare(`INSERT INTO generated_game_participation_usage(
      participation_id,organization_id,content_id,content_version,recorded_at
    ) VALUES(?1,?2,?3,?4,NULL) ON CONFLICT DO NOTHING`)
      .bind(String(participation.id), identity.organizationId, item.contentId, item.contentVersion));
  const usageUpdates = selection.items.flatMap(item => [
    env.DB.prepare(`UPDATE universal_content_library
      SET usage_count=usage_count+1,last_used_at=?1,last_used_mode=?6,updated_at=?1
      WHERE organization_id=?2 AND content_id=?3 AND content_version=?4
        AND EXISTS(SELECT 1 FROM generated_game_participation_usage
          WHERE participation_id=?5 AND content_id=?3 AND content_version=?4 AND recorded_at IS NULL)`)
      .bind(
        now,
        identity.organizationId,
        item.contentId,
        item.contentVersion,
        String(participation.id),
        expectedMode,
      ),
    env.DB.prepare(`UPDATE generated_game_participation_usage SET recorded_at=?1
      WHERE participation_id=?2 AND content_id=?3 AND content_version=?4 AND recorded_at IS NULL`)
      .bind(now, String(participation.id), item.contentId, item.contentVersion),
  ]);
  await env.DB.batch([
    ...usageRows,
    ...usageUpdates,
    env.DB.prepare(`UPDATE generated_game_participations
      SET status='STARTED',started_at=COALESCE(started_at,?1),start_event_id=COALESCE(start_event_id,?2),updated_at=?1
      WHERE id=?3 AND organization_id=?4 AND user_id=?5 AND status IN ('CREATED','STARTED')`)
      .bind(now, eventId, String(participation.id), identity.organizationId, identity.userId),
  ]);
  const service = serviceByGame[selection.gameType];
  if (!service) throw new Error("unsupported_generated_game");
  await publishOfficialCoreEvent(env, {
    eventId,
    eventType: "GAME_STARTED",
    occurredAt: eventOccurredAt,
    organizationId: identity.organizationId,
    userId: identity.userId,
    source: {
      kind: "game",
      service,
      gameId: selection.gameType,
      sourceId: String(participation.id),
    },
    payload: { sessionType: modeName },
    version: 1,
  }, now);
  return { participationId: String(participation.id), status: DailyObjectiveLifecycle.STARTED };
}

export async function dailySelectionContext(
  env: AppEnv,
  identity: Identity,
  selectionId: string,
  expectedGameType: string,
  now = Date.now(),
  allowFinished = false,
) {
  const selection = await findGeneratedSelectionById(env, identity.organizationId, selectionId);
  if (
    !selection
    || selection.mode !== GameGenerationMode.DAILY
    || selection.gameType !== expectedGameType
    || selection.expiresAt === null
    || now >= selection.expiresAt
  ) throw new Error("invalid_daily_selection");
  return generatedSelectionContext(env, identity, selection, GameGenerationMode.DAILY, now, allowFinished);
}

export async function generatedSelectionContext(
  env: AppEnv,
  identity: Identity,
  selection: GeneratedGameSelection,
  expectedMode: typeof GameGenerationMode.DAILY | typeof GameGenerationMode.FREE_PLAY | typeof GameGenerationMode.EVENT,
  now = Date.now(),
  allowFinished = false,
) {
  if (selection.mode !== expectedMode) throw new Error("invalid_generated_selection_mode");
  const participation = expectedMode === GameGenerationMode.EVENT
    ? await env.DB.prepare(`SELECT * FROM platform_event_participations
      WHERE selection_id=?1 AND organization_id=?2 AND user_id=?3 AND game_type=?4`)
      .bind(selection.id, identity.organizationId, identity.userId, selection.gameType).first<Record<string, unknown>>()
    : await ensureGeneratedParticipation(env, identity, selection, now);
  const participationStatus = String(participation?.status ?? "");
  if (
    !participation
    || participationStatus !== DailyObjectiveLifecycle.STARTED
      && !(allowFinished && participationStatus === DailyObjectiveLifecycle.FINISHED)
  ) {
    throw new Error("daily_participation_not_started");
  }
  return {
    selection,
    participation,
    contents: await generatedSelectionHistoricalContents(env, identity.organizationId, selection),
  };
}

export async function validateDailyGameAction(
  env: AppEnv,
  identity: Identity,
  input: {
    selectionId: string;
    gameType: string;
    action: string;
    payload: Record<string, unknown>;
  },
  now = Date.now(),
) {
  return validateGeneratedGameAction(env, identity, input, GameGenerationMode.DAILY, now);
}

export async function validateGeneratedGameAction(
  env: AppEnv,
  identity: Identity,
  input: {
    selectionId: string;
    gameType: string;
    action: string;
    payload: Record<string, unknown>;
  },
  expectedMode: typeof GameGenerationMode.DAILY | typeof GameGenerationMode.FREE_PLAY | typeof GameGenerationMode.EVENT,
  now = Date.now(),
) {
  const selection = await findGeneratedSelectionById(env, identity.organizationId, input.selectionId);
  if (!selection || selection.gameType !== input.gameType || selection.requestedByUserId && selection.requestedByUserId !== identity.userId) {
    throw new Error("invalid_generated_selection");
  }
  const context = await generatedSelectionContext(
    env,
    identity,
    selection,
    expectedMode,
    now,
  );
  if (input.gameType === GameType.WORDLE && input.action === "validate_guess") {
    const content = context.contents[0];
    const answer = normalizeWord((content.payload as WordleContentPayload).word);
    const guess = normalizeWord(String(input.payload.guess ?? ""));
    if (!guess || guess.length !== answer.length) throw new Error("invalid_wordle_guess");
    if (!await isPublishedWordleGuess(env, identity.organizationId, guess)) {
      throw new Error("invalid_wordle_word");
    }
    return {
      evaluation: evaluateGuess(guess, answer),
      correct: guess === answer,
    };
  }
  if (input.gameType === GameType.TIMELINE && input.action === "validate_order") {
    const content = context.contents[0];
    const ids = input.payload.orderedEventIds;
    if (!Array.isArray(ids) || ids.some(id => typeof id !== "string")) {
      throw new Error("invalid_timeline_order");
    }
    const round = await timelineRoundFromContent(
      content.id,
      content.payload as TimelineContentPayload,
    );
    return { correct: isCorrectTimelineOrder(round, ids) };
  }
  if (input.gameType === GameType.MEMORY && input.action === "validate_pair") {
    const cardIds = input.payload.cardIds;
    if (!Array.isArray(cardIds) || cardIds.length !== 2 || cardIds.some(id => typeof id !== "string")) {
      throw new Error("invalid_memory_pair");
    }
    const content = context.contents[0];
    const { cards } = await dailyMemoryCards(
      context.selection.seedHash,
      content.id,
      content.payload as MemoryContentPayload,
    );
    const cardsById = new Map(cards.map(card => [card.id, card]));
    const left = cardsById.get(String(cardIds[0]));
    const right = cardsById.get(String(cardIds[1]));
    const normalizedPair = [...cardIds].sort((a, b) => String(a).localeCompare(String(b))).join("|");
    return {
      match: Boolean(
        normalizedPair
        && left
        && right
        && left.id !== right.id
        && left.pairId === right.pairId,
      ),
    };
  }
  if (input.gameType === GameType.ASSOCIATION && input.action === "validate_pair") {
    const leftId = String(input.payload.leftId ?? "");
    const rightId = String(input.payload.rightId ?? "");
    const content = context.contents[0];
    const round = await associationRoundFromContent(content.id, content.payload as AssociationContentPayload);
    const left = round.pairs.find(pair => pair.leftId === leftId);
    const right = round.pairs.find(pair => pair.rightId === rightId);
    if (!left || !right) throw new Error("invalid_association_item");
    return { correct: left.id === right.id, matchedPairId: left.id === right.id ? left.id : null };
  }
  if (input.gameType === GameType.WHO_AM_I && input.action === "validate_answer") {
    const challengeId = String(input.payload.challengeId ?? "");
    const answer = String(input.payload.answer ?? "");
    if (!normalizeWhoAmIAnswer(answer) || answer.length > 100) throw new Error("invalid_who_am_i_answer");
    const content = context.contents[0];
    const challenges = await whoAmIChallengesFromContent(content.id, content.payload as WhoAmIContentPayload);
    const challenge = challenges.find(item => item.id === challengeId);
    if (!challenge) throw new Error("invalid_who_am_i_challenge");
    return { correct: normalizeWhoAmIAnswer(answer) === normalizeWhoAmIAnswer(challenge.answer) };
  }
  if (input.gameType === GameType.THREE_CLUES && input.action === "validate_answer") {
    const challengeId = String(input.payload.challengeId ?? "");
    const answer = String(input.payload.answer ?? "");
    if (!normalizeThreeCluesAnswer(answer) || answer.length > 100) throw new Error("invalid_three_clues_answer");
    const content = context.contents[0];
    const challenges = await threeCluesChallengesFromContent(content.id, content.payload as ThreeCluesContentPayload);
    const challenge = challenges.find(item => item.id === challengeId);
    if (!challenge) throw new Error("invalid_three_clues_challenge");
    return { correct: normalizeThreeCluesAnswer(answer) === normalizeThreeCluesAnswer(challenge.answer) };
  }
  if (input.gameType === GameType.QUIZ && input.action === "validate_answer") {
    const questionId = String(input.payload.questionId ?? "");
    const choiceId = String(input.payload.choiceId ?? "");
    const content = context.contents.find(item => item.id === questionId);
    if (!content) throw new Error("invalid_quiz_answer");
    if (input.payload.timedOut === true && !choiceId) {
      return { correct: false, explanation: "Tempo encerrado para esta pergunta." };
    }
    if (!/^choice-\d+$/.test(choiceId)) throw new Error("invalid_quiz_answer");
    const index = Number(choiceId.slice("choice-".length)) - 1;
    const quiz = content.payload as QuizContentPayload;
    if (!quiz.choices[index]) throw new Error("invalid_quiz_answer");
    return {
      correct: quiz.choices[index].correct === true,
      explanation: quiz.explanation ?? null,
    };
  }
  if (input.gameType === GameType.QUIZ && input.action === "finish_quiz") {
    const answers = input.payload.answers;
    if (!Array.isArray(answers) || answers.length !== context.contents.length) {
      throw new Error("invalid_quiz_completion");
    }
    let correctAnswers = 0;
    const seen = new Set<string>();
    for (const answer of answers) {
      if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
        throw new Error("invalid_quiz_completion");
      }
      const record = answer as Record<string, unknown>;
      const questionId = String(record.questionId ?? "");
      const choiceId = String(record.choiceId ?? "");
      const timedOut = record.timedOut === true;
      if (seen.has(questionId) || (!timedOut && !/^choice-\d+$/.test(choiceId))) {
        throw new Error("invalid_quiz_completion");
      }
      const content = context.contents.find(item => item.id === questionId);
      if (!content) throw new Error("invalid_quiz_completion");
      if (timedOut && !choiceId) {
        seen.add(questionId);
        continue;
      }
      const index = Number(choiceId.slice("choice-".length)) - 1;
      const quiz = content.payload as QuizContentPayload;
      if (!quiz.choices[index]) throw new Error("invalid_quiz_completion");
      if (quiz.choices[index].correct) correctAnswers += 1;
      seen.add(questionId);
    }
    const participationId = String(context.participation.id);
    const modeName = expectedMode === GameGenerationMode.DAILY ? "daily" : expectedMode === GameGenerationMode.EVENT ? "event" : "free_play";
    const eventId = `${modeName}:${input.selectionId}:${identity.userId}:finished`;
    await publishOfficialCoreEvent(env, {
      eventId,
      eventType: "GAME_FINISHED",
      occurredAt: now,
      organizationId: identity.organizationId,
      userId: identity.userId,
      source: {
        kind: "game",
        service: "quiz-service",
        gameId: GameType.QUIZ,
        sourceId: participationId,
      },
      payload: {
        status: "completed",
        score: correctAnswers * 100,
        mode: modeName,
        correctAnswers,
        questionsAnswered: context.contents.length,
        completedAt: now,
        attemptId: participationId,
        gameVersion: `${modeName}-v1`,
      },
      version: 2,
    }, now);
    if (expectedMode !== GameGenerationMode.EVENT) {
      await finishGeneratedParticipation(env, identity, input.selectionId, expectedMode, eventId, now);
    }
    return {
      score: correctAnswers * 100,
      correctAnswers,
      questionsAnswered: context.contents.length,
    };
  }
  throw new Error("unsupported_daily_action");
}

export async function finishDailyParticipation(
  env: AppEnv,
  identity: Identity,
  selectionId: string,
  eventId: string,
  now = Date.now(),
) {
  return finishGeneratedParticipation(
    env,
    identity,
    selectionId,
    GameGenerationMode.DAILY,
    eventId,
    now,
  );
}

export async function finishGeneratedParticipation(
  env: AppEnv,
  identity: Identity,
  selectionId: string,
  expectedMode: typeof GameGenerationMode.DAILY | typeof GameGenerationMode.FREE_PLAY,
  eventId: string,
  now = Date.now(),
) {
  const result = await env.DB.prepare(`UPDATE generated_game_participations
    SET status='FINISHED',finished_at=COALESCE(finished_at,?1),
      finish_event_id=COALESCE(finish_event_id,?2),updated_at=?1
    WHERE selection_id=?3 AND organization_id=?4 AND user_id=?5 AND mode=?6
      AND status IN ('STARTED','FINISHED')
      AND (finish_event_id IS NULL OR finish_event_id=?2)`)
    .bind(now, eventId, selectionId, identity.organizationId, identity.userId, expectedMode).run();
  if (Number(result.meta.changes ?? 0) !== 1) throw new Error("daily_finish_conflict");
}
