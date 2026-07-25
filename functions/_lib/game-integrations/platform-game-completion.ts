import {
  isValidGuess,
  isWinningGuess,
  normalizeWord,
  WORDLE_MAX_ATTEMPTS,
  WORDLE_TEMPORARY_ANSWER,
} from "../../../app/games/wordle/engine";
import {
  isCorrectThreeCluesAnswer,
  scoreForCluesUsed,
  THREE_CLUES_MAX,
} from "../../../app/games/three-clues/engine";
import { THREE_CLUES_QUESTIONS } from "../../../app/games/three-clues/questions";
import {
  isCorrectTimelineOrder,
  timelineScore,
  TIMELINE_MAX_ATTEMPTS,
} from "../../../app/games/timeline/engine";
import { TIMELINE_ROUNDS } from "../../../app/games/timeline/rounds";
import { evaluateMemoryCompletion } from "../../../app/games/memory/engine";
import { MEMORY_SETS } from "../../../app/games/memory/sets";
import { evaluateWhoAmIGame, type WhoAmIAction } from "../../../app/games/who-am-i/engine";
import { WHO_AM_I_CHARACTERS } from "../../../app/games/who-am-i/characters";
import type { CorePlatformEvent } from "../platform-event-engine";
import type { GameFinishedV2Payload } from "../platform-event-catalog";

const SESSION_ID = /^[a-zA-Z0-9._:-]{8,100}$/;

type CompletionContext = {
  userId: string;
  organizationId: string;
  completedAt: number;
};

type WordleCompletion = {
  gameId: "wordle-biblico";
  sessionId: string;
  guesses: string[];
};

type ThreeCluesCompletion = {
  gameId: "jogo-tres-pistas";
  sessionId: string;
  questionId: string;
  answer: string;
  cluesUsed: number;
};

type TimelineCompletion = {
  gameId: "linha-do-tempo-biblica";
  sessionId: string;
  roundId: string;
  orderedEventIds: string[];
  attemptsUsed: number;
};

type MemoryCompletion = {
  gameId: "memoria-biblica";
  sessionId: string;
  setId: string;
  revealedCardIds: string[];
};

type WhoAmICompletion = {
  gameId: "quem-sou-eu";
  sessionId: string;
  characterId: string;
  actions: WhoAmIAction[];
};

export type PlatformGameCompletion =
  | WordleCompletion
  | ThreeCluesCompletion
  | TimelineCompletion
  | MemoryCompletion
  | WhoAmICompletion;

function validateSessionId(value: unknown) {
  const sessionId = String(value || "");
  if (!SESSION_ID.test(sessionId)) throw new Error("invalid_game_session");
  return sessionId;
}

function wordleResult(input: WordleCompletion) {
  if (!Array.isArray(input.guesses) || input.guesses.length < 1 || input.guesses.length > WORDLE_MAX_ATTEMPTS) {
    throw new Error("invalid_wordle_guesses");
  }
  const guesses = input.guesses.map(value => {
    if (typeof value !== "string" || !isValidGuess(value)) throw new Error("invalid_wordle_guess");
    return normalizeWord(value);
  });
  const winningIndex = guesses.findIndex(guess => isWinningGuess(guess, WORDLE_TEMPORARY_ANSWER));
  if (winningIndex >= 0 && winningIndex !== guesses.length - 1) throw new Error("invalid_wordle_completion");
  if (winningIndex < 0 && guesses.length !== WORDLE_MAX_ATTEMPTS) throw new Error("incomplete_wordle_game");
  const won = winningIndex === guesses.length - 1;
  return {
    score: won ? (WORDLE_MAX_ATTEMPTS - guesses.length + 1) * 100 : 0,
    correctAnswers: won ? 1 : 0,
    questionsAnswered: 1,
    gameVersion: "wordle-mvp-v1",
    service: "wordle-service",
  };
}

function threeCluesResult(input: ThreeCluesCompletion) {
  const question = THREE_CLUES_QUESTIONS.find(item => item.id === input.questionId);
  if (!question) throw new Error("invalid_three_clues_question");
  if (typeof input.answer !== "string" || !input.answer.trim() || input.answer.length > 60) {
    throw new Error("invalid_three_clues_answer");
  }
  if (!Number.isInteger(input.cluesUsed) || input.cluesUsed < 1 || input.cluesUsed > THREE_CLUES_MAX) {
    throw new Error("invalid_clues_used");
  }
  const won = isCorrectThreeCluesAnswer(input.answer, question.answer);
  return {
    score: won ? scoreForCluesUsed(input.cluesUsed) : 0,
    correctAnswers: won ? 1 : 0,
    questionsAnswered: 1,
    gameVersion: "three-clues-mvp-v1",
    service: "three-clues-service",
  };
}

function timelineResult(input: TimelineCompletion) {
  const round = TIMELINE_ROUNDS.find(item => item.id === input.roundId);
  if (!round) throw new Error("invalid_timeline_round");
  if (!Array.isArray(input.orderedEventIds) || input.orderedEventIds.some(id => typeof id !== "string")) {
    throw new Error("invalid_timeline_order");
  }
  if (!Number.isInteger(input.attemptsUsed) || input.attemptsUsed < 1 || input.attemptsUsed > TIMELINE_MAX_ATTEMPTS) {
    throw new Error("invalid_timeline_attempts");
  }
  const won = isCorrectTimelineOrder(round, input.orderedEventIds);
  if (!won && input.attemptsUsed !== TIMELINE_MAX_ATTEMPTS) throw new Error("incomplete_timeline_game");
  return {
    score: won ? timelineScore(input.attemptsUsed) : 0,
    correctAnswers: won ? 1 : 0,
    questionsAnswered: 1,
    gameVersion: "timeline-mvp-v1",
    service: "timeline-service",
  };
}

function memoryResult(input: MemoryCompletion) {
  const set = MEMORY_SETS.find(item => item.id === input.setId);
  if (!set) throw new Error("invalid_memory_set");
  const result = evaluateMemoryCompletion(set, input.revealedCardIds);
  return {
    score: result.score,
    correctAnswers: set.pairs.length,
    questionsAnswered: set.pairs.length,
    gameVersion: "memory-mvp-v1",
    service: "memory-service",
  };
}

function whoAmIResult(input: WhoAmICompletion) {
  const character = WHO_AM_I_CHARACTERS.find(item => item.id === input.characterId);
  if (!character) throw new Error("invalid_who_am_i_character");
  const result = evaluateWhoAmIGame(character, input.actions);
  return {
    score: result.score,
    correctAnswers: result.status === "won" ? 1 : 0,
    questionsAnswered: 1,
    gameVersion: "who-am-i-mvp-v1",
    service: "who-am-i-service",
  };
}

export function adaptPlatformGameCompletion(
  input: PlatformGameCompletion,
  context: CompletionContext,
): CorePlatformEvent<GameFinishedV2Payload> {
  if (!input || typeof input !== "object") throw new Error("invalid_game_completion");
  const sessionId = validateSessionId(input.sessionId);
  if (!Number.isSafeInteger(context.completedAt) || context.completedAt < 0) {
    throw new Error("invalid_game_completion_time");
  }
  const result = input.gameId === "wordle-biblico"
    ? wordleResult(input)
    : input.gameId === "jogo-tres-pistas"
      ? threeCluesResult(input)
      : input.gameId === "linha-do-tempo-biblica"
        ? timelineResult(input)
      : input.gameId === "memoria-biblica"
        ? memoryResult(input)
      : input.gameId === "quem-sou-eu"
        ? whoAmIResult(input)
      : null;
  if (!result) throw new Error("unsupported_platform_game");

  return {
    eventId: `game:${input.gameId}:${context.userId}:${sessionId}:finished`,
    eventType: "GAME_FINISHED",
    occurredAt: context.completedAt,
    organizationId: context.organizationId,
    userId: context.userId,
    source: {
      kind: "game",
      service: result.service,
      gameId: input.gameId,
      sourceId: sessionId,
    },
    payload: {
      status: "completed",
      score: result.score,
      mode: "official",
      correctAnswers: result.correctAnswers,
      questionsAnswered: result.questionsAnswered,
      completedAt: context.completedAt,
      attemptId: sessionId,
      gameVersion: result.gameVersion,
    },
    version: 2,
  };
}
