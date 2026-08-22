export type WordleCompletionSubmission = {
  eventSelectionId?: string;
  gameId: "wordle-biblico";
  sessionId: string;
  contentId: string;
  contentVersion: number;
  guesses: string[];
};

export type ThreeCluesCompletionSubmission = {
  eventSelectionId?: string;
  gameId: "jogo-tres-pistas";
  sessionId: string;
  contentId: string;
  contentVersion: number;
  challenges: Array<{
    challengeId: string;
    actions: Array<{ type: "reveal" } | { type: "guess"; answer: string }>;
  }>;
};

export type TimelineCompletionSubmission = {
  eventSelectionId?: string;
  gameId: "linha-do-tempo-biblica";
  sessionId: string;
  contentId: string;
  contentVersion: number;
  orderedEventIds: string[];
  attemptsUsed: number;
};

export type MemoryCompletionSubmission = {
  eventSelectionId?: string;
  gameId: "memoria-biblica";
  sessionId: string;
  contentId: string;
  contentVersion: number;
  revealedCardIds: string[];
};

export type WhoAmICompletionSubmission = {
  eventSelectionId?: string;
  gameId: "quem-sou-eu";
  sessionId: string;
  contentId: string;
  contentVersion: number;
  challenges: Array<{
    challengeId: string;
    actions: Array<{ type: "reveal" } | { type: "guess"; answer: string }>;
  }>;
};

export type ThemeAssociationCompletionSubmission = {
  eventSelectionId?: string;
  gameId: "associacao-de-temas";
  sessionId: string;
  contentId: string;
  contentVersion: number;
  attempts: Array<{ leftId: string; rightId: string }>;
};

export type PlatformGameCompletionSubmission =
  | WordleCompletionSubmission
  | ThreeCluesCompletionSubmission
  | TimelineCompletionSubmission
  | MemoryCompletionSubmission
  | ThemeAssociationCompletionSubmission
  | WhoAmICompletionSubmission;

export function createGameSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `session-${Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("")}`;
}

const COMPLETION_RETRY_DELAYS_MS = [0, 300, 900] as const;

function waitForCompletionRetry(delayMs: number) {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

export async function recordPlatformGameCompletion(input: PlatformGameCompletionSubmission) {
  const dailySelectionId = typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("daily");
  const freePlaySelectionId = typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("freePlay");
  const eventSelectionId = typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("event");
  const body = JSON.stringify(
    dailySelectionId
      ? { ...input, dailySelectionId }
      : freePlaySelectionId
        ? { ...input, freePlaySelectionId }
        : eventSelectionId
          ? { ...input, eventSelectionId }
        : input,
  );
  let response: Response | null = null;
  for (const delayMs of COMPLETION_RETRY_DELAYS_MS) {
    if (delayMs) await waitForCompletionRetry(delayMs);
    try {
      response = await fetch("/api/platform/games/finish", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        keepalive: true,
        headers: { "content-type": "application/json" },
        body,
      });
      if (response.ok || (response.status < 500 && response.status !== 429)) break;
    } catch {
      response = null;
    }
  }
  if (!response?.ok) throw new Error("game_completion_not_recorded");
  const result = await response.json();
  if (typeof window !== "undefined") {
    const summary = { gameId: input.gameId, score: Number(result.score) || 0, processing: String(result.processing || "pending"), recordedAt: Date.now() };
    sessionStorage.setItem("platform:last-game-result", JSON.stringify(summary));
    window.dispatchEvent(new CustomEvent("platform-game-result-recorded", { detail: summary }));
  }
  return result;
}
