import { json, normalizeUsername, randomToken, sessionCookie, sha256, verifyPassword } from "../../_lib/security";
import type { AppEnv } from "../../_lib/auth";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  const body: any = await request.json().catch(() => null);
  const username = normalizeUsername(String(body?.username || ""));
  const password = String(body?.password || "");
  const persistent = Boolean(body?.persistent);
  if (!username || !password) return json({ error: "invalid_credentials" }, 401);
  const user: any = await env.DB.prepare(`SELECT * FROM users WHERE username = ?1 ORDER BY created_at LIMIT 1`).bind(username).first();
  if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) return json({ error: "invalid_credentials" }, 401);
  if (user.status === "pending") return json({ error: "pending_approval" }, 403);
  if (user.status !== "active") return json({ error: "account_unavailable" }, 403);
  const token = randomToken();
  const now = Date.now();
  const expires = now + (persistent ? 30 : .5) * 24 * 60 * 60 * 1000;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO sessions (id, user_id, token_hash, persistent, expires_at, last_seen_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)`).bind(crypto.randomUUID(), user.id, await sha256(token), persistent ? 1 : 0, expires, now),
    env.DB.prepare(`UPDATE users SET last_login_at = ?1, updated_at = ?1 WHERE id = ?2`).bind(now, user.id),
  ]);
  return json({ ok: true, user: { id: user.id, displayName: user.display_name, role: user.role } }, 200, { "set-cookie": sessionCookie(token, persistent) });
};
