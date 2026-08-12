import { requireUser, type AppEnv } from "./auth";

export const permissionCodes = [
  "members.manage","invitations.manage","questions.edit","questions.review","rounds.manage","reports.view",
  "audit.view","permissions.manage","notifications.manage","content.manage","events.manage","operations.view",
  "privacy.manage","economy.manage","analytics.view","content.review",
] as const;
export type PermissionCode = typeof permissionCodes[number];

const legacyLeader = new Set<PermissionCode>(["members.manage","invitations.manage","questions.edit","questions.review","rounds.manage","reports.view","audit.view"]);

/** One-way bridge: historical grants satisfy modern domains during the deprecation window. */
export const legacyPermissionCompatibility: Partial<Record<PermissionCode, readonly PermissionCode[]>> = {
  "content.manage": ["questions.edit"],
  "content.review": ["questions.review"],
  "events.manage": ["rounds.manage"],
  "operations.view": ["reports.view"],
  "privacy.manage": ["members.manage"],
  "economy.manage": ["reports.view"],
  "analytics.view": ["reports.view"],
};

function grantedByCompatibility(explicit: ReadonlySet<string>, permission: PermissionCode) {
  return explicit.has(permission) || (legacyPermissionCompatibility[permission] || []).some(code => explicit.has(code));
}

export async function effectivePermissions(env: AppEnv, user: Record<string, unknown>): Promise<PermissionCode[]> {
  const userId = typeof user.id === "string" ? user.id : "";
  const role = typeof user.role === "string" ? user.role : "";
  if (!userId) return [];
  if (["owner","admin"].includes(role)) return [];
  const result = await env.DB.prepare("SELECT permission_code AS permissionCode FROM user_permissions WHERE user_id=?1")
    .bind(userId)
    .all<{ permissionCode: string }>();
  const explicit = new Set((result.results || []).map(row => row.permissionCode));
  return permissionCodes.filter(permission => grantedByCompatibility(explicit, permission)
    || (role === "leader" && (legacyLeader.has(permission)
      || (legacyPermissionCompatibility[permission] || []).some(code => legacyLeader.has(code)))));
}

export async function hasPermission(env: AppEnv, user: any, permission: PermissionCode) {
  if (["owner","admin"].includes(user.role)) return true;
  const compatible = [permission, ...(legacyPermissionCompatibility[permission] || [])];
  if (user.role === "leader" && compatible.some(code => legacyLeader.has(code))) return true;
  for (const code of compatible) {
    const row = await env.DB.prepare(`SELECT 1 AS allowed FROM user_permissions WHERE user_id=?1 AND permission_code=?2`).bind(user.id, code).first();
    if (row) return true;
  }
  return false;
}

export async function requirePermission(request: Request, env: AppEnv, permission: PermissionCode) {
  const user: any = await requireUser(request, env);
  if(["owner","admin"].includes(user.role)&&!user.mfaVerified)throw new Response(JSON.stringify({error:"mfa_enrollment_required"}),{status:403,headers:{"content-type":"application/json"}});
  if (!await hasPermission(env, user, permission)) throw new Response(JSON.stringify({ error: "forbidden", permission }), { status: 403, headers: { "content-type": "application/json" } });
  return user;
}

export async function requireAnyPermission(request: Request, env: AppEnv, permissions: PermissionCode[]) {
  const user: any = await requireUser(request, env);
  if(["owner","admin"].includes(user.role)&&!user.mfaVerified)throw new Response(JSON.stringify({error:"mfa_enrollment_required"}),{status:403,headers:{"content-type":"application/json"}});
  for (const permission of permissions) if (await hasPermission(env, user, permission)) return user;
  throw new Response(JSON.stringify({ error: "forbidden", permissions }), { status: 403, headers: { "content-type": "application/json" } });
}
