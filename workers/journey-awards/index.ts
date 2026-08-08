import type { AppEnv } from "../../functions/_lib/auth";
import { dispatchQuizOutbox } from "../../functions/_lib/game-integrations/quiz-outbox-dispatcher";
import { retryOfficialCoreEvents } from "../../functions/_lib/platform-event-runtime";
import { reconcilePlatformEvents } from "../../functions/_lib/platform-events";

type ScheduledOperation = "quiz_outbox" | "core_event_retries" | "platform_events";

type ScheduledOperationResult = {
  operation: ScheduledOperation;
  ok: boolean;
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

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : "operation_failed";
  return /^[a-z0-9_:-]{1,100}$/i.test(message) ? message : "operation_failed";
}

export async function runScheduledPlatformOperations(
  env: AppEnv,
  dependencies: ScheduledPlatformDependencies = defaultDependencies,
  now = Date.now(),
): Promise<ScheduledOperationResult[]> {
  const operations: Array<{ operation: ScheduledOperation; run: () => Promise<unknown> }> = [
    { operation: "quiz_outbox", run: () => dependencies.dispatchOutbox(env, { now, limit: 100 }) },
    { operation: "core_event_retries", run: () => dependencies.retryCoreEvents(env, { now, limit: 100 }) },
    { operation: "platform_events", run: () => dependencies.reconcileEvents(env, now, 100) },
  ];
  const results: ScheduledOperationResult[] = [];

  for (const item of operations) {
    try {
      const summary = await item.run();
      console.log(JSON.stringify({
        message: `${item.operation}_completed`,
        summary,
        executedAt: now,
      }));
      results.push({ operation: item.operation, ok: true });
    } catch (error) {
      console.error(JSON.stringify({
        message: `${item.operation}_failed`,
        error: safeError(error),
        executedAt: now,
      }));
      results.push({ operation: item.operation, ok: false });
    }
  }

  const failures = results.filter(result => !result.ok).map(result => result.operation);
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
