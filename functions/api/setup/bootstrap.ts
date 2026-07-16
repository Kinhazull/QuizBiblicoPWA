import { hashPassword, json, normalizeUsername, secureEqual, sha256 } from "../../_lib/security";
import type { AppEnv } from "../../_lib/auth";
import { strongEnough } from "../../_lib/abuse";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  const provided=request.headers.get("x-bootstrap-secret")||"";if(!env.BOOTSTRAP_SECRET||!await secureEqual(provided,env.BOOTSTRAP_SECRET))return json({error:"forbidden"},403);
  const existing = await env.DB.prepare("SELECT id FROM organizations LIMIT 1").first();
  if (existing) return json({ error: "already_initialized" }, 409);
  const body: any = await request.json().catch(() => null);
  const organizationName = String(body?.organizationName || "").trim();
  const groupName = String(body?.groupName || "Jovens").trim();
  const displayName = String(body?.displayName || "").trim();
  const username = normalizeUsername(String(body?.username || ""));
  const password = String(body?.password || "");
  const inviteCode = String(body?.inviteCode || "").trim().toUpperCase();
  if (organizationName.length < 3 || displayName.length < 3 || username.length < 3 || !strongEnough(password) || inviteCode.length < 6) return json({ error: "invalid_fields" }, 400);
  const now = Date.now(); const orgId = crypto.randomUUID(); const groupId = crypto.randomUUID(); const userId = crypto.randomUUID();
  const credential = await hashPassword(password);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO organizations (id,name,slug,timezone,created_at) VALUES (?1,?2,?3,'America/Sao_Paulo',?4)").bind(orgId, organizationName, normalizeUsername(organizationName).replace(/\./g, "-"), now),
    env.DB.prepare("INSERT INTO groups (id,organization_id,name,active,created_at) VALUES (?1,?2,?3,1,?4)").bind(groupId, orgId, groupName, now),
    env.DB.prepare("INSERT INTO users (id,organization_id,group_id,username,display_name,password_hash,password_salt,role,status,must_change_password,approved_at,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,'admin','active',0,?8,?8,?8)").bind(userId, orgId, groupId, username, displayName, credential.hash, credential.salt, now),
    env.DB.prepare("INSERT INTO invitations (id,organization_id,group_id,code_hash,label,approval_required,uses,active,created_by,created_at) VALUES (?1,?2,?3,?4,'Convite inicial',1,0,1,?5,?6)").bind(crypto.randomUUID(), orgId, groupId, await sha256(inviteCode), userId, now),
  ]);
  return json({ ok: true, organizationId: orgId, adminUserId: userId }, 201);
};
