import type { AppEnv } from "../../_lib/auth";
import { createAsset, listAssets } from "../../_lib/asset-registry";
import { requireAnyPermission, requirePermission } from "../../_lib/permissions";
import { json } from "../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try { const user = await requireAnyPermission(request, env, ["content.manage", "content.review", "events.manage"]);
    return json({ assets: await listAssets(env, String(user.organizationId), new URL(request.url).searchParams.get("status")) }, 200, { "cache-control": "no-store" });
  } catch (error) { if (error instanceof Response) return error; throw error; }
};
export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try { const user = await requirePermission(request, env, "content.manage");
    const result = await createAsset(env, String(user.organizationId), String(user.id), await request.json());
    return result.ok ? json({ assetId: result.id }, 201) : json({ error: "invalid_asset", fields: result.errors }, 422);
  } catch (error) { if (error instanceof Response) return error; if (error instanceof SyntaxError) return json({ error: "invalid_json" }, 400); throw error; }
};
