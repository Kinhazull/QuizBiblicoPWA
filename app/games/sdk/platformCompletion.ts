export type WordleCompletionSubmission = {
  gameId: "wordle-biblico";
  sessionId: string;
  guesses: string[];
};

export type ThreeCluesCompletionSubmission = {
  gameId: "jogo-tres-pistas";
  sessionId: string;
  questionId: string;
  answer: string;
  cluesUsed: number;
};

export type TimelineCompletionSubmission = {
  gameId: "linha-do-tempo-biblica";
  sessionId: string;
  roundId: string;
  orderedEventIds: string[];
  attemptsUsed: number;
};

export type PlatformGameCompletionSubmission =
  | WordleCompletionSubmission
  | ThreeCluesCompletionSubmission
  | TimelineCompletionSubmission;

export function createGameSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `session-${Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function recordPlatformGameCompletion(input: PlatformGameCompletionSubmission) {
  const response = await fetch("/api/platform/games/finish", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("game_completion_not_recorded");
  return response.json();
}
