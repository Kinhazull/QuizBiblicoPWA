import type { AppEnv } from "../../../../_lib/auth";
import { requireAnyPermission } from "../../../../_lib/permissions";
import { listUniversalVersions } from "../../../../_lib/universal-content-store";
import { json } from "../../../../_lib/security";

export const onRequestGet = async ({
  request,
  env,
  params,
}: {
  request: Request;
  env: AppEnv;
  params: { id: string };
}) => {
  try {
    const user = await requireAnyPermission(request, env, ["content.manage", "questions.review"]);
    const versions = await listUniversalVersions(env, String(user.organizationId), params.id);
    if (!versions) return json({ error: "not_found" }, 404);
    return json({ versions }, 200, { "cache-control": "no-store" });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
