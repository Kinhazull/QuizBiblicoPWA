import { requireAdmin, type AppEnv } from "../../_lib/auth";
import { json } from "../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const admin: any = await requireAdmin(request, env);
    const { results } = await env.DB.prepare(`SELECT id, display_name AS displayName, username, role, status, created_at AS createdAt FROM users WHERE organization_id = ?1 ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, display_name`).bind(admin.organizationId).all();
    return json({ users: results });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};

export const onRequestPatch = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const admin: any = await requireAdmin(request, env);
    const body: any = await request.json();
    const status = String(body.status); const userId = String(body.userId || "");
    if (!['active','suspended','rejected'].includes(status) || !userId || userId === admin.id) return json({ error: "invalid_request" }, 400);
    const now = Date.now();
    const result = await env.DB.prepare(`UPDATE users SET status=?1, approved_at=CASE WHEN ?1='active' THEN ?2 ELSE approved_at END, approved_by=CASE WHEN ?1='active' THEN ?3 ELSE approved_by END, updated_at=?2 WHERE id=?4 AND organization_id=?5 AND role='participant'`).bind(status, now, admin.id, userId, admin.organizationId).run();
    if (!result.meta.changes) return json({ error: "not_found" }, 404);
    await env.DB.prepare("INSERT INTO audit_logs (id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES (?1,?2,?3,?4,'user',?5,?6,?7)").bind(crypto.randomUUID(), admin.organizationId, admin.id, `user.${status}`, userId, JSON.stringify({ status }), now).run();
    return json({ ok: true });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
