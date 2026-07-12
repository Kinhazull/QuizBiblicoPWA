import { requireUser, type AppEnv } from "../../../_lib/auth";
import { json } from "../../../_lib/security";

export const onRequestPost = async ({ request, env, params }: { request: Request; env: AppEnv; params: { id: string } }) => {
  try {
    const user: any = await requireUser(request, env); const body: any = await request.json(); const now = Date.now();
    const attempt: any = await env.DB.prepare(`SELECT a.*,r.seconds_per_question FROM attempts a JOIN rounds r ON r.id=a.round_id WHERE a.id=?1 AND a.user_id=?2 AND a.status='in_progress'`).bind(params.id, user.id).first(); if (!attempt) return json({ error: "attempt_unavailable" }, 404);
    const questionId = String(body.questionId || ""); const choiceId = String(body.choiceId || ""); const order = Number(body.questionOrder); const elapsed = Math.max(500, Math.min(Number(body.responseTimeMs) || attempt.seconds_per_question * 1000, attempt.seconds_per_question * 1000));
    const choice: any = await env.DB.prepare(`SELECT c.correct,q.commentary FROM choices c JOIN questions q ON q.id=c.question_id WHERE c.id=?1 AND c.question_id=?2 AND q.round_id=?3`).bind(choiceId, questionId, attempt.round_id).first(); if (!choice) return json({ error: "invalid_answer" }, 400);
    const duplicate = await env.DB.prepare(`SELECT 1 FROM attempt_answers WHERE attempt_id=?1 AND question_id=?2`).bind(params.id, questionId).first(); if (duplicate) return json({ error: "already_answered" }, 409);
    const previous: any = await env.DB.prepare(`SELECT correct FROM attempt_answers WHERE attempt_id=?1 ORDER BY question_order DESC`).bind(params.id).all(); let streak = 0; for (const answer of previous.results as any[]) { if (!answer.correct) break; streak++; }
    const correct = !body.timedOut && Boolean(choice.correct); const points = correct ? Math.max(100, 400 + Math.floor((attempt.seconds_per_question * 1000 - elapsed) / 1000) * 40 + streak * 100) : 0;
    const choiceOrder = JSON.stringify(Array.isArray(body.choiceOrder) ? body.choiceOrder : []);
    await env.DB.prepare(`INSERT INTO attempt_answers (attempt_id,question_id,choice_id,question_order,choice_order_json,correct,response_time_ms,points,answered_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`).bind(params.id, questionId, choiceId, order, choiceOrder, correct ? 1 : 0, elapsed, points, now).run();
    return json({ correct, points, commentary: choice.commentary || "" });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
