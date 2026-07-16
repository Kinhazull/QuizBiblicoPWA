import { requireUser, type AppEnv } from "../../../_lib/auth";
import { json } from "../../../_lib/security";
import { flushBadgeSync, queueBadgeSyncStatement } from "../../../_lib/badges";
import { attemptGraceDeadline } from "../../../_lib/attempt-window";
import { enforceRateLimit, requestFingerprint } from "../../../_lib/abuse";
import { summarizeAnswers } from "../../../_lib/scoring";

function completed(attempt: any, alreadyFinished = false) {
  return json({ ok: true, alreadyFinished, result: { score: Number(attempt.score || 0), correctAnswers: Number(attempt.correct_answers || 0), totalTimeMs: Number(attempt.total_time_ms || 0), maxStreak: Number(attempt.max_streak || 0) } });
}

export const onRequestPost = async ({ request, env, params }: { request: Request; env: AppEnv; params: { id: string } }) => { try {
  const user: any = await requireUser(request, env), retry = await enforceRateLimit(env, `finish:${user.id}:${await requestFingerprint(request)}`, 30, 600000);
  if (retry) return json({ error: "too_many_requests", retryAfter: retry }, 429, { "retry-after": String(retry) });
  const attempt: any = await env.DB.prepare("SELECT a.*,r.closes_at FROM attempts a JOIN rounds r ON r.id=a.round_id WHERE a.id=?1 AND a.user_id=?2").bind(params.id, user.id).first();
  if (!attempt || ["invalid", "abandoned"].includes(attempt.status)) return json({ error: "attempt_unavailable" }, 404);
  if (attempt.status === "completed") return completed(attempt, true);
  if (attempt.status !== "in_progress" || Date.now() > attemptGraceDeadline(Number(attempt.closes_at))) return json({ error: "attempt_unavailable" }, 404);
  const answers = await env.DB.prepare("SELECT correct,points,response_time_ms FROM attempt_answers WHERE attempt_id=?1 ORDER BY question_order").bind(params.id).all(), total: any = await env.DB.prepare("SELECT COUNT(*) total FROM questions WHERE round_id=?1 AND active=1").bind(attempt.round_id).first();
  if (!answers.results.length || answers.results.length !== Number(total?.total || 0)) return json({ error: "incomplete_attempt" }, 400);
  const summary = summarizeAnswers(answers.results as any[]), now = Date.now();
  const updated = await env.DB.batch([
    env.DB.prepare("UPDATE attempts SET status='completed',score=?1,correct_answers=?2,total_time_ms=?3,max_streak=?4,completed_at=?5 WHERE id=?6 AND status='in_progress'").bind(summary.score, summary.correctAnswers, summary.totalTimeMs, summary.maxStreak, now, params.id),
    queueBadgeSyncStatement(env,user.id,"attempt.completed",now),
    env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) SELECT ?1,?2,?3,'attempt.completed','attempt',?4,?5,?6 WHERE EXISTS(SELECT 1 FROM attempts WHERE id=?4 AND status='completed') AND NOT EXISTS(SELECT 1 FROM audit_logs WHERE action='attempt.completed' AND entity_id=?4)").bind(crypto.randomUUID(), user.organizationId, user.id, params.id, JSON.stringify({ mode: attempt.mode, roundId: attempt.round_id, score: summary.score }), now)
  ]);
  if (!updated[0].meta.changes) { const winner: any = await env.DB.prepare("SELECT * FROM attempts WHERE id=?1 AND user_id=?2 AND status='completed'").bind(params.id, user.id).first(); return winner ? completed(winner, true) : json({ error: "attempt_conflict" }, 409); }
  await flushBadgeSync(env, user.id); return json({ ok: true, alreadyFinished: false, result: summary });
} catch (response) { if (response instanceof Response) return response; throw response; } };
