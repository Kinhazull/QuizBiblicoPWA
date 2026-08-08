import type { AppEnv } from "../../_lib/auth";
import { loadContentDashboard, loadUniversalContent } from "../../_lib/content-cms";
import { createUniversalDraft } from "../../_lib/universal-content-store";
import { requireAnyPermission, requirePermission } from "../../_lib/permissions";
import { json } from "../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user = await requireAnyPermission(request, env, ["content.manage", "questions.review"]);
    const url = new URL(request.url);
    const data = url.searchParams.get("view") === "dashboard"
      ? await loadContentDashboard(env, String(user.organizationId))
      : await loadUniversalContent(env, String(user.organizationId), url.searchParams);
    return json(data, 200, { "cache-control": "no-store" });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user = await requirePermission(request, env, "content.manage");
    const result = await createUniversalDraft(
      env,
      String(user.organizationId),
      String(user.id),
      await request.json(),
    );
    if (!result.ok) return json({ error: "invalid_content", fields: result.errors }, 422);
    return json({ content: result.content }, 201, { "cache-control": "no-store" });
  } catch (response) {
    if (response instanceof Response) return response;
    if (response instanceof SyntaxError) return json({ error: "invalid_json" }, 400);
    const supportId = crypto.randomUUID();
    console.error("universal_content_create_failed", { supportId });
    return json({ error: "unexpected_error", supportId }, 500);
  }
};
