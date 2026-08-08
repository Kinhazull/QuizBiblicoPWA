import type { AppEnv } from "../../../../_lib/auth";
import { linkContentAsset } from "../../../../_lib/asset-registry";
import { requireAnyPermission, requirePermission } from "../../../../_lib/permissions";
import { json } from "../../../../_lib/security";
type Context = { request: Request; env: AppEnv; params: { id: string } };
export const onRequestGet = async ({ request, env, params }: Context) => {
  try { const user = await requireAnyPermission(request, env, ["content.manage", "content.review"]);
    const assets = await env.DB.prepare(`SELECT ca.role,ca.position,ca.content_version AS contentVersion,a.* FROM content_assets ca
      JOIN asset_registry a ON a.id=ca.asset_id AND a.organization_id=ca.organization_id
      WHERE ca.organization_id=?1 AND ca.content_id=?2 ORDER BY ca.content_version DESC,ca.position`)
      .bind(String(user.organizationId), params.id).all(); return json({ assets: assets.results }, 200, { "cache-control": "no-store" });
  } catch (error) { if (error instanceof Response) return error; throw error; }
};
export const onRequestPost = async ({ request, env, params }: Context) => {
  try { const user = await requirePermission(request, env, "content.manage"); const result = await linkContentAsset(env,
    String(user.organizationId), String(user.id), params.id, await request.json());
    if (!result.ok) return json({ error: result.code }, result.code === "not_found" ? 404 : 422); return json({ ok: true }, 201);
  } catch (error) { if (error instanceof Response) return error; if (error instanceof SyntaxError) return json({ error: "invalid_json" }, 400); throw error; }
};
