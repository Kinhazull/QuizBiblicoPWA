import { hashPassword, json, normalizeUsername, randomToken, sessionCookie, sha256, verifyPasswordDetails } from "../../_lib/security";
import type { AppEnv } from "../../_lib/auth";
import { enforceRateLimit, requestFingerprint } from "../../_lib/abuse";
import { effectivePermissions } from "../../_lib/permissions";
import { MFA_CHALLENGE_TTL_MS } from "../../_lib/mfa";
import { hasCurrentLegalAcceptance } from "../../_lib/legal";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  const body: any = await request.json().catch(() => null);
  const username = normalizeUsername(String(body?.username || ""));
  const password = String(body?.password || "");
  const persistent = Boolean(body?.persistent);
  if (!username || !password || password.length > 128) return json({ error: "invalid_credentials" }, 401);
  const now = Date.now();
  const usernameHash = await sha256(username);
  const fingerprint=await requestFingerprint(request),retry=await enforceRateLimit(env,`login:${fingerprint}:${usernameHash}`,10,15*60*1000);if(retry)return json({error:"too_many_attempts",retryAfter:retry},429,{"retry-after":String(retry)});
  const security: any = await env.DB.prepare("SELECT failed_count,first_failed_at,locked_until FROM login_security WHERE username_hash=?1").bind(usernameHash).first();
  if (security?.locked_until && Number(security.locked_until) > now) {
    return json({ error: "too_many_attempts", retryAfter: Math.ceil((Number(security.locked_until) - now) / 1000) }, 429, { "retry-after": String(Math.ceil((Number(security.locked_until) - now) / 1000)) });
  }
  const user: any = await env.DB.prepare(`SELECT * FROM users WHERE username = ?1 ORDER BY created_at LIMIT 1`).bind(username).first();
  const passwordCheck = user ? await verifyPasswordDetails(password, user.password_salt, user.password_hash) : false;
  if (!user || !passwordCheck || !passwordCheck.valid) {
    const withinWindow = security && now - Number(security.first_failed_at) <= 15 * 60 * 1000;
    const failedCount = withinWindow ? Number(security.failed_count) + 1 : 1;
    const firstFailedAt = withinWindow ? Number(security.first_failed_at) : now;
    const lockedUntil = failedCount >= 5 ? now + 15 * 60 * 1000 : null;
    await env.DB.prepare(`INSERT INTO login_security (username_hash,failed_count,first_failed_at,locked_until,updated_at) VALUES (?1,?2,?3,?4,?5)
      ON CONFLICT(username_hash) DO UPDATE SET failed_count=excluded.failed_count,first_failed_at=excluded.first_failed_at,locked_until=excluded.locked_until,updated_at=excluded.updated_at`).bind(usernameHash, failedCount, firstFailedAt, lockedUntil, now).run();
    if (lockedUntil) return json({ error: "too_many_attempts", retryAfter: 900 }, 429, { "retry-after": "900" });
    return json({ error: "invalid_credentials", attemptsRemaining: 5 - failedCount }, 401);
  }
  if (user.status === "pending") return json({ error: "pending_approval" }, 403);
  if (user.status !== "active") return json({ error: "account_unavailable" }, 403);
  if (passwordCheck.needsUpgrade) {
    try {
      const upgraded = await hashPassword(password);
      await env.DB.prepare(`UPDATE users SET password_hash=?1,password_salt=?2,updated_at=?3
        WHERE id=?4 AND password_hash=?5 AND password_salt=?6`)
        .bind(upgraded.hash, upgraded.salt, now, user.id, user.password_hash, user.password_salt).run();
    } catch {
      // Login remains valid; compare-and-swap keeps concurrent upgrades safe.
    }
  }
  const mfa: any = await env.DB.prepare("SELECT status FROM user_mfa WHERE user_id=?1").bind(user.id).first();
  if (mfa?.status === "active") {
    const challengeToken = randomToken();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM mfa_login_challenges WHERE expires_at<=?1 OR used_at IS NOT NULL").bind(now),
      env.DB.prepare(`INSERT INTO mfa_login_challenges(id,user_id,token_hash,persistent,expires_at,created_at)
        VALUES(?1,?2,?3,?4,?5,?6)`).bind(crypto.randomUUID(), user.id, await sha256(challengeToken), persistent ? 1 : 0, now + MFA_CHALLENGE_TTL_MS, now),
      env.DB.prepare("DELETE FROM login_security WHERE username_hash=?1").bind(usernameHash),
    ]);
    return json({ ok: true, mfaRequired: true, challengeToken });
  }
  const permissions = await effectivePermissions(env, user);
  const token = randomToken();
  const expires = now + (persistent ? 30 : .5) * 24 * 60 * 60 * 1000;
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM sessions WHERE expires_at <= ?1`).bind(now),
    env.DB.prepare(`INSERT INTO sessions (id,user_id,token_hash,persistent,expires_at,last_seen_at,created_at,user_agent,ip_hash,mfa_verified) VALUES (?1,?2,?3,?4,?5,?6,?6,?7,?8,0)`).bind(crypto.randomUUID(),user.id,await sha256(token),persistent?1:0,expires,now,String(request.headers.get('user-agent')||'').slice(0,180),await requestFingerprint(request)),
    env.DB.prepare(`UPDATE users SET last_login_at = ?1, updated_at = ?1 WHERE id = ?2`).bind(now, user.id),
    env.DB.prepare(`DELETE FROM login_security WHERE username_hash=?1`).bind(usernameHash),
  ]);
  const secureCookie = String(env.LOCAL_LAN_DEVELOPMENT) !== "true";
  const mfaEnrollmentRequired = ["owner", "admin"].includes(user.role);
  return json({ ok: true, mustChangePassword: Boolean(user.must_change_password), mfaEnrollmentRequired, user: { id: user.id, displayName: user.display_name, role: user.role, mustChangePassword: Boolean(user.must_change_password), permissions, mfaStatus: "disabled", mfaVerified: false, mfaEnrollmentRequired, legalAcceptanceRequired: !(await hasCurrentLegalAcceptance(env.DB, String(user.id))) } }, 200, { "set-cookie": sessionCookie(token, persistent, secureCookie) });
};
