import { currentUser, type AppEnv } from "../../_lib/auth";
import { effectivePermissions } from "../../_lib/permissions";
import { json,readCookie,sha256 } from "../../_lib/security";
import { hasCurrentLegalAcceptance } from "../../_lib/legal";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  const user = await currentUser(request, env);
  if(user){const token=readCookie(request,'quiz_session');if(token){const now=Date.now();await env.DB.prepare("UPDATE sessions SET last_seen_at=?1 WHERE token_hash=?2 AND last_seen_at<?3").bind(now,await sha256(token),now-15*60*1000).run()}}
  if (!user) return json({ authenticated: false }, 401);
  const role = String((user as any).role);
  const mfaStatus = String((user as any).mfaStatus || "disabled");
  return json({ authenticated: true, user: { ...user, mfaVerified: Boolean((user as any).mfaVerified), mfaEnrollmentRequired: ["owner", "admin"].includes(role) && mfaStatus !== "active", legalAcceptanceRequired: !(await hasCurrentLegalAcceptance(env.DB, String((user as any).id))), permissions: await effectivePermissions(env, user) } });
};
