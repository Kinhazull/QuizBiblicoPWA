import { requireUser, type AppEnv } from "./auth";

export const permissionCodes = ["members.manage","invitations.manage","questions.edit","questions.review","rounds.manage","reports.view","audit.view","permissions.manage","notifications.manage"] as const;
export type PermissionCode = typeof permissionCodes[number];

const legacyLeader = new Set<PermissionCode>(["members.manage","invitations.manage","questions.edit","questions.review","rounds.manage","reports.view","audit.view"]);

export async function hasPermission(env: AppEnv, user: any, permission: PermissionCode) {
  if (user.role === "admin") return true;
  if (user.role === "leader" && legacyLeader.has(permission)) return true;
  const row = await env.DB.prepare(`SELECT 1 AS allowed FROM user_permissions WHERE user_id=?1 AND permission_code=?2`).bind(user.id, permission).first();
  return Boolean(row);
}

export async function requirePermission(request: Request, env: AppEnv, permission: PermissionCode) {
  const user: any = await requireUser(request, env);
  if (!await hasPermission(env, user, permission)) throw new Response(JSON.stringify({ error: "forbidden", permission }), { status: 403, headers: { "content-type": "application/json" } });
  return user;
}

export async function requireAnyPermission(request: Request, env: AppEnv, permissions: PermissionCode[]) {
  const user: any = await requireUser(request, env);
  for (const permission of permissions) if (await hasPermission(env, user, permission)) return user;
  throw new Response(JSON.stringify({ error: "forbidden", permissions }), { status: 403, headers: { "content-type": "application/json" } });
}
