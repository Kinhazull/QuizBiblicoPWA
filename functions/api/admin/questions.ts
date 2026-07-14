import type { AppEnv } from "../../_lib/auth";
import { requireAnyPermission, requirePermission } from "../../_lib/permissions";
import { normalizeQuestion, validateQuestion } from "../../_lib/questions";
import { json } from "../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const admin: any = await requireAnyPermission(request, env, ["questions.edit","questions.review","rounds.manage"]);
    const url = new URL(request.url);
    const search = String(url.searchParams.get("q") || "").trim().slice(0, 45);
    const archived = url.searchParams.get("archived") === "1";
    const filters: string[] = ["qb.organization_id=?1", archived ? "qb.status='archived'" : url.searchParams.get("selectable") === "1" ? "qb.status='active' AND qb.review_status='approved'" : "qb.status<>'archived'"];
    const values: any[] = [admin.organizationId];
    for (const [field, column] of [["theme", "qb.theme"], ["book", "qb.book"], ["category", "qb.category"], ["difficulty", "qb.difficulty"]]) {
      const value = String(url.searchParams.get(field) || "").trim();
      if (value) { values.push(value); filters.push(`${column}=?${values.length}`); }
    }
    if (search) { values.push(`%${search}%`); filters.push(`(qb.prompt LIKE ?${values.length} OR qb.reference LIKE ?${values.length})`); }
    const reviewStatus=String(url.searchParams.get("reviewStatus")||""); if(reviewStatus){values.push(reviewStatus);filters.push(`qb.review_status=?${values.length}`)}
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.max(20, Math.min(100, Number(url.searchParams.get("limit")) || 20));
    const countValues = [...values];
    const count: any = await env.DB.prepare(`SELECT COUNT(*) AS total FROM question_bank qb WHERE ${filters.join(" AND ")}`).bind(...countValues).first();
    values.push(limit, (page - 1) * limit);
    const sql = `SELECT qb.*, (SELECT COUNT(*) FROM question_bank_choices qbc WHERE qbc.question_id=qb.id) AS choiceCount
      FROM question_bank qb WHERE ${filters.join(" AND ")} ORDER BY qb.updated_at DESC LIMIT ?${values.length - 1} OFFSET ?${values.length}`;
    const { results } = await env.DB.prepare(sql).bind(...values).all();
    const facets = await env.DB.prepare(`SELECT theme, book, category FROM question_bank WHERE organization_id=?1 AND status<>'archived'`).bind(admin.organizationId).all();
    const total = Number(count?.total || 0);
    return json({ questions: results, page, pageSize: limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), hasMore: page * limit < total, facets: facets.results });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const admin: any = await requirePermission(request, env, "questions.edit");
    const body: any = await request.json();
    const question = validateQuestion(body);
    if (!question) return json({ error: "invalid_question" }, 400);
    const normalized = normalizeQuestion(question.prompt);
    const duplicate = await env.DB.prepare(`SELECT id,prompt FROM question_bank WHERE organization_id=?1 AND normalized_prompt=?2 AND status<>'archived'`).bind(admin.organizationId, normalized).first();
    if (duplicate) return json({ error: "duplicate_question", duplicate }, 409);
    const id = crypto.randomUUID(); const now = Date.now();
    const statements = [env.DB.prepare(`INSERT INTO question_bank (id,organization_id,reference,book,theme,category,difficulty,prompt,normalized_prompt,commentary,status,review_status,times_used,created_by,updated_by,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,'draft',0,?12,?12,?13,?13)`).bind(id, admin.organizationId, question.reference, question.book, question.theme, question.category, question.difficulty, question.prompt, normalized, question.commentary, body.status === "draft" ? "draft" : "active", admin.id, now)];
    question.choices.forEach((choice: string, position: number) => statements.push(env.DB.prepare(`INSERT INTO question_bank_choices (id,question_id,position,text,correct) VALUES (?1,?2,?3,?4,?5)`).bind(crypto.randomUUID(), id, position, choice, position === question.correctIndex ? 1 : 0)));
    statements.push(env.DB.prepare(`INSERT INTO audit_logs (id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES (?1,?2,?3,'question.created','question_bank',?4,?5,?6)`).bind(crypto.randomUUID(), admin.organizationId, admin.id, id, JSON.stringify({ prompt: question.prompt }), now));
    await env.DB.batch(statements);
    return json({ ok: true, id }, 201);
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
