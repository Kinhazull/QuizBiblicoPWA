import { ContentStatus } from "../../shared/content";
import type { AppEnv } from "./auth";
import { requirePermission } from "./permissions";
import { json } from "./security";
import { transitionUniversalContentStatus } from "./universal-content-store";

type StatusTarget = typeof ContentStatus.DRAFT | typeof ContentStatus.PUBLISHED;
type Context = { request: Request; env: AppEnv; params: { id: string } };

export async function handleUniversalContentStatusTransition(
  { request, env, params }: Context,
  targetStatus: StatusTarget,
) {
  try {
    const user = await requirePermission(request, env, "questions.edit");
    const body = await request.json() as { version?: unknown };
    const result = await transitionUniversalContentStatus(
      env,
      String(user.organizationId),
      String(user.id),
      params.id,
      targetStatus,
      body?.version,
    );
    if (!result.ok && "notFound" in result) return json({ error: "not_found" }, 404);
    if (!result.ok && "conflict" in result) {
      return json({
        error: "content_version_conflict",
        currentVersion: result.currentVersion,
      }, 409, { "cache-control": "no-store" });
    }
    if (!result.ok && "errors" in result) {
      return json({ error: "invalid_content", fields: result.errors }, 422);
    }
    if (!result.ok) return json({ error: "invalid_status_transition" }, 409);
    return json({ content: result.content }, 200, { "cache-control": "no-store" });
  } catch (response) {
    if (response instanceof Response) return response;
    if (response instanceof SyntaxError) return json({ error: "invalid_json" }, 400);
    const supportId = crypto.randomUUID();
    console.error("universal_content_status_transition_failed", { supportId, targetStatus });
    return json({ error: "unexpected_error", supportId }, 500);
  }
}
