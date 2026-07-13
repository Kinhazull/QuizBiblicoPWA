import { requireAdmin, type AppEnv } from "../../_lib/auth";
import { requirePermission } from "../../_lib/permissions";
import { json } from "../../_lib/security";
import { parseBrasiliaDateTime } from "../../_lib/time";
import { normalizeQuestion, validateQuestion } from "../../_lib/questions";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try { const admin: any = await requirePermission(request, env, "rounds.manage"); const { results } = await env.DB.prepare(`SELECT r.*, COUNT(q.id) AS questionCount FROM rounds r LEFT JOIN questions q ON q.round_id=r.id WHERE r.organization_id=?1 GROUP BY r.id ORDER BY r.opens_at DESC`).bind(admin.organizationId).all(); return json({ rounds: results }); }
  catch (response) { if (response instanceof Response) return response; throw response; }
};

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const admin: any = await requirePermission(request, env, "rounds.manage"); const body: any = await request.json();
    const title = String(body.title || "").trim(); const theme = String(body.theme || "").trim(); const questions = Array.isArray(body.questions) ? body.questions : [];
    const opensAt = parseBrasiliaDateTime(body.opensAt); const closesAt = parseBrasiliaDateTime(body.closesAt);
    if (title.length < 3 || theme.length < 3 || questions.length !== 10 || !Number.isFinite(opensAt) || !Number.isFinite(closesAt) || closesAt <= opensAt) return json({ error: "invalid_round" }, 400);
    if (questions.some((q: any) => !validateQuestion({ ...q, theme: q.theme || theme }))) return json({ error: "invalid_questions" }, 400);
    const roundId = crypto.randomUUID(); const now = Date.now(); const seconds = Math.max(15, Math.min(60, Number(body.secondsPerQuestion) || 20));
    const attemptLimit=Math.max(1,Math.min(5,Number(body.officialAttemptLimit)||3)),roundType=body.roundType==="special"?"special":"regular",featured=body.featured?1:0,seasonId=String(body.seasonId||"")||null;
    if(seasonId){const season=await env.DB.prepare(`SELECT id FROM seasons WHERE id=?1 AND organization_id=?2 AND status!='cancelled'`).bind(seasonId,admin.organizationId).first();if(!season)return json({error:"invalid_season"},400)}
    const ruleNumber=(value:any,fallback:number,min:number,max:number)=>{const parsed=Number(value);return Math.max(min,Math.min(max,Number.isFinite(parsed)?parsed:fallback))};
    const advanced=body.advancedRules?{allowPractice:body.advancedRules.allowPractice!==false,basePoints:ruleNumber(body.advancedRules.basePoints,400,100,1000),speedPointsPerSecond:ruleNumber(body.advancedRules.speedPointsPerSecond,40,0,100),streakBonus:ruleNumber(body.advancedRules.streakBonus,100,0,300),minimumCorrectPoints:ruleNumber(body.advancedRules.minimumCorrectPoints,100,0,500)}:null;
    const statements = [env.DB.prepare(`INSERT INTO rounds (id,organization_id,title,theme,description,status,opens_at,closes_at,official_attempt_limit,seconds_per_question,season_id,round_type,featured,advanced_rules_json,created_by,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,'scheduled',?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?15)`).bind(roundId, admin.organizationId, title, theme, body.description || null, opensAt, closesAt, attemptLimit,seconds,seasonId,roundType,featured,advanced?JSON.stringify(advanced):null,admin.id,now)];
    const seen = new Set<string>();
    for (let position = 0; position < questions.length; position++) {
      const q: any = validateQuestion({ ...questions[position], theme: questions[position].theme || theme });
      const normalized = normalizeQuestion(q.prompt); if (seen.has(normalized)) return json({ error: "duplicate_in_round" }, 409); seen.add(normalized);
      let sourceId = String(questions[position].bankQuestionId || "") || null;
      if (sourceId) {
        const owned = await env.DB.prepare(`SELECT id FROM question_bank WHERE id=?1 AND organization_id=?2 AND status='active' AND review_status='approved'`).bind(sourceId, admin.organizationId).first();
        if (!owned) return json({ error: "invalid_bank_question" }, 400);
      } else {
        const existing: any = await env.DB.prepare(`SELECT id FROM question_bank WHERE organization_id=?1 AND normalized_prompt=?2 AND status<>'archived'`).bind(admin.organizationId, normalized).first();
        sourceId = existing?.id || crypto.randomUUID();
        if (!existing) {
          statements.push(env.DB.prepare(`INSERT INTO question_bank (id,organization_id,reference,book,theme,category,difficulty,prompt,normalized_prompt,commentary,status,times_used,created_by,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,'active',0,?11,?12,?12)`).bind(sourceId, admin.organizationId, q.reference, q.book, q.theme, q.category, q.difficulty, q.prompt, normalized, q.commentary, admin.id, now));
          q.choices.forEach((choice: string, i: number) => statements.push(env.DB.prepare(`INSERT INTO question_bank_choices (id,question_id,position,text,correct) VALUES (?1,?2,?3,?4,?5)`).bind(crypto.randomUUID(), sourceId, i, choice, i === q.correctIndex ? 1 : 0)));
        }
      }
      const questionId = crypto.randomUUID(); statements.push(env.DB.prepare(`INSERT INTO questions (id,round_id,position,reference,prompt,commentary,active,source_question_id) VALUES (?1,?2,?3,?4,?5,?6,1,?7)`).bind(questionId, roundId, position + 1, q.reference, q.prompt, q.commentary, sourceId));
      q.choices.forEach((choice: string, i: number) => statements.push(env.DB.prepare(`INSERT INTO choices (id,question_id,text,correct) VALUES (?1,?2,?3,?4)`).bind(crypto.randomUUID(), questionId, choice, i === q.correctIndex ? 1 : 0)));
      statements.push(env.DB.prepare(`UPDATE question_bank SET times_used=times_used+1,updated_at=?1 WHERE id=?2`).bind(now, sourceId));
    }
    await env.DB.batch(statements); return json({ ok: true, roundId }, 201);
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
