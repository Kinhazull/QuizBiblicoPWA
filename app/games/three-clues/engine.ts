export const THREE_CLUES_MAX = 3;

export function normalizeThreeCluesAnswer(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

export function isCorrectThreeCluesAnswer(guess: string, answer: string) {
  const normalizedGuess = normalizeThreeCluesAnswer(guess);
  return normalizedGuess.length > 0 && normalizedGuess === normalizeThreeCluesAnswer(answer);
}

export function scoreForCluesUsed(cluesUsed: number) {
  if (!Number.isInteger(cluesUsed) || cluesUsed < 1 || cluesUsed > THREE_CLUES_MAX) {
    throw new Error("invalid_clues_used");
  }
  return (THREE_CLUES_MAX - cluesUsed + 1) * 100;
}

export function nextQuestionIndex(current: number, total: number) {
  if (!Number.isInteger(total) || total < 1) throw new Error("invalid_question_total");
  return (current + 1) % total;
}

