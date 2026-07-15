import { requirePermission } from "../../_lib/permissions";
import type { AppEnv } from "../../_lib/auth";
import { json } from "../../_lib/security";
import { normalizeQuestion, validateQuestion } from "../../_lib/questions";

const MODEL = "@cf/meta/llama-3.1-8b-instruct";
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
  if (typeof payload?.questions === "string") return parseResult(payload.questions);
  if (payload && typeof payload === "object") {
    for (const value of Object.values(payload)) {
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") { try { return parseResult(value); } catch {} }
    }
  }
  throw new Error("invalid_ai_response");
}

function normalizeGeneratedQuestion(raw: any, defaults: any) {
  const choices = raw?.choices ?? raw?.alternatives ?? raw?.options;
  let correctIndex = raw?.correctIndex ?? raw?.indiceCorreto ?? raw?.correct_index;
  if (!Number.isInteger(correctIndex) && typeof raw?.respostaCorreta === "string") correctIndex = "ABCD".indexOf(raw.respostaCorreta.trim().toUpperCase()[0]);
  if (!Number.isInteger(correctIndex) && typeof raw?.correctAnswer === "string") correctIndex = "ABCD".indexOf(raw.correctAnswer.trim().toUpperCase()[0]);
  return { prompt: raw?.prompt ?? raw?.pergunta ?? raw?.question, choices, correctIndex, reference: raw?.reference ?? raw?.referencia ?? null, commentary: raw?.commentary ?? raw?.comentario ?? raw?.explanation ?? null, theme: raw?.theme ?? raw?.tema ?? defaults.theme, book: raw?.book ?? raw?.livro ?? defaults.book, category: raw?.category ?? raw?.categoria ?? defaults.category, difficulty: raw?.difficulty ?? raw?.dificuldade ?? defaults.difficulty };
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
      { role: "system", content: "Você cria perguntas para um quiz bíblico cristão em português do Brasil. Responda exclusivamente com JSON válido, sem markdown. Use fatos bíblicos verificáveis, evite ambiguidades e nunca invente referências." },
      { role: "user", content: `Gere exatamente ${count} perguntas. Tema: ${theme}. Livro: ${book || "qualquer livro bíblico"}. Categoria: ${category || "geral"}. Dificuldade: ${difficulty}. Orientação: ${reference || "nenhuma"}. Retorne {"questions":[{"prompt":"...","choices":["...","...","...","..."],"correctIndex":0,"reference":"...","commentary":"...","theme":"...","book":"...","category":"...","difficulty":"${difficulty}"}]}. correctIndex deve ser inteiro de 0 a 3.` },
    ];
    let generated: any[];
    let modelResult:any;try{modelResult=await env.AI.run(MODEL,{messages,max_tokens:2600,temperature:0.25})}catch(error){console.error(JSON.stringify({event:"ai_provider_failed",message:error instanceof Error?error.message:String(error)}));return json({error:"ai_provider_unavailable"},503)}
    try { generated=parseResult(modelResult); } catch(error){console.error(JSON.stringify({event:"ai_question_parse_failed",message:error instanceof Error?error.message:String(error)}));return json({error:"invalid_ai_response"},502)}

    const accepted: any[] = [];
    for (const raw of generated.slice(0, count)) {
      const question = validateQuestion(normalizeGeneratedQuestion(raw,{theme,book,category,difficulty}));
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
