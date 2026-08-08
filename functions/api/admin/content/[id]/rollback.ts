import type { AppEnv } from "../../../../_lib/auth";
import { rollbackEditorialContent } from "../../../../_lib/editorial-governance";
import { requirePermission } from "../../../../_lib/permissions";
import { json } from "../../../../_lib/security";

export const onRequestPost = async ({ request, env, params }: { request: Request; env: AppEnv; params: { id: string } }) => {
  try {
    const user = await requirePermission(request, env, "content.manage");
    const body = await request.json() as { sourceVersion?: unknown; version?: unknown };
    const result = await rollbackEditorialContent(env, String(user.organizationId), String(user.id), params.id, body.sourceVersion, body.version);
    if (!result.ok && (result.code === "not_found" || result.code === "source_not_found")) return json({ error: result.code }, 404);
    if (!result.ok && result.code === "conflict") return json({ error: result.code, currentVersion: result.currentVersion }, 409);
    if (!result.ok) return json({ error: result.code }, 409);
    return json({ content: result.content }, 200, { "cache-control": "no-store" });
  } catch (error) { if (error instanceof Response) return error; if (error instanceof SyntaxError) return json({ error: "invalid_json" }, 400); throw error; }
};
