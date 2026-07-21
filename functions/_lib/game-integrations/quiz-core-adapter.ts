import type { CorePlatformEvent } from "../platform-event-engine";
import { validateCoreEventPayload, validateCoreEventProducer } from "../platform-event-catalog";

export const QUIZ_CORE_INTEGRATION = {
  gameId: "quiz-biblico",
  service: "quiz-attempt-service",
  eventType: "GAME_FINISHED",
  eventVersion: 1,
  resultContractVersion: 1,
} as const;

export type QuizOfficialCompletedResult = {
  contractVersion: 1;
  attemptId: string;
  roundId: string;
  organizationId: string;
  userId: string;
  status: "completed";
  mode: "official";
  startedAt: number;
  finishedAt: number;
  score: number;
  correctAnswers: number;
  questionsAnswered: number;
  maxStreak: number;
  integrity: { valid: true };
};

export type QuizGameFinishedPayload = {
  status: "completed";
  score: number;
};

export type QuizGameFinishedEvent = CorePlatformEvent<QuizGameFinishedPayload> & {
  eventType: "GAME_FINISHED";
  version: 1;
  source: {
    kind: "game";
    service: "quiz-attempt-service";
    gameId: "quiz-biblico";
    sourceId: string;
  };
};

const IDENTIFIER = /^[a-zA-Z0-9._:-]+$/;

function requireIdentifier(value: string, field: string) {
  if (typeof value !== "string" || value.length === 0 || value.length > 160 || !IDENTIFIER.test(value)) {
    throw new Error(`invalid_quiz_result_${field}`);
  }
}

function requireNonNegativeInteger(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`invalid_quiz_result_${field}`);
}

/**
 * Pure boundary between the persisted Quiz result and the Core contract.
 * It does not publish, persist or dispatch the returned event.
 */
export function adaptQuizResultToGameFinished(result: QuizOfficialCompletedResult): QuizGameFinishedEvent {
  if (!result || typeof result !== "object") throw new Error("invalid_quiz_result");
  if (result.contractVersion !== QUIZ_CORE_INTEGRATION.resultContractVersion) throw new Error("unsupported_quiz_result_contract");
  if (result.status !== "completed") throw new Error("quiz_result_not_completed");
  if (result.mode !== "official") throw new Error("quiz_result_mode_not_supported");
  if (result.integrity?.valid !== true) throw new Error("quiz_result_not_eligible");

  requireIdentifier(result.attemptId, "attempt_id");
  requireIdentifier(result.roundId, "round_id");
  requireIdentifier(result.organizationId, "organization_id");
  requireIdentifier(result.userId, "user_id");
  requireNonNegativeInteger(result.startedAt, "started_at");
  requireNonNegativeInteger(result.finishedAt, "finished_at");
  requireNonNegativeInteger(result.score, "score");
  requireNonNegativeInteger(result.correctAnswers, "correct_answers");
  requireNonNegativeInteger(result.questionsAnswered, "questions_answered");
  requireNonNegativeInteger(result.maxStreak, "max_streak");

  if (result.finishedAt < result.startedAt) throw new Error("invalid_quiz_result_timeline");
  if (result.questionsAnswered === 0 || result.correctAnswers > result.questionsAnswered || result.maxStreak > result.correctAnswers) {
    throw new Error("invalid_quiz_result_metrics");
  }

  const payload: QuizGameFinishedPayload = { status: "completed", score: result.score };
  validateCoreEventProducer("GAME_FINISHED", "game", QUIZ_CORE_INTEGRATION.service, QUIZ_CORE_INTEGRATION.gameId);
  validateCoreEventPayload("GAME_FINISHED", QUIZ_CORE_INTEGRATION.eventVersion, payload);

  return {
    eventId: `quiz:attempt:${result.attemptId}:finished`,
    eventType: "GAME_FINISHED",
    occurredAt: result.finishedAt,
    organizationId: result.organizationId,
    userId: result.userId,
    source: {
      kind: "game",
      service: "quiz-attempt-service",
      gameId: "quiz-biblico",
      sourceId: result.attemptId,
    },
    payload,
    version: 1,
    correlationId: result.attemptId,
  };
}
