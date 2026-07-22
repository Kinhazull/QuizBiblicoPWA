import type { AppEnv } from "../auth";
import { adaptQuizResultToGameFinished, type QuizOfficialCompletedResult } from "./quiz-core-adapter";

/**
 * Builds the insert that must share the Quiz completion DB.batch.
 * Delivery remains outside this module and is performed by the official dispatcher.
 */
export function quizGameFinishedOutboxStatement(env: AppEnv, result: QuizOfficialCompletedResult) {
  const event = adaptQuizResultToGameFinished(result);
  const payloadJson = JSON.stringify(event.payload);
  const envelopeJson = JSON.stringify(event);

  return env.DB.prepare(`INSERT INTO quiz_core_event_outbox(
    event_id,event_type,event_version,organization_id,user_id,game_id,source_type,source_id,
    payload_json,envelope_json,delivery_state,attempt_count,created_at,updated_at)
    VALUES(?1,'GAME_FINISHED',?2,?3,?4,?5,'attempt',?6,?7,?8,'pending',0,?9,?9)`).bind(
    event.eventId,
    event.version,
    event.organizationId,
    event.userId,
    event.source.gameId,
    event.source.sourceId,
    payloadJson,
    envelopeJson,
    event.occurredAt,
  );
}
