import { requireUser, type AppEnv } from "../_lib/auth";
import { json } from "../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => { try {
  const user: any = await requireUser(request, env), now = Date.now();
  const recommendations = await env.DB.prepare(`SELECT qb.id,qb.prompt,qb.reference,qb.theme,qb.book,qb.difficulty,qb.commentary,SUM(CASE WHEN aa.correct=0 THEN 1 ELSE 0 END) wrongCount,COUNT(*) answerCount,MAX(aa.answered_at) lastAnsweredAt,COALESCE(urp.times_reviewed,0) timesReviewed,COALESCE(urp.mastered,0) mastered,(SELECT text FROM question_bank_choices c WHERE c.question_id=qb.id AND c.correct=1 LIMIT 1) correctAnswer FROM attempt_answers aa JOIN attempts a ON a.id=aa.attempt_id JOIN rounds r ON r.id=a.round_id JOIN questions q ON q.id=aa.question_id JOIN question_bank qb ON qb.id=q.source_question_id LEFT JOIN user_review_progress urp ON urp.user_id=a.user_id AND urp.question_id=qb.id WHERE a.user_id=?1 AND a.mode='official' AND a.status='completed' AND (r.closes_at<=?2 OR r.status IN ('closed','cancelled')) GROUP BY qb.id HAVING wrongCount>0 ORDER BY mastered ASC,(wrongCount*1.0/answerCount) DESC,lastAnsweredAt DESC LIMIT 20`).bind(user.id, now).all();
  const topics = await env.DB.prepare(`SELECT qb.theme,qb.book,qb.difficulty,COUNT(*) answers,SUM(aa.correct) correct,ROUND(SUM(aa.correct)*100.0/COUNT(*)) accuracy FROM attempt_answers aa JOIN attempts a ON a.id=aa.attempt_id JOIN rounds r ON r.id=a.round_id JOIN questions q ON q.id=aa.question_id JOIN question_bank qb ON qb.id=q.source_question_id WHERE a.user_id=?1 AND a.mode='official' AND a.status='completed' AND (r.closes_at<=?2 OR r.status IN ('closed','cancelled')) GROUP BY qb.theme,qb.book,qb.difficulty ORDER BY accuracy ASC,answers DESC LIMIT 12`).bind(user.id, now).all();
  return json({ recommendations: recommendations.results, topics: topics.results });
} catch (response) { if (response instanceof Response) return response; throw response; } };

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => { try {
  const user: any = await requireUser(request, env), body: any = await request.json(), questionId = String(body.questionId || ""), mastered = body.mastered ? 1 : 0, now = Date.now();
  const eligible = await env.DB.prepare(`SELECT qb.id FROM attempt_answers aa JOIN attempts a ON a.id=aa.attempt_id JOIN rounds r ON r.id=a.round_id JOIN questions q ON q.id=aa.question_id JOIN question_bank qb ON qb.id=q.source_question_id WHERE a.user_id=?1 AND qb.id=?2 AND aa.correct=0 AND a.mode='official' AND a.status='completed' AND (r.closes_at<=?3 OR r.status IN ('closed','cancelled')) LIMIT 1`).bind(user.id, questionId, now).first();
  if (!eligible) return json({ error: "not_eligible" }, 403);
  await env.DB.prepare(`INSERT INTO user_review_progress(user_id,question_id,times_reviewed,last_reviewed_at,mastered) VALUES(?1,?2,1,?3,?4) ON CONFLICT(user_id,question_id) DO UPDATE SET times_reviewed=times_reviewed+1,last_reviewed_at=excluded.last_reviewed_at,mastered=excluded.mastered`).bind(user.id, questionId, now, mastered).run();
  return json({ ok: true });
} catch (response) { if (response instanceof Response) return response; throw response; } };
