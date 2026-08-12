import { requireUser, type AppEnv } from "../../../_lib/auth";
import { enforceRateLimit } from "../../../_lib/abuse";
import { decryptMfaSecret, verifyTotp } from "../../../_lib/mfa";
import { clearSessionCookie, json, verifyPassword } from "../../../_lib/security";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env, true);
    if (user.role !== "leader") return json({ error: "mfa_cannot_be_disabled" }, 403);
    const retry = await enforceRateLimit(env, `mfa:disable:${user.id}`, 4, 60 * 60 * 1000);
    if (retry) return json({ error: "too_many_attempts", retryAfter: retry }, 429, { "retry-after": String(retry) });
    const body: any = await request.json().catch(() => ({}));
    const row: any = await env.DB.prepare(`SELECT m.*,u.password_hash,u.password_salt FROM user_mfa m JOIN users u ON u.id=m.user_id
      WHERE m.user_id=?1 AND m.status='active'`).bind(user.id).first();
    if (!row || !await verifyPassword(String(body.password || ""), row.password_salt, row.password_hash)) return json({ error: "invalid_credentials" }, 401);
    if (await verifyTotp(await decryptMfaSecret(env, row), String(body.code || ""), Date.now(), row.last_totp_step == null ? null : Number(row.last_totp_step)) === null) return json({ error: "invalid_mfa_code" }, 401);
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM user_mfa WHERE user_id=?1").bind(user.id),
      env.DB.prepare("DELETE FROM sessions WHERE user_id=?1").bind(user.id),
      env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES(?1,?2,?3,'mfa.disabled','user',?3,'{}',?4)").bind(crypto.randomUUID(), user.organizationId, user.id, now),
    ]);
    return json({ ok: true }, 200, { "set-cookie": clearSessionCookie(String(env.LOCAL_LAN_DEVELOPMENT) !== "true") });
  } catch (error) { if (error instanceof Response) return error; throw error; }
};
