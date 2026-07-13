import { requireUser, type AppEnv } from "../../_lib/auth";
import { hashPassword, json, verifyPassword } from "../../_lib/security";
import { strongEnough } from "../../_lib/abuse";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env, true);
    const body: any = await request.json().catch(() => null);
    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");
    if (!strongEnough(newPassword) || newPassword === currentPassword) return json({ error: "invalid_password" }, 400);
    const stored: any = await env.DB.prepare("SELECT password_hash,password_salt FROM users WHERE id=?1").bind(user.id).first();
    if (!stored || !(await verifyPassword(currentPassword, stored.password_salt, stored.password_hash))) return json({ error: "invalid_current_password" }, 403);
    const credential = await hashPassword(newPassword); const now = Date.now();
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash=?1,password_salt=?2,must_change_password=0,updated_at=?3 WHERE id=?4").bind(credential.hash, credential.salt, now, user.id),
      env.DB.prepare("DELETE FROM sessions WHERE user_id=?1").bind(user.id),
      env.DB.prepare("INSERT INTO audit_logs (id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES (?1,?2,?3,'user.password_changed','user',?3,'{}',?4)").bind(crypto.randomUUID(), user.organizationId, user.id, now),
    ]);
    return json({ ok: true });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
