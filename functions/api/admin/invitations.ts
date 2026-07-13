import type { AppEnv } from "../../_lib/auth";
import { requirePermission } from "../../_lib/permissions";
import { json, sha256 } from "../../_lib/security";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const admin: any = await requirePermission(request, env, "invitations.manage"); const body: any = await request.json();
    const code = String(body.code || "").trim().toUpperCase(); const label = String(body.label || "Convite do grupo").trim();
    if (code.length < 6 || label.length < 3) return json({ error: "invalid_fields" }, 400);
    const group: any = await env.DB.prepare("SELECT id FROM groups WHERE organization_id=?1 AND active=1 ORDER BY created_at LIMIT 1").bind(admin.organizationId).first();
    const now = Date.now();
    try { await env.DB.prepare("INSERT INTO invitations (id,organization_id,group_id,code_hash,label,approval_required,max_uses,uses,expires_at,active,created_by,created_at) VALUES (?1,?2,?3,?4,?5,1,?6,0,?7,1,?8,?9)").bind(crypto.randomUUID(), admin.organizationId, group?.id || null, await sha256(code), label, body.maxUses || null, body.expiresAt || null, admin.id, now).run(); }
    catch { return json({ error: "code_in_use" }, 409); }
    return json({ ok: true, code }, 201);
  } catch (response) { if (response instanceof Response) return response; throw response; }
};

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try { const admin: any = await requirePermission(request, env, "invitations.manage"); const { results } = await env.DB.prepare("SELECT id,label,uses,max_uses AS maxUses,expires_at AS expiresAt,active,created_at AS createdAt FROM invitations WHERE organization_id=?1 ORDER BY created_at DESC").bind(admin.organizationId).all(); return json({ invitations: results }); }
  catch (response) { if (response instanceof Response) return response; throw response; }
};
