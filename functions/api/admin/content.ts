import type { AppEnv } from "../../_lib/auth";
import { loadContentDashboard, loadUniversalContent } from "../../_lib/content-cms";
import { requireAnyPermission } from "../../_lib/permissions";
import { json } from "../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user = await requireAnyPermission(request, env, ["questions.edit", "questions.review", "rounds.manage"]);
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
