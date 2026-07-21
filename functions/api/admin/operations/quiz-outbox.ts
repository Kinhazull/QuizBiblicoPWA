import { requireAdmin, type AppEnv } from "../../../_lib/auth";
import { enforceRateLimit, requestFingerprint } from "../../../_lib/abuse";
import { dispatchQuizOutbox } from "../../../_lib/game-integrations/quiz-outbox-dispatcher";
import { json } from "../../../_lib/security";

const DEFAULT_BATCH_LIMIT = 10;
const MAX_BATCH_LIMIT = 25;

function configuredLimit(env: AppEnv) {
  const configured = Number(env.QUIZ_OUTBOX_BATCH_LIMIT || DEFAULT_BATCH_LIMIT);
  return Number.isSafeInteger(configured)
    ? Math.max(1, Math.min(MAX_BATCH_LIMIT, configured))
    : DEFAULT_BATCH_LIMIT;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const operator: any = await requireAdmin(request, env);
    const fingerprint = await requestFingerprint(request);
    const retryAfter = await enforceRateLimit(
      env,
      `quiz-outbox:${operator.organizationId}:${operator.id}:${fingerprint}`,
      6,
      60_000,
    );
    if (retryAfter) return json({ error: "rate_limited", retryAfter }, 429);

    const limit = configuredLimit(env);
    const summary = await dispatchQuizOutbox(env, {
      limit,
      organizationId: operator.organizationId,
    });
    await env.DB.prepare(`INSERT INTO audit_logs(
      id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at)
      VALUES(?1,?2,?3,'platform.quiz_outbox_dispatched','organization',?2,?4,?5)`).bind(
        crypto.randomUUID(),
        operator.organizationId,
        operator.id,
        JSON.stringify({
          batchLimit: limit,
          scanned: summary.scanned,
          claimed: summary.claimed,
          delivered: summary.delivered,
          retried: summary.retried,
          deadLettered: summary.deadLettered,
        }),
        Date.now(),
      ).run();
    return json({ ok: true, batchLimit: limit, ...summary });
  } catch (response) {
    if (response instanceof Response) return response;
    console.error(JSON.stringify({ event: "quiz_outbox_dispatch_failed" }));
    return json({ error: "operation_failed" }, 500);
  }
};
