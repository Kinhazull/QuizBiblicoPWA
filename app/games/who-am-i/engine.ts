export type WhoAmIChallenge = {
  id: string;
  answer: string;
  hints: readonly string[];
};

export type WhoAmIAction =
  | { type: "reveal" }
  | { type: "guess"; answer: string };

export type WhoAmIStatus = "playing" | "won" | "lost";
export type WhoAmIState = {
  hintsVisible: number;
  status: WhoAmIStatus;
};

export type WhoAmIChallengeHistory = {
  challengeId: string;
  actions: readonly WhoAmIAction[];
};

export function normalizeWhoAmIAnswer(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function initialWhoAmIState(): WhoAmIState {
  return { hintsVisible: 1, status: "playing" };
}

export function applyWhoAmIAction(
  challenge: WhoAmIChallenge,
  state: WhoAmIState,
  action: WhoAmIAction,
): WhoAmIState {
  if (state.status !== "playing") throw new Error("who_am_i_challenge_finished");
  if (action.type === "reveal") {
    if (state.hintsVisible >= challenge.hints.length) throw new Error("all_who_am_i_hints_revealed");
    return { ...state, hintsVisible: state.hintsVisible + 1 };
  }
  if (action.type !== "guess" || typeof action.answer !== "string"
    || !normalizeWhoAmIAnswer(action.answer) || action.answer.length > 100) {
    throw new Error("invalid_who_am_i_answer");
  }
  return {
    ...state,
    status: normalizeWhoAmIAnswer(action.answer) === normalizeWhoAmIAnswer(challenge.answer)
      ? "won"
      : "lost",
  };
}

export function whoAmIScore(hintsVisible: number) {
  if (!Number.isInteger(hintsVisible) || hintsVisible < 1 || hintsVisible > 5) {
    throw new Error("invalid_who_am_i_hints");
  }
  return (6 - hintsVisible) * 100;
}

export function evaluateWhoAmIChallenge(
  challenge: WhoAmIChallenge,
  actions: readonly WhoAmIAction[],
) {
  if (!Array.isArray(actions) || actions.length < 1 || actions.length > challenge.hints.length) {
    throw new Error("invalid_who_am_i_actions");
  }
  let state = initialWhoAmIState();
  for (const action of actions) {
    if (!action || typeof action !== "object") throw new Error("invalid_who_am_i_action");
    state = applyWhoAmIAction(challenge, state, action);
  }
  if (state.status === "playing") throw new Error("incomplete_who_am_i_challenge");
  return { ...state, score: state.status === "won" ? whoAmIScore(state.hintsVisible) : 0 };
}

export function evaluateWhoAmISet(
  challenges: readonly WhoAmIChallenge[],
  histories: readonly WhoAmIChallengeHistory[],
) {
  if (!Array.isArray(histories) || histories.length !== challenges.length) {
    throw new Error("incomplete_who_am_i_game");
  }
  const seen = new Set<string>();
  let score = 0;
  let correctAnswers = 0;
  for (const history of histories) {
    if (!history || typeof history.challengeId !== "string" || seen.has(history.challengeId)) {
      throw new Error("invalid_who_am_i_history");
    }
    const challenge = challenges.find(item => item.id === history.challengeId);
    if (!challenge) throw new Error("invalid_who_am_i_challenge");
    seen.add(history.challengeId);
    const result = evaluateWhoAmIChallenge(challenge, history.actions);
    score += result.score;
    if (result.status === "won") correctAnswers += 1;
  }
  return { score, correctAnswers, questionsAnswered: challenges.length };
}
