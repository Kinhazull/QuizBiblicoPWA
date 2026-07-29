export const THREE_CLUES_MAX = 3;

export type ThreeCluesChallenge = {
  id: string;
  answer: string;
  clues: readonly [string, string, string];
};

export type ThreeCluesAction =
  | { type: "reveal" }
  | { type: "guess"; answer: string };

export type ThreeCluesChallengeHistory = {
  challengeId: string;
  actions: readonly ThreeCluesAction[];
};

export type ThreeCluesState = {
  cluesVisible: number;
  status: "playing" | "won" | "lost";
};

export function normalizeThreeCluesAnswer(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function isCorrectThreeCluesAnswer(guess: string, answer: string) {
  const normalizedGuess = normalizeThreeCluesAnswer(guess);
  return normalizedGuess.length > 0 && normalizedGuess === normalizeThreeCluesAnswer(answer);
}

export function initialThreeCluesState(): ThreeCluesState {
  return { cluesVisible: 1, status: "playing" };
}

export function applyThreeCluesAction(
  challenge: ThreeCluesChallenge,
  state: ThreeCluesState,
  action: ThreeCluesAction,
): ThreeCluesState {
  if (state.status !== "playing") throw new Error("three_clues_challenge_finished");
  if (action.type === "reveal") {
    if (state.cluesVisible >= THREE_CLUES_MAX) throw new Error("all_three_clues_revealed");
    return { ...state, cluesVisible: state.cluesVisible + 1 };
  }
  if (action.type !== "guess" || typeof action.answer !== "string"
    || !normalizeThreeCluesAnswer(action.answer) || action.answer.length > 100) {
    throw new Error("invalid_three_clues_answer");
  }
  return {
    ...state,
    status: isCorrectThreeCluesAnswer(action.answer, challenge.answer) ? "won" : "lost",
  };
}

export function scoreForCluesUsed(cluesUsed: number) {
  if (!Number.isInteger(cluesUsed) || cluesUsed < 1 || cluesUsed > THREE_CLUES_MAX) {
    throw new Error("invalid_clues_used");
  }
  return (THREE_CLUES_MAX - cluesUsed + 1) * 100;
}

export function evaluateThreeCluesChallenge(
  challenge: ThreeCluesChallenge,
  actions: readonly ThreeCluesAction[],
) {
  if (!Array.isArray(actions) || actions.length < 1 || actions.length > THREE_CLUES_MAX) {
    throw new Error("invalid_three_clues_actions");
  }
  let state = initialThreeCluesState();
  for (const action of actions) {
    if (!action || typeof action !== "object") throw new Error("invalid_three_clues_action");
    state = applyThreeCluesAction(challenge, state, action);
  }
  if (state.status === "playing") throw new Error("incomplete_three_clues_challenge");
  return {
    ...state,
    score: state.status === "won" ? scoreForCluesUsed(state.cluesVisible) : 0,
  };
}

export function evaluateThreeCluesSet(
  challenges: readonly ThreeCluesChallenge[],
  histories: readonly ThreeCluesChallengeHistory[],
) {
  if (!Array.isArray(histories) || histories.length !== challenges.length) {
    throw new Error("incomplete_three_clues_game");
  }
  const seen = new Set<string>();
  let score = 0;
  let correctAnswers = 0;
  for (const history of histories) {
    if (!history || typeof history.challengeId !== "string" || seen.has(history.challengeId)) {
      throw new Error("invalid_three_clues_history");
    }
    const challenge = challenges.find(item => item.id === history.challengeId);
    if (!challenge) throw new Error("invalid_three_clues_challenge");
    seen.add(history.challengeId);
    const result = evaluateThreeCluesChallenge(challenge, history.actions);
    score += result.score;
    if (result.status === "won") correctAnswers += 1;
  }
  return { score, correctAnswers, questionsAnswered: challenges.length };
}
