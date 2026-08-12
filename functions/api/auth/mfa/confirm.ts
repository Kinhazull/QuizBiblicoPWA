import { requireUser, type AppEnv } from "../../../_lib/auth";
import { enforceRateLimit } from "../../../_lib/abuse";
import { decryptMfaSecret, generateMfaRecoveryCodes, recoveryCodeStatements, verifyTotp } from "../../../_lib/mfa";
import { json, readCookie, sha256 } from "../../../_lib/security";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env, true);
    if (!["owner", "admin", "leader"].includes(user.role)) return json({ error: "mfa_not_available" }, 403);
    const retry = await enforceRateLimit(env, `mfa:confirm:${user.id}`, 8, 10 * 60 * 1000);
    if (retry) return json({ error: "too_many_attempts", retryAfter: retry }, 429, { "retry-after": String(retry) });
    const body: any = await request.json().catch(() => ({}));
    const row: any = await env.DB.prepare("SELECT * FROM user_mfa WHERE user_id=?1 AND status='pending'").bind(user.id).first();
    if (!row) return json({ error: "mfa_setup_required" }, 409);
    const step = await verifyTotp(await decryptMfaSecret(env, row), String(body.code || ""));
    if (step === null) return json({ error: "invalid_mfa_code" }, 401);
    const now = Date.now(), codes = generateMfaRecoveryCodes(), token = readCookie(request, "quiz_session");
    const statements = await recoveryCodeStatements(env, user.id, codes, now);
    statements.push(
      env.DB.prepare("UPDATE user_mfa SET status='active',enabled_at=?1,last_totp_step=?2,requires_enrollment=0,updated_at=?1 WHERE user_id=?3 AND status='pending'").bind(now, step, user.id),
      env.DB.prepare("UPDATE sessions SET mfa_verified=1 WHERE user_id=?1 AND token_hash=?2").bind(user.id, token ? await sha256(token) : ""),
      env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES(?1,?2,?3,'mfa.enrolled','user',?3,?4,?5)").bind(crypto.randomUUID(), user.organizationId, user.id, JSON.stringify({ role: user.role }), now),
    );
    await env.DB.batch(statements);
    return json({ ok: true, recoveryCodes: codes });
  } catch (error) {
    if (error instanceof Response) return error;
    if (String((error as Error)?.message) === "mfa_encryption_key_unavailable") return json({ error: "mfa_configuration_unavailable" }, 503);
    throw error;
  }
};
