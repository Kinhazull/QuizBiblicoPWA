import type { AppEnv } from "../../../_lib/auth";
import { requirePermission } from "../../../_lib/permissions";
import { json } from "../../../_lib/security";
import { runUniversalAdminImport } from "../../../_lib/universal-admin-import";
export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try { const user = await requirePermission(request, env, "content.manage"); const result = await runUniversalAdminImport(env,
    String(user.organizationId), String(user.id), await request.json()); return json(result, 200, { "cache-control": "no-store" });
  } catch (error) { if (error instanceof Response) return error; if (error instanceof SyntaxError) return json({ error: "invalid_json" }, 400); throw error; }
};
