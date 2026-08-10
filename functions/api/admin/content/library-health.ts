import type { AppEnv } from "../../../_lib/auth";
import { getLibraryHealth } from "../../../_lib/library-health";
import { requireAnyPermission } from "../../../_lib/permissions";
import { json } from "../../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user = await requireAnyPermission(request, env, ["content.manage", "questions.review"]);
    return json(await getLibraryHealth(env, String(user.organizationId)), 200, {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
