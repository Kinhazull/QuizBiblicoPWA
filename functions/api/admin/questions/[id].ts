import type { AppEnv } from "../../../_lib/auth";
import { requireAnyPermission, requirePermission } from "../../../_lib/permissions";
import { normalizeQuestion, validateQuestion } from "../../../_lib/questions";
import { json } from "../../../_lib/security";

export const onRequestGet = async ({ request, env, params }: { request: Request; env: AppEnv; params: { id: string } }) => {
  try {
    const admin: any = await requireAnyPermission(request, env, ["questions.edit","questions.review","rounds.manage"]);
    const question = await env.DB.prepare(`SELECT * FROM question_bank WHERE id=?1 AND organization_id=?2`).bind(params.id, admin.organizationId).first();
    if (!question) return json({ error: "not_found" }, 404);
    const choices = await env.DB.prepare(`SELECT * FROM question_bank_choices WHERE question_id=?1 ORDER BY position`).bind(params.id).all();
    return json({ question, choices: choices.results });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};

export const onRequestPatch = async ({ request, env, params }: { request: Request; env: AppEnv; params: { id: string } }) => {
  try {
    const admin: any = await requirePermission(request, env, "questions.edit"); const body: any = await request.json();
    const question = validateQuestion(body); if (!question) return json({ error: "invalid_question" }, 400);
    const normalized = normalizeQuestion(question.prompt);
    const duplicate = await env.DB.prepare(`SELECT id,prompt FROM question_bank WHERE organization_id=?1 AND normalized_prompt=?2 AND id<>?3 AND status<>'archived'`).bind(admin.organizationId, normalized, params.id).first();
    if (duplicate) return json({ error: "duplicate_question", duplicate }, 409);
    const existing: any = await env.DB.prepare(`SELECT * FROM question_bank WHERE id=?1 AND organization_id=?2`).bind(params.id, admin.organizationId).first();
    if (!existing) return json({ error: "not_found" }, 404);
    const existingChoices = await env.DB.prepare(`SELECT position,text,correct FROM question_bank_choices WHERE question_id=?1 ORDER BY position`).bind(params.id).all();
    const now = Date.now();
    const previousVersion=Number(existing.version||1); const snapshot=JSON.stringify({reference:existing.reference,book:existing.book,theme:existing.theme,category:existing.category,difficulty:existing.difficulty,prompt:existing.prompt,commentary:existing.commentary,status:existing.status,reviewStatus:existing.review_status,choices:existingChoices.results});
    const oldChoices=(existingChoices.results as any[]).map(choice=>choice.text);const contentChanged=normalizeQuestion(existing.prompt)!==normalized||JSON.stringify(oldChoices)!==JSON.stringify(question.choices)||existing.reference!==question.reference||existing.commentary!==question.commentary;const nextReviewStatus=contentChanged?"draft":existing.review_status;
    const statements = [env.DB.prepare(`INSERT INTO question_revisions (id,question_id,version,snapshot_json,change_note,created_by,created_at) VALUES (?1,?2,?3,?4,?5,?6,?7)`).bind(crypto.randomUUID(),params.id,previousVersion,snapshot,String(body.changeNote||"").trim()||null,admin.id,now),env.DB.prepare(`UPDATE question_bank SET reference=?1,book=?2,theme=?3,category=?4,difficulty=?5,prompt=?6,normalized_prompt=?7,commentary=?8,status=?9,review_status=?10,version=?11,updated_by=?12,updated_at=?13 WHERE id=?14`).bind(question.reference, question.book, question.theme, question.category, question.difficulty, question.prompt, normalized, question.commentary, body.status === "draft" ? "draft" : "active",nextReviewStatus,previousVersion+1,admin.id,now,params.id), env.DB.prepare(`DELETE FROM question_bank_choices WHERE question_id=?1`).bind(params.id)];
    question.choices.forEach((choice: string, position: number) => statements.push(env.DB.prepare(`INSERT INTO question_bank_choices (id,question_id,position,text,correct) VALUES (?1,?2,?3,?4,?5)`).bind(crypto.randomUUID(), params.id, position, choice, position === question.correctIndex ? 1 : 0)));
    statements.push(env.DB.prepare(`INSERT INTO audit_logs (id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES (?1,?2,?3,'question.updated','question_bank',?4,?5,?6)`).bind(crypto.randomUUID(), admin.organizationId, admin.id, params.id, JSON.stringify({ prompt: question.prompt }), now));
    await env.DB.batch(statements); return json({ ok: true });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};

export const onRequestDelete = async ({ request, env, params }: { request: Request; env: AppEnv; params: { id: string } }) => {
  try {
    const admin: any = await requirePermission(request, env, "questions.edit"); const now = Date.now();
    const result = await env.DB.prepare(`UPDATE question_bank SET status='archived',updated_at=?1 WHERE id=?2 AND organization_id=?3`).bind(now, params.id, admin.organizationId).run();
    if (!result.meta.changes) return json({ error: "not_found" }, 404);
    await env.DB.prepare(`INSERT INTO audit_logs (id,organization_id,actor_user_id,action,entity_type,entity_id,created_at) VALUES (?1,?2,?3,'question.archived','question_bank',?4,?5)`).bind(crypto.randomUUID(), admin.organizationId, admin.id, params.id, now).run();
    return json({ ok: true });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
