import {
  isValidGuess,
  isWinningGuess,
  normalizeWord,
  WORDLE_MAX_ATTEMPTS,
} from "../../../app/games/wordle/engine";
import {
  evaluateThreeCluesSet,
  type ThreeCluesChallenge,
  type ThreeCluesChallengeHistory,
} from "../../../app/games/three-clues/engine";
import {
  isCorrectTimelineOrder,
  timelineScore,
  TIMELINE_MAX_ATTEMPTS,
  type TimelineRound,
} from "../../../app/games/timeline/engine";
import { evaluateMemoryCompletion, type MemorySet } from "../../../app/games/memory/engine";
import {
  evaluateThemeAssociationGame,
  type ThemeAssociationAttempt,
  type ThemeAssociationRound,
} from "../../../app/games/theme-association/engine";
import {
  evaluateWhoAmISet,
  type WhoAmIChallenge,
  type WhoAmIChallengeHistory,
} from "../../../app/games/who-am-i/engine";
import type { CorePlatformEvent } from "../platform-event-engine";
import type { GameFinishedV2Payload } from "../platform-event-catalog";

const SESSION_ID = /^[a-zA-Z0-9._:-]{8,100}$/;

type CompletionContext = {
  userId: string;
  organizationId: string;
  completedAt: number;
  wordleContent?: {
    id: string;
    version: number;
    answer: string;
  };
  timelineContent?: {
    id: string;
    version: number;
    round: TimelineRound;
  };
  memoryContent?: {
    id: string;
    version: number;
    set: MemorySet;
  };
  associationContent?: {
    id: string;
    version: number;
    round: ThemeAssociationRound;
  };
  whoAmIContent?: {
    id: string;
    version: number;
    challenges: WhoAmIChallenge[];
  };
  threeCluesContent?: {
    id: string;
    version: number;
    challenges: ThreeCluesChallenge[];
  };
};

type WordleCompletion = {
  gameId: "wordle-biblico";
  sessionId: string;
  contentId: string;
  contentVersion: number;
  guesses: string[];
};

type ThreeCluesCompletion = {
  gameId: "jogo-tres-pistas";
  sessionId: string;
  contentId: string;
  contentVersion: number;
  challenges: ThreeCluesChallengeHistory[];
};

type TimelineCompletion = {
  gameId: "linha-do-tempo-biblica";
  sessionId: string;
  contentId: string;
  contentVersion: number;
  orderedEventIds: string[];
  attemptsUsed: number;
};

type MemoryCompletion = {
  gameId: "memoria-biblica";
  sessionId: string;
  contentId: string;
  contentVersion: number;
  revealedCardIds: string[];
};

type WhoAmICompletion = {
  gameId: "quem-sou-eu";
  sessionId: string;
  contentId: string;
  contentVersion: number;
  challenges: WhoAmIChallengeHistory[];
};

type ThemeAssociationCompletion = {
  gameId: "associacao-de-temas";
  sessionId: string;
  contentId: string;
  contentVersion: number;
  attempts: ThemeAssociationAttempt[];
};

export type PlatformGameCompletion = (
  | WordleCompletion
  | ThreeCluesCompletion
  | TimelineCompletion
  | MemoryCompletion
  | ThemeAssociationCompletion
  | WhoAmICompletion
) & { dailySelectionId?: string; freePlaySelectionId?: string };

function validateSessionId(value: unknown) {
  const sessionId = String(value || "");
  if (!SESSION_ID.test(sessionId)) throw new Error("invalid_game_session");
  return sessionId;
}

function wordleResult(input: WordleCompletion, content: CompletionContext["wordleContent"]) {
  if (!content || input.contentId !== content.id || input.contentVersion !== content.version) {
    throw new Error("invalid_wordle_content");
  }
  if (!Array.isArray(input.guesses) || input.guesses.length < 1 || input.guesses.length > WORDLE_MAX_ATTEMPTS) {
    throw new Error("invalid_wordle_guesses");
  }
  const guesses = input.guesses.map(value => {
    if (typeof value !== "string" || !isValidGuess(value)) throw new Error("invalid_wordle_guess");
    return normalizeWord(value);
  });
  const winningIndex = guesses.findIndex(guess => isWinningGuess(guess, content.answer));
  if (winningIndex >= 0 && winningIndex !== guesses.length - 1) throw new Error("invalid_wordle_completion");
  if (winningIndex < 0 && guesses.length !== WORDLE_MAX_ATTEMPTS) throw new Error("incomplete_wordle_game");
  const won = winningIndex === guesses.length - 1;
  return {
    score: won ? (WORDLE_MAX_ATTEMPTS - guesses.length + 1) * 100 : 0,
    correctAnswers: won ? 1 : 0,
    questionsAnswered: 1,
    gameVersion: `wordle-cms-v${content.version}`,
    service: "wordle-service",
  };
}

function threeCluesResult(
  input: ThreeCluesCompletion,
  content: CompletionContext["threeCluesContent"],
) {
  if (!content || input.contentId !== content.id || input.contentVersion !== content.version) {
    throw new Error("invalid_three_clues_content");
  }
  const result = evaluateThreeCluesSet(content.challenges, input.challenges);
  return {
    score: result.score,
    correctAnswers: result.correctAnswers,
    questionsAnswered: result.questionsAnswered,
    gameVersion: `three-clues-cms-v${content.version}`,
    service: "three-clues-service",
  };
}

function timelineResult(input: TimelineCompletion, content: CompletionContext["timelineContent"]) {
  if (!content || input.contentId !== content.id || input.contentVersion !== content.version) {
    throw new Error("invalid_timeline_content");
  }
  const round = content.round;
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
    gameVersion: `timeline-cms-v${content.version}`,
    service: "timeline-service",
  };
}

function memoryResult(input: MemoryCompletion, content: CompletionContext["memoryContent"]) {
  if (!content || input.contentId !== content.id || input.contentVersion !== content.version) {
    throw new Error("invalid_memory_content");
  }
  const set = content.set;
  const result = evaluateMemoryCompletion(set, input.revealedCardIds);
  return {
    score: result.score,
    correctAnswers: set.pairs.length,
    questionsAnswered: set.pairs.length,
    gameVersion: `memory-cms-v${content.version}`,
    service: "memory-service",
  };
}

function whoAmIResult(input: WhoAmICompletion, content: CompletionContext["whoAmIContent"]) {
  if (!content || input.contentId !== content.id || input.contentVersion !== content.version) {
    throw new Error("invalid_who_am_i_content");
  }
  const result = evaluateWhoAmISet(content.challenges, input.challenges);
  return {
    score: result.score,
    correctAnswers: result.correctAnswers,
    questionsAnswered: result.questionsAnswered,
    gameVersion: `who-am-i-cms-v${content.version}`,
    service: "who-am-i-service",
  };
}

function themeAssociationResult(
  input: ThemeAssociationCompletion,
  content: CompletionContext["associationContent"],
) {
  if (!content || input.contentId !== content.id || input.contentVersion !== content.version) {
    throw new Error("invalid_association_content");
  }
  const result = evaluateThemeAssociationGame(content.round, input.attempts);
  return {
    score: result.score,
    correctAnswers: result.matchedPairIds.length,
    questionsAnswered: content.round.pairs.length,
    gameVersion: `theme-association-cms-v${content.version}`,
    service: "theme-association-service",
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
    ? wordleResult(input, context.wordleContent)
    : input.gameId === "jogo-tres-pistas"
      ? threeCluesResult(input, context.threeCluesContent)
      : input.gameId === "linha-do-tempo-biblica"
        ? timelineResult(input, context.timelineContent)
      : input.gameId === "memoria-biblica"
        ? memoryResult(input, context.memoryContent)
      : input.gameId === "associacao-de-temas"
        ? themeAssociationResult(input, context.associationContent)
      : input.gameId === "quem-sou-eu"
        ? whoAmIResult(input, context.whoAmIContent)
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
      mode: input.dailySelectionId ? "daily" : input.freePlaySelectionId ? "free_play" : "official",
      correctAnswers: result.correctAnswers,
      questionsAnswered: result.questionsAnswered,
      completedAt: context.completedAt,
      attemptId: sessionId,
      gameVersion: result.gameVersion,
    },
    version: 2,
  };
}
