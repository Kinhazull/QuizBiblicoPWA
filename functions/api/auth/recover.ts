import type { AppEnv } from "../../_lib/auth";
import { hashPassword, json, normalizeUsername, sha256 } from "../../_lib/security";
import { enforceRateLimit, requestFingerprint, strongEnough } from "../../_lib/abuse";

const RECOVERY_CODE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  const fingerprint = await requestFingerprint(request);
  const retry = await enforceRateLimit(env, `recover:${fingerprint}`, 6, 30 * 60 * 1000);
  if (retry) return json({ error: "too_many_requests", retryAfter: retry }, 429, { "retry-after": String(retry) });

  const body: any = await request.json().catch(() => null);
  const username = normalizeUsername(String(body?.username || ""));
  const code = String(body?.code || "").trim().toUpperCase();
  const password = String(body?.password || "");
  if (!username || code.length < 8 || !strongEnough(password)) return json({ error: "invalid_fields" }, 400);

  const now = Date.now();
  const codeHash = await sha256(code);
  const match: any = await env.DB.prepare(`SELECT rc.id codeId,u.id,u.organization_id organizationId
    FROM account_recovery_codes rc JOIN users u ON u.id=rc.user_id
    WHERE rc.code_hash=?1 AND rc.used_at IS NULL AND u.username=?2 AND u.status='active' AND rc.created_at>?3`)
    .bind(codeHash, username, now - RECOVERY_CODE_TTL_MS).first();
  if (!match) return json({ error: "invalid_recovery" }, 403);

  const hashed = await hashPassword(password);
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE users SET password_hash=?1,password_salt=?2,must_change_password=0,updated_at=?3
      WHERE id=?4 AND EXISTS (
        SELECT 1 FROM account_recovery_codes
        WHERE id=?5 AND user_id=?4 AND used_at IS NULL AND created_at>?6
      )`).bind(hashed.hash, hashed.salt, now, match.id, match.codeId, now - RECOVERY_CODE_TTL_MS),
    env.DB.prepare(`UPDATE account_recovery_codes SET used_at=?1
      WHERE user_id=?2 AND used_at IS NULL
        AND EXISTS (SELECT 1 FROM users WHERE id=?2 AND password_hash=?3 AND password_salt=?4 AND updated_at=?1)`)
      .bind(now, match.id, hashed.hash, hashed.salt),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id=?1
      AND EXISTS (SELECT 1 FROM users WHERE id=?1 AND password_hash=?2 AND password_salt=?3 AND updated_at=?4)`)
      .bind(match.id, hashed.hash, hashed.salt, now),
    env.DB.prepare(`DELETE FROM login_security WHERE username_hash=?1
      AND EXISTS (SELECT 1 FROM users WHERE id=?2 AND password_hash=?3 AND password_salt=?4 AND updated_at=?5)`)
      .bind(await sha256(username), match.id, hashed.hash, hashed.salt, now),
    env.DB.prepare(`INSERT INTO audit_logs (id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at)
      SELECT ?1,?2,?3,'account.self_recovered','user',?3,'{}',?4
      WHERE EXISTS (SELECT 1 FROM users WHERE id=?3 AND password_hash=?5 AND password_salt=?6 AND updated_at=?4)`)
      .bind(crypto.randomUUID(), match.organizationId, match.id, now, hashed.hash, hashed.salt),
  ]);
  if (!results[0]?.meta?.changes) return json({ error: "invalid_recovery" }, 403);
  return json({ ok: true });
};
