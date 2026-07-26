import { currentUser, type AppEnv } from "../../_lib/auth";
import { effectivePermissions } from "../../_lib/permissions";
import { json,readCookie,sha256 } from "../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  const user = await currentUser(request, env);
  if(user){const token=readCookie(request,'quiz_session');if(token){const now=Date.now();await env.DB.prepare("UPDATE sessions SET last_seen_at=?1 WHERE token_hash=?2 AND last_seen_at<?3").bind(now,await sha256(token),now-15*60*1000).run()}}
  if (!user) return json({ authenticated: false }, 401);
  return json({ authenticated: true, user: { ...user, permissions: await effectivePermissions(env, user) } });
};
