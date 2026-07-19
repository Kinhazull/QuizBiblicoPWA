import { requireUser, type AppEnv } from "../../_lib/auth";
import { json, verifyPassword } from "../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const [profile, attempts, badges, achievements, missions, consents] = await Promise.all([
      env.DB.prepare("SELECT username,display_name,nickname,bio,favorite_book,favorite_verse,role,status,created_at,last_login_at FROM users WHERE id=?1").bind(user.id).first(),
      env.DB.prepare("SELECT a.round_id roundId,r.title,a.attempt_number attemptNumber,a.mode,a.status,a.score,a.correct_answers correctAnswers,a.total_time_ms totalTimeMs,a.started_at startedAt,a.completed_at completedAt FROM attempts a JOIN rounds r ON r.id=a.round_id WHERE a.user_id=?1 ORDER BY a.started_at DESC").bind(user.id).all(),
      env.DB.prepare("SELECT badge_code code,earned_at earnedAt FROM user_badges WHERE user_id=?1").bind(user.id).all(),
      env.DB.prepare("SELECT achievement_code code,scope_key scopeKey,source_event_id sourceEventId,unlocked_at unlockedAt FROM user_platform_achievements WHERE user_id=?1 AND organization_id=?2").bind(user.id, user.organizationId).all(),
      env.DB.prepare("SELECT mission_code code,cadence,scope_key scopeKey,window_key windowKey,target,progress,state,assigned_at assignedAt,expires_at expiresAt,completed_at completedAt,claimed_at claimedAt FROM user_platform_missions WHERE user_id=?1 AND organization_id=?2 ORDER BY assigned_at DESC").bind(user.id, user.organizationId).all(),
      env.DB.prepare("SELECT terms_version termsVersion,privacy_version privacyVersion,accepted_at acceptedAt FROM legal_consents WHERE user_id=?1").bind(user.id).all(),
    ]);
    return json({ exportedAt: Date.now(), profile, attempts: attempts.results, badges: badges.results, achievements: achievements.results, missions: missions.results, consents: consents.results });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env), body: any = await request.json();
    if (user.role === "admin") return json({ error: "admin_cannot_request" }, 400);
    const stored: any = await env.DB.prepare("SELECT password_hash,password_salt FROM users WHERE id=?1").bind(user.id).first();
    if (!stored || !await verifyPassword(String(body.password || ""), stored.password_salt, stored.password_hash)) return json({ error: "invalid_password" }, 403);
    const exists = await env.DB.prepare("SELECT id FROM privacy_requests WHERE user_id=?1 AND request_type='deletion' AND status='pending'").bind(user.id).first();
    if (exists) return json({ error: "already_requested" }, 409);
    const id = crypto.randomUUID(), now = Date.now();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO privacy_requests(id,user_id,organization_id,request_type,status,requested_at) VALUES(?1,?2,?3,'deletion','pending',?4)").bind(id, user.id, user.organizationId, now),
      env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES(?1,?2,?3,'privacy.deletion_requested','privacy_request',?4,'{}',?5)").bind(crypto.randomUUID(), user.organizationId, user.id, id, now),
    ]);
    return json({ ok: true, id }, 201);
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
