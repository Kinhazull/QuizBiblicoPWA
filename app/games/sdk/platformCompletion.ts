export type WordleCompletionSubmission = {
  gameId: "wordle-biblico";
  sessionId: string;
  contentId: string;
  contentVersion: number;
  guesses: string[];
};

export type ThreeCluesCompletionSubmission = {
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
  gameId: "linha-do-tempo-biblica";
  sessionId: string;
  contentId: string;
  contentVersion: number;
  orderedEventIds: string[];
  attemptsUsed: number;
};

export type MemoryCompletionSubmission = {
  gameId: "memoria-biblica";
  sessionId: string;
  contentId: string;
  contentVersion: number;
  revealedCardIds: string[];
};

export type WhoAmICompletionSubmission = {
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

export async function recordPlatformGameCompletion(input: PlatformGameCompletionSubmission) {
  const dailySelectionId = typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("daily");
  const freePlaySelectionId = typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("freePlay");
  const response = await fetch("/api/platform/games/finish", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(
      dailySelectionId
        ? { ...input, dailySelectionId }
        : freePlaySelectionId
          ? { ...input, freePlaySelectionId }
          : input,
    ),
  });
  if (!response.ok) throw new Error("game_completion_not_recorded");
  return response.json();
}
