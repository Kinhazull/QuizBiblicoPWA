import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { adaptQuizResultToGameFinished, QUIZ_CORE_INTEGRATION } from "../../functions/_lib/game-integrations/quiz-core-adapter.ts";
import { validateCoreEventPayload } from "../../functions/_lib/platform-event-catalog.ts";

const validResult = (overrides = {}) => ({
  contractVersion: 1,
  attemptId: "attempt-1",
  roundId: "round-1",
  organizationId: "org-1",
  userId: "user-1",
  status: "completed",
  mode: "official",
  startedAt: 1_000,
  finishedAt: 21_000,
  score: 7_880,
  correctAnswers: 8,
  questionsAnswered: 10,
  maxStreak: 5,
  integrity: { valid: true },
  ...overrides,
});

test("normalizes a completed official Quiz result to GAME_FINISHED v2", () => {
  const event = adaptQuizResultToGameFinished(validResult());
  assert.deepEqual(event, {
    eventId: "quiz:attempt:attempt-1:finished",
    eventType: "GAME_FINISHED",
    occurredAt: 21_000,
    organizationId: "org-1",
    userId: "user-1",
    source: {
      kind: "game",
      service: "quiz-attempt-service",
      gameId: "quiz-biblico",
      sourceId: "attempt-1",
    },
    payload: {
      status: "completed",
      score: 7_880,
      mode: "official",
      correctAnswers: 8,
      questionsAnswered: 10,
      completedAt: 21_000,
      attemptId: "attempt-1",
      gameVersion: "1.0.0",
    },
    version: 2,
    correlationId: "attempt-1",
  });
  assert.equal(QUIZ_CORE_INTEGRATION.eventType, "GAME_FINISHED");
  assert.equal(QUIZ_CORE_INTEGRATION.eventVersion, 2);
});

test("catalog accepts legacy v1 and exact v2 while rejecting mixed contracts", () => {
  assert.doesNotThrow(() => validateCoreEventPayload("GAME_FINISHED", 1, { status: "completed", score: 100 }));
  assert.doesNotThrow(() => validateCoreEventPayload("GAME_FINISHED", 2, adaptQuizResultToGameFinished(validResult()).payload));
  assert.throws(
    () => validateCoreEventPayload("GAME_FINISHED", 1, adaptQuizResultToGameFinished(validResult()).payload),
    /unexpected_event_payload_field/,
  );
  assert.throws(
    () => validateCoreEventPayload("GAME_FINISHED", 2, { status: "completed", score: 100 }),
    /invalid_event_payload_mode/,
  );
  assert.throws(
    () => validateCoreEventPayload("GAME_FINISHED", 2, { ...adaptQuizResultToGameFinished(validResult()).payload, correctAnswers: 11 }),
    /invalid_event_payload_correctAnswers/,
  );
});

test("produces a deterministic identity for repeated adaptation", () => {
  assert.deepEqual(adaptQuizResultToGameFinished(validResult()), adaptQuizResultToGameFinished(validResult()));
});

test("rejects practice, incomplete, invalid and unsupported results", () => {
  assert.throws(() => adaptQuizResultToGameFinished(validResult({ mode: "practice" })), /quiz_result_mode_not_supported/);
  assert.throws(() => adaptQuizResultToGameFinished(validResult({ status: "abandoned" })), /quiz_result_not_completed/);
  assert.throws(() => adaptQuizResultToGameFinished(validResult({ integrity: { valid: false } })), /quiz_result_not_eligible/);
  assert.throws(() => adaptQuizResultToGameFinished(validResult({ contractVersion: 2 })), /unsupported_quiz_result_contract/);
});

test("rejects untrusted identifiers, timing and inconsistent metrics", () => {
  assert.throws(() => adaptQuizResultToGameFinished(validResult({ attemptId: "bad id" })), /invalid_quiz_result_attempt_id/);
  assert.throws(() => adaptQuizResultToGameFinished(validResult({ finishedAt: 999 })), /invalid_quiz_result_timeline/);
  assert.throws(() => adaptQuizResultToGameFinished(validResult({ score: -1 })), /invalid_quiz_result_score/);
  assert.throws(() => adaptQuizResultToGameFinished(validResult({ correctAnswers: 11 })), /invalid_quiz_result_metrics/);
  assert.throws(() => adaptQuizResultToGameFinished(validResult({ maxStreak: 9 })), /invalid_quiz_result_metrics/);
});

test("adapter remains pure and disconnected from persistence and dispatch", async () => {
  const source = await readFile(new URL("../../functions/_lib/game-integrations/quiz-core-adapter.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /publishCoreEvent|retryOfficialCoreEvents|\.DB\b|prepare\(|fetch\(/);
  assert.doesNotMatch(source, /platform-(?:progress|statistics|missions|achievements|event-runtime)/);
});
