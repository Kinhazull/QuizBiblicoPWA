import { requireUser, type AppEnv } from "../../../_lib/auth";
import { enforceRateLimit } from "../../../_lib/abuse";
import { encryptMfaSecret, generateMfaSecret, totpUri } from "../../../_lib/mfa";
import { json } from "../../../_lib/security";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env, true);
    if (!["owner", "admin", "leader"].includes(user.role)) return json({ error: "mfa_not_available" }, 403);
    const retry = await enforceRateLimit(env, `mfa:setup:${user.id}`, 5, 15 * 60 * 1000);
    if (retry) return json({ error: "too_many_attempts", retryAfter: retry }, 429, { "retry-after": String(retry) });
    const current: any = await env.DB.prepare("SELECT status FROM user_mfa WHERE user_id=?1").bind(user.id).first();
    if (current?.status === "active") return json({ error: "mfa_already_enabled" }, 409);
    const secret = generateMfaSecret();
    const protectedSecret = await encryptMfaSecret(env, secret);
    const now = Date.now();
    await env.DB.prepare(`INSERT INTO user_mfa(user_id,status,encrypted_secret,secret_iv,key_version,requires_enrollment,created_at,updated_at)
      VALUES(?1,'pending',?2,?3,?4,1,?5,?5)
      ON CONFLICT(user_id) DO UPDATE SET status='pending',encrypted_secret=excluded.encrypted_secret,
      secret_iv=excluded.secret_iv,key_version=excluded.key_version,requires_enrollment=1,updated_at=excluded.updated_at`)
      .bind(user.id, protectedSecret.encryptedSecret, protectedSecret.secretIv, protectedSecret.keyVersion, now).run();
    return json({ secret, otpauthUri: totpUri(user.username, secret) });
  } catch (error) {
    if (error instanceof Response) return error;
    if (String((error as Error)?.message) === "mfa_encryption_key_unavailable") return json({ error: "mfa_configuration_unavailable" }, 503);
    throw error;
  }
};
