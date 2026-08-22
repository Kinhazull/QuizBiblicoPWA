import { Difficulty, GameType, type GameType as GameTypeValue } from "../../shared/content";
import { GameMode, getModeCapability } from "../../shared/game-modes";
import type { AppEnv } from "./auth";
import {
  generatedSelectionHistoricalContents,
  generatedSelectionSafePayload,
  generatedSelectionContext,
  startGeneratedSelection,
  validateGeneratedGameAction,
  finishGeneratedParticipation,
} from "./platform-daily-objectives";
import { getGameGenerationCapability, registeredGameGenerationCapabilities } from "./universal-game-generation-capabilities";
import { GameGenerationMode, type GeneratedGameSelection } from "./universal-game-generation-contract";
import { findGeneratedSelectionById, generateUniversalGameSelection } from "./universal-game-generator";
import { listEligibleUniversalContent } from "./universal-eligible-content-catalog";

const IDEMPOTENCY_KEY = /^[a-zA-Z0-9._:-]{16,100}$/;
const publicDifficulties = Object.values(Difficulty);
const routes: Record<string, string> = {
  [GameType.QUIZ]: "/jogar",
  [GameType.WORDLE]: "/jogos/wordle-biblico",
  [GameType.TIMELINE]: "/jogos/linha-do-tempo-biblica",
  [GameType.MEMORY]: "/jogos/memoria-biblica",
  [GameType.ASSOCIATION]: "/jogos/associacao-de-temas",
  [GameType.WHO_AM_I]: "/jogos/quem-sou-eu",
  [GameType.THREE_CLUES]: "/jogos/jogo-das-3-pistas",
};

export type FreePlayIdentity = { organizationId: string; userId: string };
export type FreePlayFilters = {
  difficulty?: Difficulty | null;
  theme?: string | null;
  book?: string | null;
  count?: number;
};

const normalizePublicKey = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).normalize("NFKC").trim().toLocaleLowerCase("pt-BR");
  if (!/^[\p{L}\p{N} .:_-]{1,80}$/u.test(normalized)) throw new Error("unsupported_filter");
  return normalized;
};

export function normalizeFreePlayRequest(input: Record<string, unknown>) {
  const gameType = String(input.gameType ?? "");
  const capability = getGameGenerationCapability(gameType);
  if (!capability || !capability.supportedModes.includes(GameGenerationMode.FREE_PLAY)) {
    throw new Error("unsupported_game");
  }
  const idempotencyKey = String(input.idempotencyKey ?? "").normalize("NFKC").trim();
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) throw new Error("invalid_idempotency_key");
  const raw = input.filters && typeof input.filters === "object" && !Array.isArray(input.filters)
    ? input.filters as Record<string, unknown>
    : {};
  const count = raw.count === undefined ? capability.allowedCounts[0] : Number(raw.count);
  if (!Number.isInteger(count) || !capability.allowedCounts.includes(count)) {
    throw new Error("invalid_quantity");
  }
  const difficulty = raw.difficulty ? String(raw.difficulty) : null;
  if (difficulty && (!capability.supportsDifficulty || !publicDifficulties.includes(difficulty as Difficulty))) {
    throw new Error("unsupported_filter");
  }
  const theme = normalizePublicKey(raw.theme);
  const book = normalizePublicKey(raw.book);
  if (theme && !capability.supportsThemes) throw new Error("unsupported_filter");
  if (book && !capability.supportsBooks) throw new Error("unsupported_filter");
  return {
    gameType,
    idempotencyKey,
    filters: {
      count,
      difficulty: difficulty as Difficulty | null,
      theme,
      book,
    },
  };
}

async function recentFreePlayContentIds(env: AppEnv, identity: FreePlayIdentity, gameType: string) {
  const rows = await env.DB.prepare(`SELECT usage.content_id
    FROM generated_game_participation_usage usage
    JOIN generated_game_participations participation
      ON participation.id=usage.participation_id
    WHERE participation.organization_id=?1 AND participation.user_id=?2
      AND participation.game_type=?3 AND participation.mode='FREE_PLAY'
      AND usage.recorded_at IS NOT NULL
    ORDER BY usage.recorded_at DESC LIMIT 20`)
    .bind(identity.organizationId, identity.userId, gameType)
    .all<Record<string, unknown>>();
  return [...new Set(rows.results.map(row => String(row.content_id)))];
}

export async function generateFreePlaySelection(
  env: AppEnv,
  identity: FreePlayIdentity,
  input: Record<string, unknown>,
  now = Date.now(),
) {
  const mode = getModeCapability(GameMode.FREE_PLAY);
  if (!mode?.active || !mode.usesGeneratedSelection || !mode.supportsUserFilters) {
    throw new Error("mode_disabled");
  }
  const request = normalizeFreePlayRequest(input);
  const recentContentIds = await recentFreePlayContentIds(env, identity, request.gameType);
  const selectionKey = `free:${identity.userId}:${request.idempotencyKey}`;
  const generationRequest = (includeRecent: boolean) => ({
    organizationId: identity.organizationId,
    requestedByUserId: identity.userId,
    gameType: request.gameType,
    mode: GameGenerationMode.FREE_PLAY,
    selectionKey,
    algorithmVersion: 1,
    seed: [
      identity.organizationId,
      identity.userId,
      request.gameType,
      request.idempotencyKey,
      "v1",
      JSON.stringify(request.filters),
    ].join("|"),
    count: request.filters.count,
    difficulty: request.filters.difficulty ?? undefined,
    themes: request.filters.theme ? [request.filters.theme] : undefined,
    books: request.filters.book ? [request.filters.book] : undefined,
    ...(includeRecent ? { repetitionWindow: { recentContentIds } } : {}),
  });
  const generated = await generateUniversalGameSelection(env, generationRequest(true), now);
  if (!generated.ok && generated.error.code === "insufficient_eligible_content" && recentContentIds.length) {
    const fallback = await generateUniversalGameSelection(env, generationRequest(false), now);
    if (!fallback.ok) throw new Error(fallback.error.code);
    return freePlayGenerationResponse(fallback.selection, fallback.reused);
  }
  if (!generated.ok) throw new Error(generated.error.code);
  return freePlayGenerationResponse(generated.selection, generated.reused);
}

function freePlayGenerationResponse(selection: GeneratedGameSelection, reused: boolean) {
  return {
    selectionId: selection.id,
    gameType: selection.gameType,
    mode: GameMode.FREE_PLAY,
    reused,
    playHref: `${routes[selection.gameType]}?freePlay=${encodeURIComponent(selection.id)}`,
  };
}

function assertOwnedFreePlaySelection(selection: GeneratedGameSelection | null, identity: FreePlayIdentity) {
  if (
    !selection
    || selection.mode !== GameGenerationMode.FREE_PLAY
    || selection.requestedByUserId !== identity.userId
    || selection.organizationId !== identity.organizationId
  ) throw new Error("invalid_free_play_selection");
  return selection;
}

export async function getFreePlaySelection(
  env: AppEnv,
  identity: FreePlayIdentity,
  selectionId: string,
) {
  const selection = assertOwnedFreePlaySelection(
    await findGeneratedSelectionById(env, identity.organizationId, selectionId),
    identity,
  );
  const contents = await generatedSelectionHistoricalContents(env, identity.organizationId, selection);
  const participation = await env.DB.prepare(`SELECT id,status FROM generated_game_participations
    WHERE selection_id=?1 AND organization_id=?2 AND user_id=?3 AND mode='FREE_PLAY'`)
    .bind(selection.id, identity.organizationId, identity.userId)
    .first<Record<string, unknown>>();
  return {
    selectionId: selection.id,
    participationId: participation ? String(participation.id) : null,
    status: participation ? String(participation.status) : "CREATED",
    gameType: selection.gameType,
    title: "Modo Livre",
    content: await generatedSelectionSafePayload(selection, contents),
  };
}

export async function startFreePlaySelection(
  env: AppEnv,
  identity: FreePlayIdentity,
  selectionId: string,
  now = Date.now(),
) {
  const selection = assertOwnedFreePlaySelection(
    await findGeneratedSelectionById(env, identity.organizationId, selectionId),
    identity,
  );
  return startGeneratedSelection(env, identity, selection, GameGenerationMode.FREE_PLAY, now);
}

export function validateFreePlayAction(
  env: AppEnv,
  identity: FreePlayIdentity,
  input: { selectionId: string; gameType: string; action: string; payload: Record<string, unknown> },
  now = Date.now(),
) {
  return validateGeneratedGameAction(env, identity, input, GameGenerationMode.FREE_PLAY, now);
}

export async function freePlaySelectionContext(
  env: AppEnv,
  identity: FreePlayIdentity,
  selectionId: string,
  expectedGameType: string,
  now = Date.now(),
  allowFinished = false,
) {
  const selection = assertOwnedFreePlaySelection(
    await findGeneratedSelectionById(env, identity.organizationId, selectionId),
    identity,
  );
  if (selection.gameType !== expectedGameType) throw new Error("invalid_free_play_selection");
  return generatedSelectionContext(env, identity, selection, GameGenerationMode.FREE_PLAY, now, allowFinished);
}

export function finishFreePlayParticipation(
  env: AppEnv,
  identity: FreePlayIdentity,
  selectionId: string,
  eventId: string,
  now = Date.now(),
) {
  return finishGeneratedParticipation(
    env,
    identity,
    selectionId,
    GameGenerationMode.FREE_PLAY,
    eventId,
    now,
  );
}

export function publicFreePlayCapabilities() {
  return registeredGameGenerationCapabilities()
    .filter(capability => capability.supportedModes.includes(GameGenerationMode.FREE_PLAY))
    .map(capability => ({
      gameType: capability.gameType,
      difficulties: capability.supportsDifficulty ? publicDifficulties : [],
      supportsTheme: capability.supportsThemes,
      supportsBook: capability.supportsBooks,
      supportsTestament: capability.supportsTestament,
      counts: capability.allowedCounts,
    }));
}

export async function freePlayCatalogOptions(
  env: AppEnv,
  identity: FreePlayIdentity,
  gameType: string,
) {
  const capability = getGameGenerationCapability(gameType);
  if (!capability?.supportedModes.includes(GameGenerationMode.FREE_PLAY)) {
    throw new Error("unsupported_game");
  }
  const entries = await listEligibleUniversalContent(env, {
    organizationId: identity.organizationId,
    gameType: gameType as GameTypeValue,
    limit: 200,
  });
  return {
    themes: [...new Set(entries.flatMap(entry => entry.themes))].sort(),
    books: [...new Set(entries.flatMap(entry => entry.books))].sort(),
    difficulties: [...new Set(entries.map(entry => entry.difficulty))],
  };
}
