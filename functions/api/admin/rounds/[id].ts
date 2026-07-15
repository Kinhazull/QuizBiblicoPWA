import type { AppEnv } from "../../../_lib/auth";
import { requirePermission } from "../../../_lib/permissions";
import { json, verifyPassword } from "../../../_lib/security";
import { parseBrasiliaDateTime } from "../../../_lib/time";
import { findRoundScheduleConflict, validateRoundConfiguration, validateRoundSeason, validateStoredRound } from "../../../_lib/rounds";

export const onRequestGet = async ({ request, env, params }: { request: Request; env: AppEnv; params: { id: string } }) => {
  try {
    const admin: any = await requirePermission(request, env, "rounds.manage");
    const round: any = await env.DB.prepare("SELECT * FROM rounds WHERE id=?1 AND organization_id=?2").bind(params.id, admin.organizationId).first();
    if (!round) return json({ error: "not_found" }, 404);
    const found = await env.DB.prepare("SELECT * FROM questions WHERE round_id=?1 ORDER BY position").bind(params.id).all();
    const questions = [];
    for (const question of found.results as any[]) {
      const choices = await env.DB.prepare("SELECT id,text,correct FROM choices WHERE question_id=?1").bind(question.id).all();
      questions.push({ ...question, choices: choices.results });
    }
    const attempts: any = await env.DB.prepare("SELECT COUNT(*) total,COUNT(DISTINCT user_id) participants FROM attempts WHERE round_id=?1 AND status='completed'").bind(params.id).first();
    return json({ round, questions, attempts });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};

export const onRequestPatch = async ({ request, env, params }: { request: Request; env: AppEnv; params: { id: string } }) => {
  try {
    const admin: any = await requirePermission(request, env, "rounds.manage");
    const body: any = await request.json();
    const current: any = await env.DB.prepare("SELECT r.*,(SELECT COUNT(*) FROM attempts a WHERE a.round_id=r.id) attempt_count FROM rounds r WHERE r.id=?1 AND r.organization_id=?2").bind(params.id, admin.organizationId).first();
    if (!current) return json({ error: "not_found" }, 404);
    const status = String(body.status || current.status);
    if (!["draft", "scheduled", "active", "closed", "cancelled"].includes(status)) return json({ error: "invalid_status" }, 400);
    const now = Date.now();
    const opensAt = status === "active" && body.releaseNow ? now : body.opensAt ? parseBrasiliaDateTime(body.opensAt) : current.opens_at;
    const closesAt = body.closesAt ? parseBrasiliaDateTime(body.closesAt) : current.closes_at;
    if (!Number.isFinite(opensAt)) return json({ error: "invalid_opening_date", field: "opensAt" }, 400);
    if (!Number.isFinite(closesAt)) return json({ error: "invalid_closing_date", field: "closesAt" }, 400);
    if (closesAt <= opensAt) return json({ error: "invalid_schedule", field: "closesAt" }, 400);
    const editingDetails = body.title !== undefined || body.theme !== undefined || body.description !== undefined || body.secondsPerQuestion !== undefined || body.opensAt !== undefined || body.closesAt !== undefined || body.seasonId !== undefined || body.roundType !== undefined || body.officialAttemptLimit !== undefined || body.advancedRules !== undefined;
    if (editingDetails && (Number(current.attempt_count) > 0 || !["draft", "scheduled"].includes(current.status))) return json({ error: "round_locked" }, 409);
    const title = String(body.title ?? current.title).trim();
    const theme = String(body.theme ?? current.theme).trim();
    const description = body.description === undefined ? current.description : String(body.description).trim();
    const seconds = Math.max(15, Math.min(60, Number(body.secondsPerQuestion ?? current.seconds_per_question)));
    const bounded=(value:any,fallback:number,min:number,max:number)=>{const parsed=Number(value);return Math.max(min,Math.min(max,Number.isFinite(parsed)?parsed:fallback))},attemptLimit=Math.max(1,Math.min(5,Number(body.officialAttemptLimit??current.official_attempt_limit))),roundType=body.roundType==="special"?"special":body.roundType==="regular"?"regular":current.round_type,seasonId=body.seasonId===undefined?current.season_id:(String(body.seasonId||"")||null),featured=body.featured===undefined?current.featured:(body.featured?1:0),advancedRules=body.advancedRules===undefined?current.advanced_rules_json:(body.advancedRules?JSON.stringify({allowPractice:body.advancedRules.allowPractice!==false,basePoints:bounded(body.advancedRules.basePoints,400,100,1000),speedPointsPerSecond:bounded(body.advancedRules.speedPointsPerSecond,40,0,100),streakBonus:bounded(body.advancedRules.streakBonus,100,0,300),minimumCorrectPoints:bounded(body.advancedRules.minimumCorrectPoints,100,0,500)}):null);
    const seasonValidation=await validateRoundSeason(env,admin.organizationId,roundType,seasonId,Number(opensAt),Number(closesAt));if(!seasonValidation.ok)return json({error:seasonValidation.error,field:"seasonId"},400);
    if (title.length < 3 || theme.length < 3) return json({ error: "invalid_fields" }, 400);
    const configurationError=validateRoundConfiguration({opensAt:Number(opensAt),closesAt:Number(closesAt),secondsPerQuestion:seconds,attemptLimit});if(configurationError)return json({error:configurationError},400);
    if (["scheduled","active"].includes(status)) { const conflictingRound=await findRoundScheduleConflict(env,admin.organizationId,Number(opensAt),Number(closesAt),params.id);if(conflictingRound)return json({error:"round_schedule_conflict",conflictingRound},409);const validation=await validateStoredRound(env,params.id,admin.organizationId,{opensAt:Number(opensAt),closesAt:Number(closesAt),secondsPerQuestion:seconds,attemptLimit,seasonId,roundType}); if(!validation.ok)return json({error:"round_not_publishable",reason:validation.error},409); }
    await env.DB.batch([
      env.DB.prepare("UPDATE rounds SET title=?1,theme=?2,description=?3,status=?4,opens_at=?5,closes_at=?6,seconds_per_question=?7,official_attempt_limit=?8,season_id=?9,round_type=?10,featured=?11,advanced_rules_json=?12,updated_at=?13 WHERE id=?14 AND organization_id=?15").bind(title,theme,description||null,status,opensAt,closesAt,seconds,attemptLimit,seasonId,roundType,featured,advancedRules,now,params.id,admin.organizationId),
      env.DB.prepare("INSERT INTO audit_logs (id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES (?1,?2,?3,'round.updated','round',?4,?5,?6)").bind(crypto.randomUUID(), admin.organizationId, admin.id, params.id, JSON.stringify({ status, editingDetails }), now),
    ]);
    return json({ ok: true });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};

export const onRequestDelete = async ({ request, env, params }: { request: Request; env: AppEnv; params: { id: string } }) => {
  try {
    const admin: any = await requirePermission(request, env, "rounds.manage");
    const body: any = await request.json();
    const credentials: any = await env.DB.prepare("SELECT password_hash,password_salt FROM users WHERE id=?1").bind(admin.id).first();
    if (!credentials || !await verifyPassword(String(body.password || ""), credentials.password_salt, credentials.password_hash)) return json({ error: "invalid_password" }, 403);
    const count: any = await env.DB.prepare("SELECT COUNT(*) total FROM attempts WHERE round_id=?1").bind(params.id).first();
    if (Number(count?.total || 0) > 0) {
      const now=Date.now();await env.DB.batch([env.DB.prepare("UPDATE rounds SET status='cancelled',updated_at=?1 WHERE id=?2 AND organization_id=?3").bind(now, params.id, admin.organizationId),env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES(?1,?2,?3,'round.cancelled_with_history','round',?4,?5,?6)").bind(crypto.randomUUID(),admin.organizationId,admin.id,params.id,JSON.stringify({attempts:Number(count.total)}),now)]);
      return json({ ok: true, archived: true });
    }
    const now=Date.now();await env.DB.batch([env.DB.prepare("UPDATE rounds SET status='cancelled',updated_at=?1 WHERE id=?2 AND organization_id=?3").bind(now, params.id, admin.organizationId),env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES(?1,?2,?3,'round.cancelled','round',?4,'{}',?5)").bind(crypto.randomUUID(),admin.organizationId,admin.id,params.id,now)]);
    return json({ ok: true, archived: true });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
