import type { AppEnv } from "../../functions/_lib/auth";
import { dispatchQuizOutbox } from "../../functions/_lib/game-integrations/quiz-outbox-dispatcher";
import { retryOfficialCoreEvents } from "../../functions/_lib/platform-event-runtime";
import { reconcilePlatformEvents } from "../../functions/_lib/platform-events";
import { createSupportId, operationalLog, type OperationalAlertSink, logOnlyOperationalAlertSink } from "../../functions/_lib/operational-observability";

type ScheduledOperation = "quiz_outbox" | "core_event_retries" | "platform_events";

type ScheduledOperationResult = {
  operation: ScheduledOperation;
  ok: boolean;
  durationMs: number;
  processed: number;
  supportId?: string;
};

export type ScheduledPlatformDependencies = {
  dispatchOutbox: typeof dispatchQuizOutbox;
  retryCoreEvents: typeof retryOfficialCoreEvents;
  reconcileEvents: typeof reconcilePlatformEvents;
};

const defaultDependencies: ScheduledPlatformDependencies = {
  dispatchOutbox: dispatchQuizOutbox,
  retryCoreEvents: retryOfficialCoreEvents,
  reconcileEvents: reconcilePlatformEvents,
};

function processedCount(summary: unknown) {
  if (!summary || typeof summary !== "object") return 0;
  const value = summary as Record<string, unknown>;
  for (const key of ["delivered", "completed", "finished", "processed", "scanned"]) {
    if (Number.isFinite(Number(value[key]))) return Number(value[key]);
  }
  return 0;
}

export async function runScheduledPlatformOperations(
  env: AppEnv,
  dependencies: ScheduledPlatformDependencies = defaultDependencies,
  now = Date.now(),
  alertSink: OperationalAlertSink = logOnlyOperationalAlertSink,
): Promise<ScheduledOperationResult[]> {
  const operations: Array<{ operation: ScheduledOperation; run: () => Promise<unknown> }> = [
    { operation: "quiz_outbox", run: () => dependencies.dispatchOutbox(env, { now, limit: 100 }) },
    { operation: "core_event_retries", run: () => dependencies.retryCoreEvents(env, { now, limit: 100 }) },
    { operation: "platform_events", run: () => dependencies.reconcileEvents(env, now, 100) },
  ];
  const results: ScheduledOperationResult[] = [];

  for (const item of operations) {
    const startedAt = Date.now();
    operationalLog({ level: "info", operation: item.operation, component: "scheduled-worker", outcome: "started" });
    try {
      const summary = await item.run();
      const durationMs = Math.max(0, Date.now() - startedAt), processed = processedCount(summary);
      operationalLog({ level: "info", operation: item.operation, component: "scheduled-worker", durationMs, processed, failed: 0, outcome: "completed" });
      results.push({ operation: item.operation, ok: true, durationMs, processed });
    } catch {
      const durationMs = Math.max(0, Date.now() - startedAt), supportId = createSupportId();
      operationalLog({ level: "error", operation: item.operation, component: "scheduled-worker", supportId, publicCode: "scheduled_operation_failed", durationMs, processed: 0, failed: 1, outcome: "failed", retryable: true });
      await alertSink.send({ severity: "CRITICAL", code: "scheduled_operation_failed", component: item.operation, supportId });
      results.push({ operation: item.operation, ok: false, durationMs, processed: 0, supportId });
    }
  }

  const failures = results.filter(result => !result.ok).map(result => result.operation);
  operationalLog({ level: failures.length ? "error" : "info", operation: "scheduled_cycle", component: "scheduled-worker", processed: results.reduce((sum, result) => sum + result.processed, 0), failed: failures.length, outcome: failures.length ? "failed" : "completed", retryable: failures.length > 0 });
  if (failures.length > 0) throw new Error(`scheduled_platform_operations_failed:${failures.join(",")}`);
  return results;
}

const journeyAwardsWorker = {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(runScheduledPlatformOperations(env));
  },

  async fetch(): Promise<Response> {
    return new Response("Platform scheduled worker is active.", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=UTF-8",
        "cache-control": "no-store",
      },
    });
  },
};

export default journeyAwardsWorker;
