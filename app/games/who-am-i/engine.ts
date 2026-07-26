import type { WhoAmICharacter } from "./characters";

export type WhoAmIAction =
  | { type: "reveal" }
  | { type: "guess"; answerId: string };

export type WhoAmIStatus = "playing" | "won" | "lost";
export type WhoAmIState = {
  hintsVisible: number;
  wrongAnswerIds: string[];
  awaitingNextHint: boolean;
  status: WhoAmIStatus;
};

export function initialWhoAmIState(): WhoAmIState {
  return { hintsVisible: 1, wrongAnswerIds: [], awaitingNextHint: false, status: "playing" };
}

export function shuffleWhoAmIOptions(optionIds: readonly string[], random: () => number = Math.random) {
  const shuffled = [...optionIds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  if (shuffled.length > 1 && shuffled.every((id, index) => id === optionIds[index])) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

export function applyWhoAmIAction(
  character: WhoAmICharacter,
  state: WhoAmIState,
  action: WhoAmIAction,
): WhoAmIState {
  if (state.status !== "playing") throw new Error("who_am_i_game_finished");
  if (action.type === "reveal") {
    if (state.hintsVisible >= character.hints.length) throw new Error("all_who_am_i_hints_revealed");
    return { ...state, hintsVisible: state.hintsVisible + 1, awaitingNextHint: false };
  }
  if (action.type !== "guess" || typeof action.answerId !== "string" || !character.optionIds.includes(action.answerId)) {
    throw new Error("invalid_who_am_i_answer");
  }
  if (state.awaitingNextHint) throw new Error("who_am_i_hint_required");
  if (state.wrongAnswerIds.includes(action.answerId)) throw new Error("who_am_i_answer_repeated");
  if (action.answerId === character.id) return { ...state, status: "won" };
  const wrongAnswerIds = [...state.wrongAnswerIds, action.answerId];
  return {
    ...state,
    wrongAnswerIds,
    awaitingNextHint: state.hintsVisible < character.hints.length,
    status: state.hintsVisible === character.hints.length ? "lost" : "playing",
  };
}

export function whoAmIScore(hintsVisible: number) {
  if (!Number.isInteger(hintsVisible) || hintsVisible < 1 || hintsVisible > 5) {
    throw new Error("invalid_who_am_i_hints");
  }
  return (6 - hintsVisible) * 100;
}

export function evaluateWhoAmIGame(character: WhoAmICharacter, actions: readonly WhoAmIAction[]) {
  if (!Array.isArray(actions) || actions.length < 1 || actions.length > 12) {
    throw new Error("invalid_who_am_i_actions");
  }
  let state = initialWhoAmIState();
  for (const action of actions) {
    if (!action || typeof action !== "object") throw new Error("invalid_who_am_i_action");
    state = applyWhoAmIAction(character, state, action);
  }
  if (state.status === "playing") throw new Error("incomplete_who_am_i_game");
  return { ...state, score: state.status === "won" ? whoAmIScore(state.hintsVisible) : 0 };
}

export function nextWhoAmICharacterIndex(current: number, total: number) {
  if (!Number.isInteger(total) || total < 1) throw new Error("invalid_who_am_i_character_total");
  return (current + 1) % total;
}
