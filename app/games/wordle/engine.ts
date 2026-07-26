export const WORDLE_MAX_ATTEMPTS = 6;
export const WORDLE_LENGTH = 5;
export const WORDLE_TEMPORARY_ANSWER = "JESUS";

export type LetterState = "correct" | "present" | "absent";

export type EvaluatedLetter = {
  letter: string;
  state: LetterState;
};

export function normalizeWord(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}

export function isValidGuess(value: string, length = WORDLE_LENGTH) {
  return normalizeWord(value).length === length;
}

export function evaluateGuess(guessValue: string, answerValue: string): EvaluatedLetter[] {
  const guess = normalizeWord(guessValue);
  const answer = normalizeWord(answerValue);
  if (guess.length !== answer.length) throw new Error("word_length_mismatch");

  const result: EvaluatedLetter[] = [...guess].map(letter => ({ letter, state: "absent" }));
  const remaining = new Map<string, number>();

  for (let index = 0; index < answer.length; index += 1) {
    if (guess[index] === answer[index]) {
      result[index].state = "correct";
    } else {
      remaining.set(answer[index], (remaining.get(answer[index]) || 0) + 1);
    }
  }

  for (let index = 0; index < guess.length; index += 1) {
    if (result[index].state === "correct") continue;
    const available = remaining.get(guess[index]) || 0;
    if (available > 0) {
      result[index].state = "present";
      remaining.set(guess[index], available - 1);
    }
  }

  return result;
}

export function isWinningGuess(guess: string, answer: string) {
  return normalizeWord(guess) === normalizeWord(answer);
}

