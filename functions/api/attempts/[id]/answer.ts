import { requireUser, type AppEnv } from "../../../_lib/auth";
import { json } from "../../../_lib/security";
import { attemptGraceDeadline } from "../../../_lib/attempt-window";

export const onRequestPost = async ({ request, env, params }: { request: Request; env: AppEnv; params: { id: string } }) => {
  try {
    const user: any = await requireUser(request, env);
    const body: any = await request.json();
    const now = Date.now();
    const attempt: any = await env.DB.prepare("SELECT a.*,r.seconds_per_question,r.closes_at,r.status round_status,r.advanced_rules_json FROM attempts a JOIN rounds r ON r.id=a.round_id WHERE a.id=?1 AND a.user_id=?2 AND a.status='in_progress'").bind(params.id, user.id).first();
    if (!attempt || now > attemptGraceDeadline(Number(attempt.closes_at)) || !["scheduled", "active"].includes(attempt.round_status)) return json({ error: "attempt_unavailable" }, 404);

    const questionId = String(body.questionId || "");
    const choiceId = String(body.choiceId || "");
    const choice: any = await env.DB.prepare("SELECT c.correct,q.commentary FROM choices c JOIN questions q ON q.id=c.question_id WHERE c.id=?1 AND c.question_id=?2 AND q.round_id=?3").bind(choiceId, questionId, attempt.round_id).first();
    if (!choice) return json({ error: "invalid_answer" }, 400);

    const duplicate: any = await env.DB.prepare("SELECT aa.correct,aa.points,q.commentary FROM attempt_answers aa JOIN questions q ON q.id=aa.question_id WHERE aa.attempt_id=?1 AND aa.question_id=?2").bind(params.id, questionId).first();
    if (duplicate) {
      const totals: any = await env.DB.prepare("SELECT COALESCE(SUM(points),0) totalScore FROM attempt_answers WHERE attempt_id=?1").bind(params.id).first();
      return json({ correct: Boolean(duplicate.correct), points: Number(duplicate.points), commentary: duplicate.commentary || "", alreadySaved: true, totalScore: Number(totals?.totalScore || 0) });
    }

    const previous: any = await env.DB.prepare("SELECT correct,answered_at FROM attempt_answers WHERE attempt_id=?1 ORDER BY question_order DESC").bind(params.id).all();
    const order = previous.results.length;
    const base = order ? Number((previous.results[0] as any).answered_at) : Number(attempt.started_at);
    const elapsed = Math.max(500, Math.min(now - base, attempt.seconds_per_question * 1000));
    let streak = 0;
    for (const answer of previous.results as any[]) {
      if (!answer.correct) break;
      streak++;
    }
    const correct = !body.timedOut && Boolean(choice.correct);
    const rules=attempt.advanced_rules_json?JSON.parse(attempt.advanced_rules_json):null,basePoints=Number(rules?.basePoints??400),speedPoints=Number(rules?.speedPointsPerSecond??40),streakBonus=Number(rules?.streakBonus??100),minimum=Number(rules?.minimumCorrectPoints??100);
    const points = correct ? Math.max(minimum, basePoints + Math.floor((attempt.seconds_per_question * 1000 - elapsed) / 1000) * speedPoints + streak * streakBonus) : 0;
    const choiceOrder = JSON.stringify(Array.isArray(body.choiceOrder) ? body.choiceOrder : []);
    await env.DB.prepare("INSERT INTO attempt_answers (attempt_id,question_id,choice_id,question_order,choice_order_json,correct,response_time_ms,points,answered_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)").bind(params.id, questionId, choiceId, order, choiceOrder, correct ? 1 : 0, elapsed, points, now).run();
    const totals: any = await env.DB.prepare("SELECT COALESCE(SUM(points),0) totalScore FROM attempt_answers WHERE attempt_id=?1").bind(params.id).first();
    return json({ correct, points, commentary: choice.commentary || "", alreadySaved: false, totalScore: Number(totals?.totalScore || 0) });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
