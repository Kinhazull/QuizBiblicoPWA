import type { AppEnv } from "../../../_lib/auth";
import { requireAnyPermission, requirePermission } from "../../../_lib/permissions";
import {
  findUniversalContent,
  updateUniversalDraft,
} from "../../../_lib/universal-content-store";
import { json } from "../../../_lib/security";

type Context = { request: Request; env: AppEnv; params: { id: string } };

export const onRequestGet = async ({ request, env, params }: Context) => {
  try {
    const user = await requireAnyPermission(request, env, [
      "content.manage", "questions.review",
    ]);
    const content = await findUniversalContent(env, String(user.organizationId), params.id);
    if (!content) return json({ error: "not_found" }, 404);
    return json({ content }, 200, { "cache-control": "no-store" });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};

const update = async ({ request, env, params }: Context) => {
  try {
    const user = await requirePermission(request, env, "content.manage");
    const result = await updateUniversalDraft(
      env,
      String(user.organizationId),
      String(user.id),
      params.id,
      await request.json(),
    );
    if (!result.ok && "notFound" in result) return json({ error: "not_found" }, 404);
    if (!result.ok && "conflict" in result) {
      return json({
        error: "content_version_conflict",
        currentVersion: result.currentVersion,
      }, 409, { "cache-control": "no-store" });
    }
    if (!result.ok && "locked" in result) {
      return json({
        error: "content_not_draft",
        currentStatus: result.currentStatus,
      }, 409, { "cache-control": "no-store" });
    }
    if (!result.ok && "errors" in result) {
      return json({ error: "invalid_content", fields: result.errors }, 422);
    }
    return json({ content: result.content }, 200, { "cache-control": "no-store" });
  } catch (response) {
    if (response instanceof Response) return response;
    if (response instanceof SyntaxError) return json({ error: "invalid_json" }, 400);
    const supportId = crypto.randomUUID();
    console.error("universal_content_update_failed", { supportId });
    return json({ error: "unexpected_error", supportId }, 500);
  }
};

export const onRequestPut = update;
export const onRequestPatch = update;
