import { requireUser, type AppEnv } from "../../../../_lib/auth";
import { enforceRateLimit } from "../../../../_lib/abuse";
import { json } from "../../../../_lib/security";

export const onRequestPost = async ({ request, env, params }: { request: Request; env: AppEnv; params: { id: string } }) => {
  try {
    const owner: any = await requireUser(request, env);
    if (owner.role !== "owner" || !owner.mfaVerified) return json({ error: "forbidden" }, 403);
    const retry = await enforceRateLimit(env, `mfa:assisted-reset:${owner.id}`, 5, 60 * 60 * 1000);
    if (retry) return json({ error: "too_many_attempts", retryAfter: retry }, 429, { "retry-after": String(retry) });
    const target: any = await env.DB.prepare("SELECT id,role FROM users WHERE id=?1 AND organization_id=?2 AND status='active'").bind(params.id, owner.organizationId).first();
    if (!target) return json({ error: "user_not_found" }, 404);
    if (target.role !== "admin") return json({ error: "mfa_reset_not_allowed" }, 403);
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM user_mfa WHERE user_id=?1").bind(target.id),
      env.DB.prepare("DELETE FROM sessions WHERE user_id=?1").bind(target.id),
      env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES(?1,?2,?3,'mfa.assisted_reset','user',?4,?5,?6)").bind(crypto.randomUUID(), owner.organizationId, owner.id, target.id, JSON.stringify({ targetRole: target.role }), now),
    ]);
    return json({ ok: true, enrollmentRequired: true });
  } catch (error) { if (error instanceof Response) return error; throw error; }
};
