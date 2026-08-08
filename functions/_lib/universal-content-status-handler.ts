import { ContentStatus } from "../../shared/content";
import type { AppEnv } from "./auth";
import { requirePermission } from "./permissions";
import { json } from "./security";
import { transitionEditorialContent, type EditorialStatus } from "./editorial-governance";

type Context = { request: Request; env: AppEnv; params: { id: string } };

export async function handleUniversalContentStatusTransition(
  { request, env, params }: Context,
  targetStatus: EditorialStatus,
) {
  try {
    const permission = targetStatus === ContentStatus.IN_REVIEW ? "content.manage" : "content.review";
    const user = await requirePermission(request, env, permission);
    const body = await request.json() as { version?: unknown; comment?: unknown };
    const result = await transitionEditorialContent(
      env,
      String(user.organizationId),
      String(user.id),
      params.id,
      targetStatus,
      body?.version,
      body?.comment,
    );
    if (!result.ok && result.code === "not_found") return json({ error: "not_found" }, 404);
    if (!result.ok && result.code === "conflict") {
      return json({
        error: "content_version_conflict",
        currentVersion: result.currentVersion,
      }, 409, { "cache-control": "no-store" });
    }
    if (!result.ok && result.code === "invalid_content") {
      return json({ error: "invalid_content", fields: result.errors }, 422);
    }
    if (!result.ok && result.code === "comment_required") return json({ error: "review_comment_required" }, 422);
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
