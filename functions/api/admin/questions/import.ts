import type { AppEnv } from "../../../_lib/auth";
import { requirePermission } from "../../../_lib/permissions";
import { buildQuestionBankBatch, normalizeQuestion, validateQuestion } from "../../../_lib/questions";
import { json } from "../../../_lib/security";

const words = (value: string) => new Set(normalizeQuestion(value).split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 3));
const similarity = (left: string, right: string) => {
  const a = words(left), b = words(right);
  if (!a.size || !b.size) return 0;
  let common = 0;
  a.forEach(word => { if (b.has(word)) common++; });
  return common / (a.size + b.size - common);
};

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const admin: any = await requirePermission(request, env, "questions.edit");
    const body: any = await request.json();
    const input = Array.isArray(body.questions) ? body.questions : [];
    if (!input.length || input.length > 100) return json({ error: "invalid_quantity" }, 400);
    if (JSON.stringify(input).includes("�")) return json({ error: "invalid_encoding" }, 400);

    const questions = input.map(validateQuestion);
    if (questions.some(question => !question)) return json({ error: "invalid_questions" }, 400);
    const current = await env.DB.prepare(`SELECT id,prompt,normalized_prompt FROM question_bank WHERE organization_id=?1 AND status<>'archived'`).bind(admin.organizationId).all();
    const exact = new Map(current.results.map((item: any) => [item.normalized_prompt, item]));
    const seen = new Map<string, number>();
    const review = questions.map((question: any, index: number) => {
      const normalized = normalizeQuestion(question.prompt), duplicate: any = exact.get(normalized), repeatedRow = seen.get(normalized);
      seen.set(normalized, index);
      let similar: any = null, best = 0;
      if (!duplicate && repeatedRow === undefined) {
        for (const item of current.results as any[]) {
          const score = similarity(question.prompt, item.prompt);
          if (score > best) { best = score; similar = item; }
        }
      }
      return { index, status: duplicate || repeatedRow !== undefined ? "duplicate" : best >= 0.6 ? "similar" : "ready", match: duplicate?.prompt || (repeatedRow !== undefined ? questions[repeatedRow]?.prompt : similar?.prompt) || null, similarity: Math.round(best * 100) };
    });

    if (!body.commit) return json({ review, totals: { ready: review.filter(item => item.status === "ready").length, similar: review.filter(item => item.status === "similar").length, duplicate: review.filter(item => item.status === "duplicate").length } });
    const accepted = questions.filter((_: any, index: number) => review[index].status !== "duplicate").map((question: any) => ({ ...question, id: crypto.randomUUID() }));
    const now = Date.now(), statements = buildQuestionBankBatch(env, accepted, admin.organizationId, admin.id, now);
    if (statements.length) await env.DB.batch(statements);
    await env.DB.prepare(`INSERT INTO audit_logs (id,organization_id,actor_user_id,action,entity_type,details_json,created_at) VALUES (?1,?2,?3,'question.imported','question_bank',?4,?5)`).bind(crypto.randomUUID(), admin.organizationId, admin.id, JSON.stringify({ received: questions.length, added: accepted.length, duplicates: questions.length - accepted.length }), now).run();
    return json({ ok: true, added: accepted.length, skipped: questions.length - accepted.length });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
