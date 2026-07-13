import { requireAdmin, type AppEnv } from "../../_lib/auth";
import { json } from "../../_lib/security";
import { parseBrasiliaDateTime } from "../../_lib/time";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try { const admin: any = await requireAdmin(request, env); const { results } = await env.DB.prepare(`SELECT r.*, COUNT(q.id) AS questionCount FROM rounds r LEFT JOIN questions q ON q.round_id=r.id WHERE r.organization_id=?1 GROUP BY r.id ORDER BY r.opens_at DESC`).bind(admin.organizationId).all(); return json({ rounds: results }); }
  catch (response) { if (response instanceof Response) return response; throw response; }
};

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const admin: any = await requireAdmin(request, env); const body: any = await request.json();
    const title = String(body.title || "").trim(); const theme = String(body.theme || "").trim(); const questions = Array.isArray(body.questions) ? body.questions : [];
    const opensAt = parseBrasiliaDateTime(body.opensAt); const closesAt = parseBrasiliaDateTime(body.closesAt);
    if (title.length < 3 || theme.length < 3 || questions.length !== 10 || !Number.isFinite(opensAt) || !Number.isFinite(closesAt) || closesAt <= opensAt) return json({ error: "invalid_round" }, 400);
    if (questions.some((q: any) => !q.prompt || !Array.isArray(q.choices) || q.choices.length !== 4 || q.correctIndex < 0 || q.correctIndex > 3)) return json({ error: "invalid_questions" }, 400);
    const roundId = crypto.randomUUID(); const now = Date.now(); const seconds = Math.max(15, Math.min(60, Number(body.secondsPerQuestion) || 20)); const statements = [env.DB.prepare(`INSERT INTO rounds (id,organization_id,title,theme,description,status,opens_at,closes_at,official_attempt_limit,seconds_per_question,created_by,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,'scheduled',?6,?7,3,?8,?9,?10,?10)`).bind(roundId, admin.organizationId, title, theme, body.description || null, opensAt, closesAt, seconds, admin.id, now)];
    questions.forEach((q: any, position: number) => { const questionId = crypto.randomUUID(); statements.push(env.DB.prepare(`INSERT INTO questions (id,round_id,position,reference,prompt,commentary,active) VALUES (?1,?2,?3,?4,?5,?6,1)`).bind(questionId, roundId, position + 1, q.reference || null, String(q.prompt).trim(), q.commentary || null)); q.choices.forEach((choice: string, i: number) => statements.push(env.DB.prepare(`INSERT INTO choices (id,question_id,text,correct) VALUES (?1,?2,?3,?4)`).bind(crypto.randomUUID(), questionId, String(choice).trim(), i === Number(q.correctIndex) ? 1 : 0))); });
    await env.DB.batch(statements); return json({ ok: true, roundId }, 201);
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
