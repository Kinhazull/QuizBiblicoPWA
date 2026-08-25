import type { AppEnv } from "../../../_lib/auth";
import { enforceRateLimit, requestFingerprint } from "../../../_lib/abuse";
import { decryptMfaSecret, verifyTotp } from "../../../_lib/mfa";
import { json, randomToken, sessionCookie, sha256 } from "../../../_lib/security";
import { hasCurrentLegalAcceptance } from "../../../_lib/legal";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  const body: any = await request.json().catch(() => ({}));
  const challengeToken = String(body.challengeToken || ""), code = String(body.code || "").trim().toUpperCase();
  if (!challengeToken || !code) return json({ error: "invalid_mfa_challenge" }, 400);
  const challengeHash = await sha256(challengeToken), fingerprint = await requestFingerprint(request);
  const retry = await enforceRateLimit(env, `mfa:verify:${fingerprint}:${challengeHash}`, 8, 10 * 60 * 1000);
  if (retry) return json({ error: "too_many_attempts", retryAfter: retry }, 429, { "retry-after": String(retry) });
  const now = Date.now();
  const row: any = await env.DB.prepare(`SELECT c.id challenge_id,c.user_id,c.persistent,c.expires_at,m.*,u.display_name,u.role,u.must_change_password
    FROM mfa_login_challenges c JOIN user_mfa m ON m.user_id=c.user_id JOIN users u ON u.id=c.user_id
    WHERE c.token_hash=?1 AND c.used_at IS NULL AND c.expires_at>?2 AND m.status='active' AND u.status='active'`)
    .bind(challengeHash, now).first();
  if (!row) return json({ error: "invalid_mfa_challenge" }, 401);
  const sessionToken = randomToken(), expires = now + (row.persistent ? 30 : .5) * 86400000;
  let credentialUpdate: D1PreparedStatement, challengeConsume: D1PreparedStatement;
  if (/^\d{6}$/.test(code)) {
    const step = await verifyTotp(await decryptMfaSecret(env, row), code, now, row.last_totp_step == null ? null : Number(row.last_totp_step));
    if (step === null) return json({ error: "invalid_mfa_code" }, 401);
    credentialUpdate = env.DB.prepare("UPDATE user_mfa SET last_totp_step=?1,updated_at=?2 WHERE user_id=?3 AND status='active' AND (last_totp_step IS NULL OR last_totp_step<?1)").bind(step, now, row.user_id);
    challengeConsume = row.last_totp_step == null
      ? env.DB.prepare(`UPDATE mfa_login_challenges SET used_at=?1 WHERE id=?2 AND used_at IS NULL AND expires_at>?1
          AND EXISTS(SELECT 1 FROM user_mfa WHERE user_id=?3 AND last_totp_step IS NULL)`).bind(now, row.challenge_id, row.user_id)
      : env.DB.prepare(`UPDATE mfa_login_challenges SET used_at=?1 WHERE id=?2 AND used_at IS NULL AND expires_at>?1
          AND EXISTS(SELECT 1 FROM user_mfa WHERE user_id=?3 AND last_totp_step=?4)`).bind(now, row.challenge_id, row.user_id, Number(row.last_totp_step));
  } else {
    const recoveryHash = await sha256(code);
    credentialUpdate = env.DB.prepare("UPDATE mfa_recovery_codes SET used_at=?1 WHERE user_id=?2 AND code_hash=?3 AND used_at IS NULL").bind(now, row.user_id, recoveryHash);
    challengeConsume = env.DB.prepare(`UPDATE mfa_login_challenges SET used_at=?1 WHERE id=?2 AND used_at IS NULL AND expires_at>?1
      AND EXISTS(SELECT 1 FROM mfa_recovery_codes WHERE user_id=?3 AND code_hash=?4 AND used_at IS NULL)`).bind(now, row.challenge_id, row.user_id, recoveryHash);
  }
  const results: any[] = await env.DB.batch([
    challengeConsume,
    credentialUpdate,
    env.DB.prepare(`INSERT INTO sessions(id,user_id,token_hash,persistent,expires_at,last_seen_at,created_at,user_agent,ip_hash,mfa_verified)
      SELECT ?1,?2,?3,?4,?5,?6,?6,?7,?8,1 WHERE EXISTS(SELECT 1 FROM mfa_login_challenges WHERE id=?9 AND used_at=?6)`)
      .bind(crypto.randomUUID(), row.user_id, await sha256(sessionToken), row.persistent ? 1 : 0, expires, now, String(request.headers.get("user-agent") || "").slice(0, 180), fingerprint, row.challenge_id),
    env.DB.prepare("UPDATE users SET last_login_at=?1,updated_at=?1 WHERE id=?2").bind(now, row.user_id),
  ]);
  if (Number(results[0]?.meta?.changes || 0) !== 1 || Number(results[1]?.meta?.changes || 0) !== 1 || Number(results[2]?.meta?.changes || 0) !== 1) return json({ error: "invalid_mfa_code" }, 401);
  const secureCookie = String(env.LOCAL_LAN_DEVELOPMENT) !== "true";
  return json({ ok: true, user: { id: row.user_id, displayName: row.display_name, role: row.role, mustChangePassword: Boolean(row.must_change_password), mfaStatus: "active", mfaVerified: true, mfaEnrollmentRequired: false, legalAcceptanceRequired: !(await hasCurrentLegalAcceptance(env.DB, String(row.user_id))) } }, 200, { "set-cookie": sessionCookie(sessionToken, Boolean(row.persistent), secureCookie) });
};
