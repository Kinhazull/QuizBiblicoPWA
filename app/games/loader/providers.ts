import { GameType, type GameType as GameTypeValue } from "../../../shared/content";
import {
  GameContentMode,
  type GameContentProvider,
  type GameContentRequest,
  type LoadedGameContent,
} from "./types";

const normalEndpoints: Record<GameTypeValue, string | null> = {
  [GameType.QUIZ]: "/api/rounds/current",
  [GameType.WORDLE]: "/api/platform/games/wordle",
  [GameType.TIMELINE]: "/api/platform/games/timeline",
  [GameType.MEMORY]: "/api/platform/games/memory",
  [GameType.ASSOCIATION]: "/api/platform/games/association",
  [GameType.WHO_AM_I]: "/api/platform/games/who-am-i",
  [GameType.THREE_CLUES]: "/api/platform/games/three-clues",
};

const dailyEndpoints: Partial<Record<GameTypeValue, string>> = {
  [GameType.QUIZ]: "/api/platform/daily-objectives/quiz",
  [GameType.WORDLE]: "/api/platform/daily-objectives/wordle",
  [GameType.TIMELINE]: "/api/platform/daily-objectives/timeline",
  [GameType.MEMORY]: "/api/platform/daily-objectives/memory",
  [GameType.ASSOCIATION]: "/api/platform/daily-objectives/association",
  [GameType.WHO_AM_I]: "/api/platform/daily-objectives/who-am-i",
  [GameType.THREE_CLUES]: "/api/platform/daily-objectives/three-clues",
};

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
  });
  const data = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !data) throw new Error("game_content_unavailable");
  return data;
}

function contentIdentity(payload: Record<string, unknown>) {
  const id = String(payload.id ?? "");
  const version = Number(payload.version ?? 0);
  if (!id || !Number.isInteger(version) || version < 1) throw new Error("game_content_invalid");
  return { id, version };
}

function normalizeNormalPayload(gameType: GameTypeValue, data: Record<string, unknown>) {
  if (gameType === GameType.QUIZ) {
    const round = data.round as Record<string, unknown> | null;
    if (!round || typeof round.id !== "string") throw new Error("game_content_invalid");
    return {
      contentId: String(round.id),
      contentVersion: Number(round.version ?? 1),
      payload: round,
      title: typeof round.title === "string" ? round.title : null,
      biblicalReference: null,
    };
  }
  const payload = data.content as Record<string, unknown> | null;
  if (!payload) throw new Error("game_content_invalid");
  const identity = contentIdentity(payload);
  return {
    contentId: identity.id,
    contentVersion: identity.version,
    payload,
    title: typeof payload.title === "string" ? payload.title : null,
    biblicalReference: typeof payload.biblicalReference === "string" ? payload.biblicalReference : null,
  };
}

export class NormalContentProvider implements GameContentProvider {
  readonly mode = GameContentMode.NORMAL;

  async load<TPayload>(request: GameContentRequest): Promise<LoadedGameContent<TPayload>> {
    const endpoint = normalEndpoints[request.gameType];
    if (!endpoint) throw new Error("normal_content_provider_unsupported_game");
    const normalized = normalizeNormalPayload(
      request.gameType,
      await requestJson(endpoint, { method: "GET", signal: request.signal }),
    );
    return {
      mode: this.mode,
      gameType: request.gameType,
      selectionId: null,
      participationId: null,
      contentId: normalized.contentId,
      contentVersion: normalized.contentVersion,
      payload: normalized.payload as TPayload,
      metadata: {
        title: normalized.title,
        biblicalReference: normalized.biblicalReference,
        expiresAt: null,
      },
    };
  }
}

export class DailyContentProvider implements GameContentProvider {
  readonly mode = GameContentMode.DAILY;

  async load<TPayload>(request: GameContentRequest): Promise<LoadedGameContent<TPayload>> {
    const endpoint = dailyEndpoints[request.gameType];
    if (!endpoint || !request.selectionId) throw new Error("daily_content_provider_invalid_request");
    const start = await requestJson("/api/platform/daily-objectives/start", {
      method: "POST",
      signal: request.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ selectionId: request.selectionId }),
    });
    const data = await requestJson(endpoint, { method: "GET", signal: request.signal });
    const objective = data.objective as Record<string, unknown> | null;
    if (!objective || objective.selectionId !== request.selectionId) {
      throw new Error("daily_content_selection_mismatch");
    }
    const payload = objective.content as Record<string, unknown> | null;
    if (!payload) throw new Error("game_content_invalid");
    const primary = request.gameType === GameType.QUIZ
      ? ((payload.questions as Record<string, unknown>[] | undefined)?.[0] ?? null)
      : payload;
    if (!primary) throw new Error("game_content_invalid");
    const identity = contentIdentity(primary);
    const participation = start.participation as Record<string, unknown> | null;
    return {
      mode: this.mode,
      gameType: request.gameType,
      selectionId: String(objective.selectionId),
      participationId: participation?.participationId
        ? String(participation.participationId)
        : String(objective.participationId ?? ""),
      contentId: identity.id,
      contentVersion: identity.version,
      payload: payload as TPayload,
      metadata: {
        title: typeof objective.title === "string" ? objective.title : null,
        biblicalReference: typeof primary.biblicalReference === "string" ? primary.biblicalReference : null,
        expiresAt: Number.isFinite(Number(objective.expiresAt)) ? Number(objective.expiresAt) : null,
      },
    };
  }
}

export class FreePlayContentProvider implements GameContentProvider {
  readonly mode = GameContentMode.FREE_PLAY;

  async load<TPayload>(request: GameContentRequest): Promise<LoadedGameContent<TPayload>> {
    if (!request.selectionId) throw new Error("free_play_content_provider_invalid_request");
    const start = await requestJson("/api/platform/free-play/start", {
      method: "POST",
      signal: request.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ selectionId: request.selectionId }),
    });
    const data = await requestJson(
      `/api/platform/free-play/selection?selectionId=${encodeURIComponent(request.selectionId)}`,
      { method: "GET", signal: request.signal },
    );
    const game = data.game as Record<string, unknown> | null;
    if (!game || game.selectionId !== request.selectionId || game.gameType !== request.gameType) {
      throw new Error("free_play_content_selection_mismatch");
    }
    const payload = game.content as Record<string, unknown> | null;
    if (!payload) throw new Error("game_content_invalid");
    const primary = request.gameType === GameType.QUIZ
      ? ((payload.questions as Record<string, unknown>[] | undefined)?.[0] ?? null)
      : payload;
    if (!primary) throw new Error("game_content_invalid");
    const identity = contentIdentity(primary);
    const participation = start.participation as Record<string, unknown> | null;
    return {
      mode: this.mode,
      gameType: request.gameType,
      selectionId: String(game.selectionId),
      participationId: String(participation?.participationId ?? game.participationId ?? ""),
      contentId: identity.id,
      contentVersion: identity.version,
      payload: payload as TPayload,
      metadata: {
        title: typeof game.title === "string" ? game.title : null,
        biblicalReference: typeof primary.biblicalReference === "string" ? primary.biblicalReference : null,
        expiresAt: null,
      },
    };
  }
}
