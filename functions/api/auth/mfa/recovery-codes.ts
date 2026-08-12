import { requireUser, type AppEnv } from "../../../_lib/auth";
import { enforceRateLimit } from "../../../_lib/abuse";
import { decryptMfaSecret, generateMfaRecoveryCodes, recoveryCodeStatements, verifyTotp } from "../../../_lib/mfa";
import { json, verifyPassword } from "../../../_lib/security";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env, true);
    if (!["owner", "admin", "leader"].includes(user.role)) return json({ error: "mfa_not_available" }, 403);
    const retry = await enforceRateLimit(env, `mfa:recovery-regenerate:${user.id}`, 4, 60 * 60 * 1000);
    if (retry) return json({ error: "too_many_attempts", retryAfter: retry }, 429, { "retry-after": String(retry) });
    const body: any = await request.json().catch(() => ({}));
    const row: any = await env.DB.prepare(`SELECT m.*,u.password_hash,u.password_salt FROM user_mfa m JOIN users u ON u.id=m.user_id
      WHERE m.user_id=?1 AND m.status='active'`).bind(user.id).first();
    if (!row || !await verifyPassword(String(body.password || ""), row.password_salt, row.password_hash)) return json({ error: "invalid_credentials" }, 401);
    const step = await verifyTotp(await decryptMfaSecret(env, row), String(body.code || ""), Date.now(), row.last_totp_step == null ? null : Number(row.last_totp_step));
    if (step === null) return json({ error: "invalid_mfa_code" }, 401);
    const now = Date.now(), codes = generateMfaRecoveryCodes(), statements = await recoveryCodeStatements(env, user.id, codes, now);
    statements.push(
      env.DB.prepare("UPDATE user_mfa SET last_totp_step=?1,updated_at=?2 WHERE user_id=?3 AND (last_totp_step IS NULL OR last_totp_step<?1)").bind(step, now, user.id),
      env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES(?1,?2,?3,'mfa.recovery_codes_regenerated','user',?3,'{}',?4)").bind(crypto.randomUUID(), user.organizationId, user.id, now),
    );
    await env.DB.batch(statements);
    return json({ ok: true, recoveryCodes: codes });
  } catch (error) { if (error instanceof Response) return error; throw error; }
};
