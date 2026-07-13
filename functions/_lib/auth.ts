import { readCookie, sha256 } from "./security";

export type AppEnv = { DB: D1Database; BOOTSTRAP_SECRET?: string };

export async function currentUser(request: Request, env: AppEnv) {
  const token = readCookie(request, "quiz_session");
  if (!token) return null;
  const hash = await sha256(token);
  const now = Date.now();
  return env.DB.prepare(`
    SELECT u.id, u.organization_id AS organizationId, u.group_id AS groupId,
           u.username, u.display_name AS displayName, u.role, u.status,
           u.must_change_password AS mustChangePassword
      FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?1 AND s.expires_at > ?2 AND u.status = 'active'
  `).bind(hash, now).first();
}

export async function requireUser(request: Request, env: AppEnv, allowPasswordChange = false) {
  const user = await currentUser(request, env);
  if (!user) throw new Response(JSON.stringify({ error: "not_authenticated" }), { status: 401, headers: { "content-type": "application/json" } });
  if (!allowPasswordChange && (user as any).mustChangePassword) throw new Response(JSON.stringify({ error: "password_change_required" }), { status: 403, headers: { "content-type": "application/json" } });
  return user;
}

export async function requireAdmin(request: Request, env: AppEnv) {
  const user: any = await requireUser(request, env);
  if (!['admin', 'leader'].includes(user.role)) throw new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { "content-type": "application/json" } });
  return user;
}
