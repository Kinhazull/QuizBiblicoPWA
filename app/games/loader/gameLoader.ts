import { DailyContentProvider, EventContentProvider, FreePlayContentProvider, NormalContentProvider } from "./providers";
import { GameContentProviderRegistry } from "./providerRegistry";
import {
  GameContentMode,
  type GameContentRequest,
  type LoadedGameContent,
} from "./types";

export const gameContentProviders = new GameContentProviderRegistry()
  .register(new NormalContentProvider())
  .register(new DailyContentProvider())
  .register(new FreePlayContentProvider())
  .register(new EventContentProvider());

export function gameContentRequestFromLocation(
  gameType: GameContentRequest["gameType"],
  locationSearch = typeof window === "undefined" ? "" : window.location.search,
): GameContentRequest {
  const parameters = new URLSearchParams(locationSearch);
  const dailySelectionId = parameters.get("daily");
  const freePlaySelectionId = parameters.get("freePlay");
  const eventSelectionId = parameters.get("event");
  const eventId = parameters.get("eventId");
  return {
    gameType,
    mode: dailySelectionId
      ? GameContentMode.DAILY
      : freePlaySelectionId
        ? GameContentMode.FREE_PLAY
        : eventSelectionId
          ? GameContentMode.EVENT
        : GameContentMode.NORMAL,
    selectionId: dailySelectionId ?? freePlaySelectionId ?? eventSelectionId,
    ...(eventId ? { eventId } : {}),
  };
}

export async function loadGameContent<TPayload>(
  request: GameContentRequest,
): Promise<LoadedGameContent<TPayload>> {
  const mode = request.mode ?? GameContentMode.NORMAL;
  const provider = gameContentProviders.resolve(mode);
  return provider.load<TPayload>({ ...request, mode });
}

export async function generateFreePlayGame(gameType: GameContentRequest["gameType"]) {
  const response = await fetch("/api/platform/free-play/generate", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      gameType,
      idempotencyKey: crypto.randomUUID(),
      filters: {},
    }),
  });
  const data = await response.json().catch(() => null) as {
    game?: { playHref?: string };
    error?: string;
  } | null;
  if (!response.ok || !data?.game?.playHref) {
    throw new Error(data?.error || "free_play_generation_failed");
  }
  return data.game.playHref;
}

export async function validateGameContentAction<TResponse>(
  content: Pick<LoadedGameContent, "mode" | "selectionId" | "gameType" | "contentId" | "contentVersion">,
  action: string,
  input: Record<string, unknown>,
): Promise<TResponse> {
  if (content.mode === GameContentMode.DAILY || content.mode === GameContentMode.FREE_PLAY || content.mode === GameContentMode.EVENT) {
    const response = await fetch(
      content.mode === GameContentMode.DAILY
        ? "/api/platform/daily-objectives/action"
        : content.mode === GameContentMode.FREE_PLAY
          ? "/api/platform/free-play/action"
          : "/api/platform/events/action",
      {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        selectionId: content.selectionId,
        gameType: content.gameType,
        action,
        input,
      }),
      },
    );
    if (!response.ok) {
      const error = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(error?.error || "generated_game_action_failed");
    }
    return response.json() as Promise<TResponse>;
  }
  if (content.gameType === "linha-do-tempo-biblica" && action === "validate_order") {
    const response = await fetch("/api/platform/games/timeline", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contentId: content.contentId,
        contentVersion: content.contentVersion,
        orderedEventIds: input.orderedEventIds,
      }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(error?.error || "normal_game_action_failed");
    }
    return response.json() as Promise<TResponse>;
  }
  if (content.gameType === "wordle-biblico" && action === "validate_guess") {
    const response = await fetch("/api/platform/games/wordle", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contentId: content.contentId,
        contentVersion: content.contentVersion,
        guess: input.guess,
      }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(error?.error || "normal_game_action_failed");
    }
    return response.json() as Promise<TResponse>;
  }
  const endpointByGame: Partial<Record<typeof content.gameType, string>> = {
    "associacao-de-temas": "/api/platform/games/association",
    "quem-sou-eu": "/api/platform/games/who-am-i",
    "jogo-tres-pistas": "/api/platform/games/three-clues",
  };
  const endpoint = endpointByGame[content.gameType];
  if (endpoint) {
    const response = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contentId: content.contentId,
        contentVersion: content.contentVersion,
        ...input,
      }),
    });
    if (!response.ok) throw new Error("normal_game_action_failed");
    return response.json() as Promise<TResponse>;
  }
  throw new Error("game_content_action_unsupported");
}
