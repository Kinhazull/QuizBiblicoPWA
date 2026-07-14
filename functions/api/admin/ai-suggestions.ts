import { requirePermission } from "../../_lib/permissions";
import type { AppEnv } from "../../_lib/auth";
import { json } from "../../_lib/security";
import { normalizeQuestion, validateQuestion } from "../../_lib/questions";

const MODEL = "@cf/meta/llama-3.1-8b-instruct";
const questionSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array", minItems: 1, maxItems: 5,
      items: {
        type: "object",
        properties: {
          prompt: { type: "string" }, choices: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" } },
          correctIndex: { type: "integer", minimum: 0, maximum: 3 }, reference: { type: "string" }, book: { type: "string" },
          theme: { type: "string" }, category: { type: "string" }, difficulty: { type: "string", enum: ["easy", "medium", "hard"] }, commentary: { type: "string" },
        },
        required: ["prompt", "choices", "correctIndex", "reference", "book", "theme", "category", "difficulty", "commentary"],
      },
    },
  },
  required: ["questions"],
};

function parseJsonText(text: string): any {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {
    const objectStart = cleaned.indexOf("{"), objectEnd = cleaned.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) { try { return JSON.parse(cleaned.slice(objectStart, objectEnd + 1)); } catch {} }
    const arrayStart = cleaned.indexOf("["), arrayEnd = cleaned.lastIndexOf("]");
    if (arrayStart >= 0 && arrayEnd > arrayStart) return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
    throw new Error("invalid_ai_response");
  }
}

function parseResult(result: any): any[] {
  let payload = result?.response ?? result?.result?.response ?? result;
  if (typeof payload === "string") payload = parseJsonText(payload);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.questions)) return payload.questions;
  if (Array.isArray(payload?.items)) return payload.items;
  throw new Error("invalid_ai_response");
}

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requirePermission(request, env, "questions.edit");
    const rows = await env.DB.prepare(`SELECT id,model,question_json questionJson,status,imported_question_id importedQuestionId,created_at createdAt FROM ai_question_suggestions WHERE organization_id=?1 ORDER BY created_at DESC LIMIT 60`).bind(user.organizationId).all();
    return json({ configured: Boolean(env.AI), suggestions: (rows.results as any[]).map(row => ({ ...row, question: JSON.parse(row.questionJson) })) });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requirePermission(request, env, "questions.edit");
    if (!env.AI) return json({ error: "ai_not_configured" }, 503);
    const body: any = await request.json(), theme = String(body.theme || "").trim(), book = String(body.book || "").trim(), category = String(body.category || "").trim(), difficulty = ["easy", "medium", "hard"].includes(body.difficulty) ? body.difficulty : "medium", count = Math.max(1, Math.min(5, Number(body.count) || 3)), reference = String(body.reference || "").trim();
    if (theme.length < 3 || theme.length > 80 || book.length > 40 || category.length > 50 || reference.length > 80) return json({ error: "invalid_request" }, 400);
    const since = new Date().setHours(0, 0, 0, 0), usage: any = await env.DB.prepare("SELECT COUNT(*) total FROM ai_question_suggestions WHERE organization_id=?1 AND created_at>=?2").bind(user.organizationId, since).first();
    if (Number(usage?.total || 0) >= 30) return json({ error: "daily_ai_limit" }, 429);

    const messages = [
      { role: "system", content: "Você cria perguntas para um quiz bíblico cristão em português do Brasil. Use somente fatos bíblicos verificáveis, evite ambiguidades e nunca invente referências." },
      { role: "user", content: `Gere exatamente ${count} perguntas de múltipla escolha. Tema: ${theme}. Livro: ${book || "qualquer livro bíblico"}. Categoria: ${category || "geral"}. Dificuldade: ${difficulty}. Referência ou orientação adicional: ${reference || "nenhuma"}. Cada pergunta deve ter quatro alternativas, uma resposta correta, referência e comentário curto.` },
    ];
    let generated: any[];
    try {
      generated = parseResult(await env.AI.run(MODEL, { messages, max_tokens: 2600, temperature: 0.35, response_format: { type: "json_schema", json_schema: questionSchema } }));
    } catch (error) {
      console.error(JSON.stringify({ event: "ai_question_parse_failed", message: error instanceof Error ? error.message : String(error) }));
      return json({ error: "invalid_ai_response" }, 502);
    }

    const accepted: any[] = [];
    for (const raw of generated.slice(0, count)) {
      const question = validateQuestion({ ...raw, theme: raw.theme || theme, book: raw.book || book, category: raw.category || category, difficulty: raw.difficulty || difficulty });
      if (!question) continue;
      const duplicate = await env.DB.prepare("SELECT id FROM question_bank WHERE organization_id=?1 AND normalized_prompt=?2 AND status<>'archived'").bind(user.organizationId, normalizeQuestion(question.prompt)).first();
      if (!duplicate) accepted.push(question);
    }
    if (!accepted.length) return json({ error: "no_valid_suggestions" }, 422);
    const now = Date.now(), requestData = JSON.stringify({ theme, book, category, difficulty, count, reference }), statements: D1PreparedStatement[] = [], output = [];
    for (const question of accepted) {
      const id = crypto.randomUUID(); output.push({ id, question, status: "suggested", createdAt: now });
      statements.push(env.DB.prepare("INSERT INTO ai_question_suggestions(id,organization_id,requested_by,model,request_json,question_json,status,created_at) VALUES(?1,?2,?3,?4,?5,?6,'suggested',?7)").bind(id, user.organizationId, user.id, MODEL, requestData, JSON.stringify(question), now));
    }
    statements.push(env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,details_json,created_at) VALUES(?1,?2,?3,'ai.questions_suggested','ai_suggestion',?4,?5)").bind(crypto.randomUUID(), user.organizationId, user.id, JSON.stringify({ requested: count, accepted: accepted.length, theme, model: MODEL }), now));
    await env.DB.batch(statements);
    return json({ suggestions: output, discarded: count - accepted.length }, 201);
  } catch (response) { if (response instanceof Response) return response; throw response; }
};

export const onRequestPatch = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requirePermission(request, env, "questions.edit"), body: any = await request.json(), id = String(body.id || ""), action = String(body.action || "");
    const stored: any = await env.DB.prepare("SELECT * FROM ai_question_suggestions WHERE id=?1 AND organization_id=?2 AND status='suggested'").bind(id, user.organizationId).first();
    if (!stored) return json({ error: "not_found" }, 404);
    const now = Date.now();
    if (action === "discard") { await env.DB.prepare("UPDATE ai_question_suggestions SET status='discarded',reviewed_at=?1,reviewed_by=?2 WHERE id=?3").bind(now, user.id, id).run(); return json({ ok: true }); }
    if (action !== "import") return json({ error: "invalid_action" }, 400);
    const question = validateQuestion(body.question || JSON.parse(stored.question_json));
    if (!question) return json({ error: "invalid_question" }, 400);
    const normalized = normalizeQuestion(question.prompt), duplicate = await env.DB.prepare("SELECT id FROM question_bank WHERE organization_id=?1 AND normalized_prompt=?2 AND status<>'archived'").bind(user.organizationId, normalized).first();
    if (duplicate) return json({ error: "duplicate_question", duplicate }, 409);
    const questionId = crypto.randomUUID(), statements: D1PreparedStatement[] = [env.DB.prepare(`INSERT INTO question_bank(id,organization_id,reference,book,theme,category,difficulty,prompt,normalized_prompt,commentary,status,review_status,times_used,created_by,updated_by,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,'draft','draft',0,?11,?11,?12,?12)`).bind(questionId, user.organizationId, question.reference, question.book, question.theme, question.category, question.difficulty, question.prompt, normalized, question.commentary, user.id, now)];
    question.choices.forEach((choice: string, position: number) => statements.push(env.DB.prepare("INSERT INTO question_bank_choices(id,question_id,position,text,correct) VALUES(?1,?2,?3,?4,?5)").bind(crypto.randomUUID(), questionId, position, choice, position === question.correctIndex ? 1 : 0)));
    statements.push(env.DB.prepare("UPDATE ai_question_suggestions SET status='imported',question_json=?1,imported_question_id=?2,reviewed_at=?3,reviewed_by=?4 WHERE id=?5").bind(JSON.stringify(question), questionId, now, user.id, id), env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES(?1,?2,?3,'ai.question_imported','question_bank',?4,?5,?6)").bind(crypto.randomUUID(), user.organizationId, user.id, questionId, JSON.stringify({ suggestionId: id, reviewStatus: "draft" }), now));
    await env.DB.batch(statements);
    return json({ ok: true, questionId }, 201);
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
