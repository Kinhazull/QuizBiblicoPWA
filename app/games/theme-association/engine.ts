export type ThemeAssociationPair = {
  id: string;
  leftId: string;
  rightId: string;
  category?: string;
  left: string;
  right: string;
};

export type ThemeAssociationRound = {
  id: string;
  title: string;
  pairs: readonly ThemeAssociationPair[];
};

export const THEME_ASSOCIATION_MAX_ERRORS = 3;

export type ThemeAssociationAttempt = { leftId: string; rightId: string };
export type ThemeAssociationStatus = "playing" | "won" | "lost";
export type ThemeAssociationState = {
  matchedPairIds: string[];
  errors: number;
  status: ThemeAssociationStatus;
};

export function initialThemeAssociationState(): ThemeAssociationState {
  return { matchedPairIds: [], errors: 0, status: "playing" };
}

export function shuffleThemeAssociationOptions(
  pairs: readonly ThemeAssociationPair[],
  random: () => number = Math.random,
) {
  const shuffled = [...pairs];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  if (shuffled.length > 1 && shuffled.every((pair, index) => pair.id === pairs[index].id)) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

export function applyThemeAssociationAttempt(
  round: ThemeAssociationRound,
  state: ThemeAssociationState,
  attempt: ThemeAssociationAttempt,
): ThemeAssociationState {
  if (state.status !== "playing") throw new Error("association_game_finished");
  const left = round.pairs.find(pair => pair.leftId === attempt.leftId);
  const right = round.pairs.find(pair => pair.rightId === attempt.rightId);
  if (!left || !right) throw new Error("invalid_association_item");
  if (state.matchedPairIds.includes(left.id) || state.matchedPairIds.includes(right.id)) {
    throw new Error("association_pair_already_matched");
  }

  if (left.id === right.id) {
    const matchedPairIds = [...state.matchedPairIds, left.id];
    return {
      matchedPairIds,
      errors: state.errors,
      status: matchedPairIds.length === round.pairs.length ? "won" : "playing",
    };
  }
  const errors = state.errors + 1;
  return {
    matchedPairIds: [...state.matchedPairIds],
    errors,
    status: errors >= THEME_ASSOCIATION_MAX_ERRORS ? "lost" : "playing",
  };
}

export function evaluateThemeAssociationGame(
  round: ThemeAssociationRound,
  attempts: readonly ThemeAssociationAttempt[],
) {
  if (!Array.isArray(attempts) || attempts.length < 1 || attempts.length > 20) {
    throw new Error("invalid_association_attempts");
  }
  let state = initialThemeAssociationState();
  for (const attempt of attempts) {
    if (!attempt || typeof attempt.leftId !== "string" || typeof attempt.rightId !== "string") {
      throw new Error("invalid_association_attempt");
    }
    state = applyThemeAssociationAttempt(round, state, attempt);
  }
  if (state.status === "playing") throw new Error("incomplete_association_game");
  return {
    ...state,
    score: state.status === "won" ? (round.pairs.length * 100) - (state.errors * 100) : 0,
  };
}
