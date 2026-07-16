import { requireUser, type AppEnv } from "../../../_lib/auth";
import { json } from "../../../_lib/security";
import { attemptGraceDeadline } from "../../../_lib/attempt-window";
import { enforceRateLimit, requestFingerprint } from "../../../_lib/abuse";
import { seededShuffle } from "../../../_lib/shuffle";
import { calculateAnswerPoints, scoringRules, summarizeAnswers } from "../../../_lib/scoring";
import { syncBadges } from "../../../_lib/badges";

async function persistedAnswer(env: AppEnv, attemptId: string, questionId: string) {
  return env.DB.prepare("SELECT aa.choice_id choiceId,aa.correct,aa.points,aa.response_time_ms responseTimeMs,q.commentary,c.correct choiceCorrect,r.seconds_per_question secondsPerQuestion FROM attempt_answers aa JOIN attempts a ON a.id=aa.attempt_id JOIN rounds r ON r.id=a.round_id JOIN questions q ON q.id=aa.question_id JOIN choices c ON c.id=aa.choice_id WHERE aa.attempt_id=?1 AND aa.question_id=?2").bind(attemptId, questionId).first<any>();
}

async function savedResponse(env: AppEnv, saved: any, attemptId: string) {
  const totals: any = await env.DB.prepare("SELECT COALESCE(SUM(points),0) totalScore FROM attempt_answers WHERE attempt_id=?1").bind(attemptId).first();
  const timedOut = !saved.correct && (Boolean(saved.choiceCorrect) || Number(saved.responseTimeMs) >= Number(saved.secondsPerQuestion) * 1000);
  return { correct: Boolean(saved.correct), timedOut, points: Number(saved.points), commentary: timedOut ? `${saved.choiceCorrect ? "A alternativa estava correta, mas chegou após o encerramento do tempo." : "Tempo encerrado para esta pergunta."} ${saved.commentary || ""}`.trim() : saved.commentary || "", alreadySaved: true, totalScore: Number(totals?.totalScore || 0) };
}

export const onRequestPost = async ({ request, env, params }: { request: Request; env: AppEnv; params: { id: string } }) => {
  try {
    const user: any = await requireUser(request, env), fingerprint = await requestFingerprint(request), retry = await enforceRateLimit(env, `answer:${user.id}:${fingerprint}`, 150, 10 * 60 * 1000);
    if (retry) return json({ error: "too_many_requests", retryAfter: retry }, 429, { "retry-after": String(retry) });
    const body: any = await request.json(), questionId = String(body?.questionId || ""), choiceId = String(body?.choiceId || ""), clientTimedOut = body?.timedOut === true;
    if (!questionId || !choiceId) return json({ error: "invalid_answer" }, 400);
    const now = Date.now(), attempt: any = await env.DB.prepare("SELECT a.*,r.seconds_per_question,r.closes_at,r.status round_status,r.advanced_rules_json,(SELECT COUNT(*) FROM questions q WHERE q.round_id=a.round_id AND q.active=1) question_count FROM attempts a JOIN rounds r ON r.id=a.round_id WHERE a.id=?1 AND a.user_id=?2 AND a.status IN ('in_progress','completed')").bind(params.id, user.id).first();
    if (!attempt) return json({ error: "attempt_unavailable" }, 404);

    const duplicate: any = await persistedAnswer(env, params.id, questionId);
    if (duplicate) {
      if (duplicate.choiceId !== choiceId) return json({ error: "answer_already_saved" }, 409);
      return json(await savedResponse(env, duplicate, params.id));
    }
    if (attempt.status !== "in_progress" || now > attemptGraceDeadline(Number(attempt.closes_at)) || !["scheduled", "active"].includes(attempt.round_status)) return json({ error: "attempt_unavailable" }, 404);

    const previous = await env.DB.prepare("SELECT question_order,correct,points,response_time_ms,answered_at FROM attempt_answers WHERE attempt_id=?1 ORDER BY question_order").bind(params.id).all();
    const order = previous.results.length;
    let expectedOrder: string[] = []; try { expectedOrder = JSON.parse(attempt.question_order_json || "[]"); } catch {}
    if (expectedOrder.length !== Number(attempt.question_count) || expectedOrder[order] !== questionId) return json({ error: "invalid_question_order" }, 409);
    const choice: any = await env.DB.prepare("SELECT c.correct,q.commentary FROM choices c JOIN questions q ON q.id=c.question_id WHERE c.id=?1 AND c.question_id=?2 AND q.round_id=?3 AND q.active=1").bind(choiceId, questionId, attempt.round_id).first();
    if (!choice) return json({ error: "invalid_answer" }, 400);
    const availableChoices = await env.DB.prepare("SELECT id FROM choices WHERE question_id=?1 ORDER BY id").bind(questionId).all();
    if (availableChoices.results.length !== 4) return json({ error: "invalid_round_content" }, 409);

    const questionStartedAt = Number(attempt.current_question_started_at || attempt.started_at), rawElapsed = Math.max(0, now - questionStartedAt), allowedMs = Number(attempt.seconds_per_question) * 1000, elapsed = Math.max(0, Math.min(rawElapsed, allowedMs)), serverTimedOut = rawElapsed > allowedMs + 1500;
    let currentStreak = 0; for (let index = previous.results.length - 1; index >= 0 && (previous.results[index] as any).correct; index--) currentStreak++;
    let parsedRules: unknown = null; try { parsedRules = attempt.advanced_rules_json ? JSON.parse(attempt.advanced_rules_json) : null; } catch {}
    // A client timeout may only forfeit an answer; it can never improve its result.
    const correct = !clientTimedOut && !serverTimedOut && Boolean(choice.correct), rules = scoringRules(parsedRules), points = calculateAnswerPoints({ correct, elapsedMs: elapsed, secondsPerQuestion: Number(attempt.seconds_per_question), currentStreak, rules });
    const choiceOrder = JSON.stringify(seededShuffle((availableChoices.results as any[]).map(item => item.id), `${attempt.shuffle_seed}:${questionId}`));
    const answerStatement = env.DB.prepare("INSERT INTO attempt_answers (attempt_id,question_id,choice_id,question_order,choice_order_json,correct,response_time_ms,points,answered_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)").bind(params.id, questionId, choiceId, order, choiceOrder, correct ? 1 : 0, elapsed, points, now);
    const isLast = order + 1 === Number(attempt.question_count);
    let finalResult: ReturnType<typeof summarizeAnswers> | null = null;
    try {
      if (isLast) {
        finalResult = summarizeAnswers([...(previous.results as any[]), { correct, points, response_time_ms: elapsed }]);
        await env.DB.batch([answerStatement, env.DB.prepare("UPDATE attempts SET status='completed',score=?1,correct_answers=?2,total_time_ms=?3,max_streak=?4,completed_at=?5 WHERE id=?6 AND status='in_progress'").bind(finalResult.score, finalResult.correctAnswers, finalResult.totalTimeMs, finalResult.maxStreak, now, params.id), env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES(?1,?2,?3,'attempt.completed','attempt',?4,?5,?6)").bind(crypto.randomUUID(), user.organizationId, user.id, params.id, JSON.stringify({ mode: attempt.mode, roundId: attempt.round_id, score: finalResult.score, correctAnswers: finalResult.correctAnswers }), now)]);
      } else await env.DB.batch([answerStatement,env.DB.prepare("UPDATE attempts SET current_question_started_at=NULL WHERE id=?1 AND status='in_progress'").bind(params.id)]);
    } catch {
      const winner: any = await persistedAnswer(env, params.id, questionId);
      if (winner && winner.choiceId === choiceId) return json(await savedResponse(env, winner, params.id));
      return json({ error: winner ? "answer_already_saved" : "answer_conflict" }, 409);
    }
    if (isLast) await syncBadges(env, user.id);
    const totalScore = finalResult?.score ?? Number((await env.DB.prepare("SELECT COALESCE(SUM(points),0) total FROM attempt_answers WHERE attempt_id=?1").bind(params.id).first<any>())?.total || 0);
    const expiredCorrect = clientTimedOut || serverTimedOut;
    return json({ correct, timedOut: expiredCorrect, points, commentary: clientTimedOut || (serverTimedOut && !choice.correct) ? `Tempo encerrado para esta pergunta. ${choice.commentary || ""}`.trim() : serverTimedOut ? `A alternativa estava correta, mas chegou após o encerramento do tempo. ${choice.commentary || ""}`.trim() : choice.commentary || "", alreadySaved: false, totalScore, attemptCompleted: isLast, result: finalResult });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
