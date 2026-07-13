import type { AppEnv } from "../../../../_lib/auth";
import { requirePermission } from "../../../../_lib/permissions";
import { hashPassword, json, randomToken } from "../../../../_lib/security";

export const onRequestPost = async ({ request, env, params }: { request: Request; env: AppEnv; params: { id: string } }) => {
  try {
    const admin: any = await requirePermission(request, env, "members.manage");
    const target: any = await env.DB.prepare("SELECT id,role FROM users WHERE id=?1 AND organization_id=?2").bind(params.id, admin.organizationId).first();
    if (!target || target.role === "admin" || target.id === admin.id) return json({ error: "not_found" }, 404);
    const temporaryPassword = `Jornada-${randomToken(6).slice(0,8)}`;
    const credential = await hashPassword(temporaryPassword); const now = Date.now();
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash=?1,password_salt=?2,must_change_password=1,updated_at=?3 WHERE id=?4").bind(credential.hash, credential.salt, now, target.id),
      env.DB.prepare("DELETE FROM sessions WHERE user_id=?1").bind(target.id),
      env.DB.prepare("INSERT INTO audit_logs (id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES (?1,?2,?3,'user.password_reset','user',?4,'{}',?5)").bind(crypto.randomUUID(), admin.organizationId, admin.id, target.id, now),
    ]);
    return json({ ok: true, temporaryPassword });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
