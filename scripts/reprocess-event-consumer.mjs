import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const DATABASE_NAME = "quiz-biblico-db";
const APPLY_CONFIRMATION = "REPROCESS_SINGLE_DEAD_LETTER";
const TOKEN = /^[a-zA-Z0-9._:-]+$/;

export const REPROCESSABLE_CONSUMERS = Object.freeze({
  "platform-achievements": Object.freeze({ handlerVersion: 1, expectedErrorCode: "achievement_catalog_conflict" }),
});

function token(value, error, max = 200) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length > max || !TOKEN.test(normalized)) throw new Error(error);
  return normalized;
}
function literal(value) { return `'${value.replaceAll("'", "''")}'`; }
function receiptQuery(eventId, consumerId, handlerVersion) {
  return `SELECT e.event_id eventId,e.status eventStatus,p.consumer_id consumerId,p.handler_version handlerVersion,p.state,p.attempt_count attemptCount,p.last_error_code lastErrorCode FROM core_platform_events e LEFT JOIN core_platform_event_processing p ON p.event_id=e.event_id AND p.consumer_id=${literal(consumerId)} AND p.handler_version=${handlerVersion} WHERE e.event_id=${literal(eventId)} LIMIT 1`;
}
function consumersQuery(eventId) {
  return `SELECT consumer_id consumerId,handler_version handlerVersion,state,attempt_count attemptCount,last_error_code lastErrorCode FROM core_platform_event_processing WHERE event_id=${literal(eventId)} ORDER BY consumer_id,handler_version`;
}
function dueWorkQuery(eventId, consumerId, handlerVersion, now) {
  return `SELECT COUNT(*) total FROM core_platform_event_processing WHERE ((state='retryable_failed' AND COALESCE(next_attempt_at,0)<=${now}) OR (state='processing' AND lease_until<=${now})) AND NOT (event_id=${literal(eventId)} AND consumer_id=${literal(consumerId)} AND handler_version=${handlerVersion})`;
}
function requeueQuery(eventId, consumerId, handlerVersion, expectedErrorCode, now) {
  return `UPDATE core_platform_event_processing SET state='retryable_failed',lease_token=NULL,lease_until=NULL,next_attempt_at=0,updated_at=${now} WHERE event_id=${literal(eventId)} AND consumer_id=${literal(consumerId)} AND handler_version=${handlerVersion} AND state='dead_letter' AND attempt_count=5 AND last_error_code=${literal(expectedErrorCode)}`;
}
function safeReceipt(row) {
  if (!row) return null;
  return { eventId: row.eventId, eventStatus: row.eventStatus, consumerId: row.consumerId || null, handlerVersion: row.handlerVersion == null ? null : Number(row.handlerVersion), state: row.state || null, attemptCount: row.attemptCount == null ? null : Number(row.attemptCount), lastErrorCode: row.lastErrorCode || null };
}

export async function reprocessEventConsumer({ eventId: rawEventId, consumerId: rawConsumerId, apply = false, confirmation = "", execute, now = Date.now() }) {
  const eventId = token(rawEventId, "invalid_event_id");
  const consumerId = token(rawConsumerId, "invalid_consumer_id", 100);
  const policy = REPROCESSABLE_CONSUMERS[consumerId];
  if (!policy) throw new Error("consumer_not_reprocessable");
  if (typeof execute !== "function") throw new Error("executor_required");
  if (!Number.isSafeInteger(now) || now < 0) throw new Error("invalid_timestamp");

  const receiptRows = await execute(receiptQuery(eventId, consumerId, policy.handlerVersion), { write: false });
  const receipt = safeReceipt(receiptRows.rows?.[0]);
  if (!receipt) throw new Error("event_not_found");
  if (!receipt.consumerId) throw new Error("receipt_not_found");
  const consumerRows = await execute(consumersQuery(eventId), { write: false });
  const otherConsumers = (consumerRows.rows || []).filter(row => row.consumerId !== consumerId || Number(row.handlerVersion) !== policy.handlerVersion).map(row => ({ consumerId: row.consumerId, handlerVersion: Number(row.handlerVersion), state: row.state, attemptCount: Number(row.attemptCount), lastErrorCode: row.lastErrorCode || null }));
  if (receipt.state === "completed") return { mode: apply ? "apply" : "dry-run", outcome: "already_completed", receipt, otherConsumers, changes: 0 };
  if (receipt.state !== "dead_letter") throw new Error("receipt_not_dead_letter");
  if (receipt.attemptCount !== 5 || receipt.lastErrorCode !== policy.expectedErrorCode) throw new Error("dead_letter_contract_mismatch");
  if (otherConsumers.some(item => item.state !== "completed")) throw new Error("other_consumers_not_completed");
  const due = await execute(dueWorkQuery(eventId, consumerId, policy.handlerVersion, now), { write: false });
  if (Number(due.rows?.[0]?.total || 0) !== 0) throw new Error("unrelated_due_event_work_present");
  if (!apply) return { mode: "dry-run", outcome: "eligible", receipt, otherConsumers, expectedTransition: "dead_letter -> retryable_failed -> official worker consumer", changes: 0 };
  if (confirmation !== APPLY_CONFIRMATION) throw new Error("explicit_confirmation_required");
  const updated = await execute(requeueQuery(eventId, consumerId, policy.handlerVersion, policy.expectedErrorCode, now), { write: true });
  if (Number(updated.changes || 0) !== 1) throw new Error("single_receipt_requeue_failed");
  const afterRows = await execute(receiptQuery(eventId, consumerId, policy.handlerVersion), { write: false });
  const after = safeReceipt(afterRows.rows?.[0]);
  if (after?.state !== "retryable_failed") throw new Error("receipt_requeue_not_observed");
  return { mode: "apply", outcome: "requeued", receiptBefore: receipt, receiptAfter: after, otherConsumers, changes: 1 };
}

function wranglerResult(stdout) {
  const parsed = JSON.parse(stdout);
  const item = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!item?.success) throw new Error("wrangler_d1_query_failed");
  return { rows: item.results || [], changes: Number(item.meta?.changes || 0) };
}
export function createRemoteExecutor() {
  return async (sql, { write }) => {
    const pnpmEntry = String(process.env.npm_execpath || "").trim();
    if (!pnpmEntry) throw new Error("invoke_via_pnpm_script_required");
    const result = spawnSync(process.execPath, [pnpmEntry, "exec", "wrangler", "d1", "execute", DATABASE_NAME, "--remote", "--json", "--command", sql], { encoding: "utf8", windowsHide: true });
    if (result.status !== 0) throw new Error(write ? "remote_d1_write_failed" : "remote_d1_read_failed");
    return wranglerResult(result.stdout);
  };
}
function parseArgs(argv) {
  const args = { apply: false, confirmation: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--apply") args.apply = true;
    else if (value === "--event-id") args.eventId = argv[++index];
    else if (value === "--consumer") args.consumerId = argv[++index];
    else if (value === "--confirm") args.confirmation = argv[++index];
    else throw new Error("unknown_argument");
  }
  return args;
}
async function main() {
  const report = await reprocessEventConsumer({ ...parseArgs(process.argv.slice(2)), execute: createRemoteExecutor() });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : "reprocess_failed"}\n`); process.exitCode = 1; });
