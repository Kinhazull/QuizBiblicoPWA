import { DailyContentProvider, NormalContentProvider } from "./providers";
import {
  GameContentMode,
  type GameContentProvider,
  type GameContentRequest,
  type LoadedGameContent,
} from "./types";

const providers = new Map<GameContentMode, GameContentProvider>([
  [GameContentMode.NORMAL, new NormalContentProvider()],
  [GameContentMode.DAILY, new DailyContentProvider()],
]);

export function gameContentRequestFromLocation(
  gameType: GameContentRequest["gameType"],
  locationSearch = typeof window === "undefined" ? "" : window.location.search,
): GameContentRequest {
  const selectionId = new URLSearchParams(locationSearch).get("daily");
  return {
    gameType,
    mode: selectionId ? GameContentMode.DAILY : GameContentMode.NORMAL,
    selectionId,
  };
}

export async function loadGameContent<TPayload>(
  request: GameContentRequest,
): Promise<LoadedGameContent<TPayload>> {
  const mode = request.mode ?? GameContentMode.NORMAL;
  const provider = providers.get(mode);
  if (!provider) throw new Error(`game_content_provider_unavailable:${mode}`);
  return provider.load<TPayload>({ ...request, mode });
}

export async function validateGameContentAction<TResponse>(
  content: Pick<LoadedGameContent, "mode" | "selectionId" | "gameType" | "contentId" | "contentVersion">,
  action: string,
  input: Record<string, unknown>,
): Promise<TResponse> {
  if (content.mode === GameContentMode.DAILY) {
    const response = await fetch("/api/platform/daily-objectives/action", {
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
    });
    if (!response.ok) throw new Error("daily_game_action_failed");
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
    if (!response.ok) throw new Error("normal_game_action_failed");
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
    if (!response.ok) throw new Error("normal_game_action_failed");
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
