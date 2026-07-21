import type { AppEnv } from "../auth";
import {
  CORE_EVENT_DELIVERY_POLICY,
  coreEventRetryDelay,
  sanitizeCoreEventError,
  type CorePlatformEvent,
} from "../platform-event-engine";
import { acceptCoreEventWithoutConsumers } from "../platform-event-runtime";

type OutboxRow = {
  eventId: string;
  eventType: string;
  eventVersion: number;
  organizationId: string;
  userId: string;
  gameId: string;
  sourceType: string;
  sourceId: string;
  payloadJson: string;
  envelopeJson: string;
  attemptCount: number;
};

export type QuizOutboxDispatchSummary = {
  scanned: number;
  claimed: number;
  delivered: number;
  retried: number;
  deadLettered: number;
};

function changed(result: unknown) {
  return Number((result as { meta?: { changes?: number } })?.meta?.changes || 0);
}

function parseStoredEvent(row: OutboxRow): CorePlatformEvent {
  const event = JSON.parse(row.envelopeJson) as CorePlatformEvent;
  if (
    event.eventId !== row.eventId
    || event.eventType !== row.eventType
    || event.version !== Number(row.eventVersion)
    || event.organizationId !== row.organizationId
    || event.userId !== row.userId
    || event.source?.kind !== "game"
    || event.source.gameId !== row.gameId
    || event.source.sourceId !== row.sourceId
    || row.sourceType !== "attempt"
    || JSON.stringify(event.payload) !== row.payloadJson
  ) throw new Error("outbox_envelope_conflict");
  return event;
}

async function claim(env: AppEnv, eventId: string, now: number) {
  const leaseToken = crypto.randomUUID();
  const result = await env.DB.prepare(`UPDATE quiz_core_event_outbox
    SET delivery_state='processing',attempt_count=attempt_count+1,
      lease_token=?1,lease_until=?2,next_attempt_at=NULL,last_error_code=NULL,updated_at=?3
    WHERE event_id=?4 AND attempt_count<?5 AND (
      delivery_state='pending'
      OR (delivery_state='retryable_failed' AND COALESCE(next_attempt_at,0)<=?3)
      OR (delivery_state='processing' AND COALESCE(lease_until,0)<=?3)
    )`).bind(
      leaseToken,
      now + CORE_EVENT_DELIVERY_POLICY.leaseMs,
      now,
      eventId,
      CORE_EVENT_DELIVERY_POLICY.maxAttempts,
    ).run();
  return changed(result) === 1 ? leaseToken : null;
}

async function markFailure(env: AppEnv, eventId: string, leaseToken: string, now: number, error: unknown) {
  const receipt = await env.DB.prepare(`SELECT attempt_count attemptCount
    FROM quiz_core_event_outbox
    WHERE event_id=?1 AND delivery_state='processing' AND lease_token=?2`).bind(eventId, leaseToken).first<{ attemptCount: number }>();
  if (!receipt) return null;
  const attempts = Number(receipt.attemptCount);
  const terminal = attempts >= CORE_EVENT_DELIVERY_POLICY.maxAttempts;
  const result = await env.DB.prepare(`UPDATE quiz_core_event_outbox
    SET delivery_state=?1,lease_token=NULL,lease_until=NULL,next_attempt_at=?2,
      last_error_code=?3,updated_at=?4
    WHERE event_id=?5 AND delivery_state='processing' AND lease_token=?6`).bind(
      terminal ? "dead_letter" : "retryable_failed",
      terminal ? null : now + coreEventRetryDelay(attempts),
      sanitizeCoreEventError(error),
      now,
      eventId,
      leaseToken,
    ).run();
  return changed(result) === 1 ? (terminal ? "dead_letter" : "retryable_failed") : null;
}

export async function dispatchQuizOutbox(
  env: AppEnv,
  options: { now?: number; limit?: number } = {},
): Promise<QuizOutboxDispatchSummary> {
  const now = options.now ?? Date.now();
  const limit = Math.max(1, Math.min(100, Math.trunc(options.limit ?? 25)));
  const due = await env.DB.prepare(`SELECT event_id eventId
    FROM quiz_core_event_outbox
    WHERE attempt_count<?1 AND (
      delivery_state='pending'
      OR (delivery_state='retryable_failed' AND COALESCE(next_attempt_at,0)<=?2)
      OR (delivery_state='processing' AND COALESCE(lease_until,0)<=?2)
    ) ORDER BY created_at,event_id LIMIT ?3`).bind(
      CORE_EVENT_DELIVERY_POLICY.maxAttempts,
      now,
      limit,
    ).all<{ eventId: string }>();

  const summary: QuizOutboxDispatchSummary = {
    scanned: due.results.length,
    claimed: 0,
    delivered: 0,
    retried: 0,
    deadLettered: 0,
  };

  for (const candidate of due.results) {
    const leaseToken = await claim(env, candidate.eventId, now);
    if (!leaseToken) continue;
    summary.claimed += 1;
    try {
      const row = await env.DB.prepare(`SELECT
          event_id eventId,event_type eventType,event_version eventVersion,
          organization_id organizationId,user_id userId,game_id gameId,
          source_type sourceType,source_id sourceId,payload_json payloadJson,
          envelope_json envelopeJson,attempt_count attemptCount
        FROM quiz_core_event_outbox
        WHERE event_id=?1 AND delivery_state='processing' AND lease_token=?2`).bind(
          candidate.eventId,
          leaseToken,
        ).first<OutboxRow>();
      if (!row) continue;
      await acceptCoreEventWithoutConsumers(env, parseStoredEvent(row), now);
      const delivered = await env.DB.prepare(`UPDATE quiz_core_event_outbox
        SET delivery_state='delivered',processed_at=?1,lease_token=NULL,lease_until=NULL,
          next_attempt_at=NULL,last_error_code=NULL,updated_at=?1
        WHERE event_id=?2 AND delivery_state='processing' AND lease_token=?3`).bind(
          now,
          row.eventId,
          leaseToken,
        ).run();
      if (changed(delivered) === 1) summary.delivered += 1;
    } catch (error) {
      const state = await markFailure(env, candidate.eventId, leaseToken, now, error);
      if (state === "dead_letter") summary.deadLettered += 1;
      else if (state === "retryable_failed") summary.retried += 1;
    }
  }
  return summary;
}
