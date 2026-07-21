import type { AppEnv } from "./auth";
import { CORE_EVENT_CATALOG, type CoreEventSourceKind, type CoreEventType, validateCoreEventPayload, validateCoreEventProducer } from "./platform-event-catalog";

export type CorePlatformEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  eventId: string;
  eventType: CoreEventType;
  occurredAt: number;
  organizationId: string;
  userId: string;
  source: { kind: CoreEventSourceKind; service: string; gameId?: string; sourceId: string };
  payload: TPayload;
  version: number;
  correlationId?: string;
  causationId?: string;
};

export type CoreEventConsumer = {
  id: string;
  handlerVersion: number;
  eventTypes: readonly CoreEventType[];
  handle: (event: CorePlatformEvent, env: AppEnv) => Promise<void>;
};

const TOKEN = /^[a-zA-Z0-9._:-]+$/;
const MAX_EVENT_BYTES = 16_384;
const MAX_PAYLOAD_BYTES = 8_192;
const LEASE_MS = 30_000;
const MAX_CONSUMER_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 5 * 60_000;

export const CORE_EVENT_DELIVERY_POLICY = Object.freeze({
  leaseMs: LEASE_MS,
  maxAttempts: MAX_CONSUMER_ATTEMPTS,
  baseRetryDelayMs: BASE_RETRY_DELAY_MS,
  maxRetryDelayMs: MAX_RETRY_DELAY_MS,
});

function assertToken(value: string, error: string, max = 160) {
  if (!value || value.length > max || !TOKEN.test(value)) throw new Error(error);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

async function fingerprint(event: CorePlatformEvent) {
  const bytes = new TextEncoder().encode(canonical(event));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function validateEvent(env: AppEnv, event: CorePlatformEvent, now: number) {
  assertToken(event.eventId, "invalid_event_id");
  assertToken(event.organizationId, "invalid_event_organization");
  assertToken(event.userId, "invalid_event_user");
  assertToken(event.source.sourceId, "invalid_event_source");
  if (event.correlationId) assertToken(event.correlationId, "invalid_event_correlation");
  if (event.causationId) assertToken(event.causationId, "invalid_event_causation");
  if (!Number.isSafeInteger(event.occurredAt) || event.occurredAt < 0 || event.occurredAt > now + 5 * 60_000) throw new Error("invalid_event_timestamp");
  validateCoreEventProducer(event.eventType, event.source.kind, event.source.service, event.source.gameId);
  validateCoreEventPayload(event.eventType, event.version, event.payload);
  if (new TextEncoder().encode(JSON.stringify(event.payload)).length > MAX_PAYLOAD_BYTES || new TextEncoder().encode(JSON.stringify(event)).length > MAX_EVENT_BYTES) throw new Error("event_payload_too_large");
  const user = await env.DB.prepare("SELECT id FROM users WHERE id=?1 AND organization_id=?2 AND status='active'").bind(event.userId, event.organizationId).first();
  if (!user) throw new Error("event_user_unavailable");
}

async function persistEvent(env: AppEnv, event: CorePlatformEvent, digest: string, now: number) {
  const inserted = await env.DB.prepare(`INSERT INTO core_platform_events(
    event_id,event_type,event_version,occurred_at,organization_id,user_id,source_kind,source_service,source_game_id,source_id,payload_json,correlation_id,causation_id,fingerprint,status,created_at,updated_at)
    VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,'accepted',?15,?15)
    ON CONFLICT(event_id) DO NOTHING`).bind(event.eventId, event.eventType, event.version, event.occurredAt, event.organizationId, event.userId, event.source.kind, event.source.service, event.source.gameId || null, event.source.sourceId, canonical(event.payload), event.correlationId || null, event.causationId || null, digest, now).run();
  const row = await env.DB.prepare("SELECT fingerprint FROM core_platform_events WHERE event_id=?1").bind(event.eventId).first<any>();
  if (!row || row.fingerprint !== digest) throw new Error("event_id_conflict");
  return Number((inserted as any)?.meta?.changes || 0) === 1;
}

async function claimConsumer(env: AppEnv, eventId: string, consumer: CoreEventConsumer, now: number) {
  assertToken(consumer.id, "invalid_event_consumer", 100);
  if (!Number.isSafeInteger(consumer.handlerVersion) || consumer.handlerVersion < 1) throw new Error("invalid_event_consumer_version");
  const leaseToken = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO core_platform_event_processing(event_id,consumer_id,handler_version,state,attempt_count,lease_token,lease_until,created_at,updated_at)
    VALUES(?1,?2,?3,'processing',1,?4,?5,?6,?6) ON CONFLICT(event_id,consumer_id,handler_version) DO NOTHING`).bind(eventId, consumer.id, consumer.handlerVersion, leaseToken, now + LEASE_MS, now).run();
  let row = await env.DB.prepare("SELECT state,lease_token leaseToken,lease_until leaseUntil,next_attempt_at nextAttemptAt FROM core_platform_event_processing WHERE event_id=?1 AND consumer_id=?2 AND handler_version=?3").bind(eventId, consumer.id, consumer.handlerVersion).first<any>();
  if (row?.state === "completed") return { claimed: false, state: "completed", leaseToken };
  if (row?.state === "processing" && row.leaseToken === leaseToken) return { claimed: true, state: "processing", leaseToken };
  if (row?.state === "processing" && Number(row.leaseUntil) > now) return { claimed: false, state: "processing", leaseToken };
  if (row?.state === "retryable_failed" && Number(row.nextAttemptAt || 0) > now) {
    return { claimed: false, state: "retry_scheduled", leaseToken };
  }
  const recovered = await env.DB.prepare(`UPDATE core_platform_event_processing SET state='processing',attempt_count=attempt_count+1,lease_token=?1,lease_until=?2,next_attempt_at=NULL,last_error_code=NULL,updated_at=?3
    WHERE event_id=?4 AND consumer_id=?5 AND handler_version=?6
      AND ((state='retryable_failed' AND COALESCE(next_attempt_at,0)<=?3) OR (state='processing' AND lease_until<=?3))`).bind(leaseToken, now + LEASE_MS, now, eventId, consumer.id, consumer.handlerVersion).run();
  row = Number((recovered as any)?.meta?.changes || 0) === 1 ? { state: "processing" } : row;
  return { claimed: row?.state === "processing" && Number((recovered as any)?.meta?.changes || 0) === 1, state: row?.state || "unknown", leaseToken };
}

export function sanitizeCoreEventError(error: unknown) {
  const message = error instanceof Error ? error.message : "consumer_failed";
  return TOKEN.test(message) && message.length <= 100 ? message : "consumer_failed";
}

export function coreEventRetryDelay(attemptCount: number) {
  return Math.min(BASE_RETRY_DELAY_MS * (2 ** Math.max(0, attemptCount - 1)), MAX_RETRY_DELAY_MS);
}

function storedEvent(row: any): CorePlatformEvent {
  const event: CorePlatformEvent = {
    eventId: row.eventId,
    eventType: row.eventType,
    occurredAt: Number(row.occurredAt),
    organizationId: row.organizationId,
    userId: row.userId,
    source: {
      kind: row.sourceKind,
      service: row.sourceService,
      sourceId: row.sourceId,
    },
    payload: JSON.parse(row.payloadJson),
    version: Number(row.eventVersion),
  };
  if (row.sourceGameId) event.source.gameId = row.sourceGameId;
  if (row.correlationId) event.correlationId = row.correlationId;
  if (row.causationId) event.causationId = row.causationId;
  return event;
}

export async function publishCoreEvent(env: AppEnv, event: CorePlatformEvent, consumers: readonly CoreEventConsumer[] = [], now = Date.now()) {
  await validateEvent(env, event, now);
  const digest = await fingerprint(event);
  const accepted = await persistEvent(env, event, digest, now);
  const selected = consumers.filter(consumer => consumer.eventTypes.includes(event.eventType));
  const results: Array<{ consumerId: string; status: string }> = [];
  await env.DB.prepare("UPDATE core_platform_events SET status='processing',updated_at=?1 WHERE event_id=?2 AND status<>'completed'").bind(now, event.eventId).run();
  for (const consumer of selected) {
    const claim = await claimConsumer(env, event.eventId, consumer, now);
    if (!claim.claimed) { results.push({ consumerId: consumer.id, status: claim.state === "completed" ? "duplicate" : "in_progress" }); continue; }
    try {
      await consumer.handle(event, env);
      await env.DB.prepare(`UPDATE core_platform_event_processing SET state='completed',processed_at=?1,lease_token=NULL,lease_until=NULL,next_attempt_at=NULL,last_error_code=NULL,updated_at=?1
        WHERE event_id=?2 AND consumer_id=?3 AND handler_version=?4 AND lease_token=?5`).bind(now, event.eventId, consumer.id, consumer.handlerVersion, claim.leaseToken).run();
      results.push({ consumerId: consumer.id, status: "completed" });
    } catch (error) {
      const failedAt = now;
      const receipt = await env.DB.prepare("SELECT attempt_count attemptCount FROM core_platform_event_processing WHERE event_id=?1 AND consumer_id=?2 AND handler_version=?3 AND lease_token=?4").bind(event.eventId, consumer.id, consumer.handlerVersion, claim.leaseToken).first<any>();
      const attempts = Number(receipt?.attemptCount || 1);
      const terminal = attempts >= MAX_CONSUMER_ATTEMPTS;
      await env.DB.prepare(`UPDATE core_platform_event_processing SET state=?1,lease_token=NULL,lease_until=NULL,next_attempt_at=?2,last_error_code=?3,updated_at=?4
        WHERE event_id=?5 AND consumer_id=?6 AND handler_version=?7 AND lease_token=?8`).bind(
        terminal ? "dead_letter" : "retryable_failed",
        terminal ? null : failedAt + coreEventRetryDelay(attempts),
        sanitizeCoreEventError(error),
        failedAt,
        event.eventId,
        consumer.id,
        consumer.handlerVersion,
        claim.leaseToken,
      ).run();
      results.push({ consumerId: consumer.id, status: terminal ? "dead_letter" : "retryable_failed" });
    }
  }
  const failed = await env.DB.prepare("SELECT COUNT(*) total FROM core_platform_event_processing WHERE event_id=?1 AND state IN ('retryable_failed','dead_letter')").bind(event.eventId).first<any>();
  const pending = await env.DB.prepare("SELECT COUNT(*) total FROM core_platform_event_processing WHERE event_id=?1 AND state='processing'").bind(event.eventId).first<any>();
  const status = Number(failed?.total || 0) ? "partial_failed" : Number(pending?.total || 0) ? "processing" : "completed";
  await env.DB.prepare("UPDATE core_platform_events SET status=?1,updated_at=?2 WHERE event_id=?3").bind(status, now, event.eventId).run();
  return { accepted, duplicate: !accepted, status, consumers: results };
}

export async function retryCoreEventDeliveries(
  env: AppEnv,
  consumers: readonly CoreEventConsumer[],
  options: { now?: number; limit?: number } = {},
) {
  const now = options.now ?? Date.now();
  const limit = Math.max(1, Math.min(100, Math.trunc(options.limit ?? 25)));
  const due = await env.DB.prepare(`SELECT
      e.event_id eventId,e.event_type eventType,e.event_version eventVersion,e.occurred_at occurredAt,
      e.organization_id organizationId,e.user_id userId,e.source_kind sourceKind,e.source_service sourceService,
      e.source_game_id sourceGameId,e.source_id sourceId,e.payload_json payloadJson,
      e.correlation_id correlationId,e.causation_id causationId,
      p.consumer_id consumerId,p.handler_version handlerVersion
    FROM core_platform_events e JOIN core_platform_event_processing p ON p.event_id=e.event_id
    WHERE ((p.state='retryable_failed' AND COALESCE(p.next_attempt_at,0)<=?1)
       OR (p.state='processing' AND p.lease_until<=?1))
    ORDER BY p.updated_at,e.event_id,p.consumer_id LIMIT ?2`).bind(now, limit).all<any>();
  let completed = 0;
  let partialFailed = 0;
  for (const row of due.results || []) {
    const consumer = consumers.find(item => item.id === row.consumerId && item.handlerVersion === Number(row.handlerVersion));
    if (!consumer) {
      await env.DB.prepare(`UPDATE core_platform_event_processing SET state='dead_letter',lease_token=NULL,lease_until=NULL,next_attempt_at=NULL,
        last_error_code='consumer_version_unavailable',updated_at=?1
        WHERE event_id=?2 AND consumer_id=?3 AND handler_version=?4 AND state<>'completed'`).bind(
        now, row.eventId, row.consumerId, Number(row.handlerVersion),
      ).run();
      partialFailed += 1;
      continue;
    }
    const result = await publishCoreEvent(env, storedEvent(row), [consumer], now);
    if (result.status === "completed") completed += 1;
    else partialFailed += 1;
  }
  return { scanned: due.results.length, completed, partialFailed };
}

export function getCoreEventContract(eventType: CoreEventType) {
  return CORE_EVENT_CATALOG[eventType];
}
