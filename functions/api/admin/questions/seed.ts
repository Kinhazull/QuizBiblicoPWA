import { bibleQuestionSeed } from "../../../_data/bible-question-seed";
import type { AppEnv } from "../../../_lib/auth";
import { requirePermission } from "../../../_lib/permissions";
import { buildQuestionBankBatch, normalizeQuestion } from "../../../_lib/questions";
import { json } from "../../../_lib/security";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const admin: any = await requirePermission(request, env, "questions.edit"); const now = Date.now();
    const existing = await env.DB.prepare(`SELECT normalized_prompt FROM question_bank WHERE organization_id=?1 AND status<>'archived'`).bind(admin.organizationId).all();
    const known = new Set(existing.results.map((item: any) => item.normalized_prompt)); let skipped = 0;
    const omitted = new Set([3, 6, 8, 10, 22, 32, 40, 48, 50, 55, 60]);
    const initialBase = bibleQuestionSeed.filter((_, index) => !omitted.has(index));
    const records = initialBase.flatMap(([book, reference, theme, difficulty, prompt, correct, wrong1, wrong2, wrong3, commentary]) => { const normalized=normalizeQuestion(prompt); if(known.has(normalized)){skipped++;return []} known.add(normalized); return [{id:crypto.randomUUID(),book,reference,theme,difficulty,prompt,commentary,category:"Base inicial",choices:[correct,wrong1,wrong2,wrong3],correctIndex:0}] });
    const added=records.length; const statements=buildQuestionBankBatch(env,records,admin.organizationId,admin.id,now,"Base inicial","approved"); if(statements.length)await env.DB.batch(statements);
    await env.DB.prepare(`INSERT INTO audit_logs (id,organization_id,actor_user_id,action,entity_type,details_json,created_at) VALUES (?1,?2,?3,'question.seeded','question_bank',?4,?5)`).bind(crypto.randomUUID(), admin.organizationId, admin.id, JSON.stringify({ added, skipped }), now).run();
    return json({ ok: true, added, skipped });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
