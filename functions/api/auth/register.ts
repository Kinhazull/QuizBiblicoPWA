import { hashPassword, json, normalizeUsername, sha256 } from "../../_lib/security";
import type { AppEnv } from "../../_lib/auth";
import { PRIVACY_VERSION, TERMS_VERSION } from "../../_lib/legal";
import { enforceRateLimit, requestFingerprint, strongEnough } from "../../_lib/abuse";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  const fingerprint=await requestFingerprint(request),retry=await enforceRateLimit(env,`register:${fingerprint}`,8,60*60*1000);if(retry)return json({error:'too_many_requests',retryAfter:retry},429,{'retry-after':String(retry)});
  const body: any = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid_request" }, 400);
  const displayName = String(body.displayName || "").trim().replace(/\s+/g, " ");
  const username = normalizeUsername(String(body.username || ""));
  const password = String(body.password || "");
  const inviteCode = String(body.inviteCode || "").trim().toUpperCase();
  if (displayName.length < 3 || username.length < 3 || !strongEnough(password) || !inviteCode) return json({ error: "invalid_fields" }, 400);
  if (body.legalAccepted !== true || body.termsVersion !== TERMS_VERSION || body.privacyVersion !== PRIVACY_VERSION) return json({ error: "legal_consent_required" }, 400);

  const codeHash = await sha256(inviteCode);
  const now = Date.now();
  const invite: any = await env.DB.prepare(`SELECT * FROM invitations WHERE code_hash = ?1 AND active = 1 AND (expires_at IS NULL OR expires_at > ?2)`).bind(codeHash, now).first();
  if (!invite) return json({ error: "invalid_invitation" }, 403);
  const exists = await env.DB.prepare(`SELECT id FROM users WHERE organization_id = ?1 AND username = ?2`).bind(invite.organization_id, username).first();
  if (exists) return json({ error: "username_unavailable" }, 409);

  const id = crypto.randomUUID();
  const credential = await hashPassword(password);
  const status = invite.approval_required ? "pending" : "active";
  const reserved=await env.DB.prepare("UPDATE invitations SET uses=uses+1 WHERE id=?1 AND active=1 AND (expires_at IS NULL OR expires_at>?2) AND (max_uses IS NULL OR uses<max_uses)").bind(invite.id,now).run();
  if(!reserved.meta.changes)return json({error:"invitation_limit"},409);
  try{await env.DB.batch([
    env.DB.prepare(`INSERT INTO users (id, organization_id, group_id, username, display_name, password_hash, password_salt, role, status, must_change_password, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'participant', ?8, 0, ?9, ?9)`).bind(id, invite.organization_id, invite.group_id, username, displayName, credential.hash, credential.salt, status, now),
    env.DB.prepare(`INSERT INTO legal_consents (id,user_id,terms_version,privacy_version,accepted_at) VALUES (?1,?2,?3,?4,?5)`).bind(crypto.randomUUID(), id, TERMS_VERSION, PRIVACY_VERSION, now),
    env.DB.prepare(`INSERT INTO audit_logs (id, organization_id, actor_user_id, action, entity_type, entity_id, details_json, created_at) VALUES (?1, ?2, NULL, 'user.registered', 'user', ?3, ?4, ?5)`).bind(crypto.randomUUID(), invite.organization_id, id, JSON.stringify({ username }), now),
  ]);}catch(error){await env.DB.prepare("UPDATE invitations SET uses=MAX(0,uses-1) WHERE id=?1").bind(invite.id).run();if(String(error).includes("UNIQUE"))return json({error:"username_unavailable"},409);throw error}
  return json({ ok: true, status }, 201);
};
