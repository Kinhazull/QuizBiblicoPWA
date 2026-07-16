import { requireUser, type AppEnv } from "../../../_lib/auth";
import { json } from "../../../_lib/security";
import { attemptGraceDeadline } from "../../../_lib/attempt-window";

export const onRequestPost = async ({ request, env, params }: { request: Request; env: AppEnv; params: { id: string } }) => {
  try {
    const user: any = await requireUser(request, env);
    const now = Date.now();
    const attempt: any = await env.DB.prepare(`SELECT a.id,a.status,a.current_question_started_at currentQuestionStartedAt,r.closes_at closesAt,r.seconds_per_question secondsPerQuestion,
      (SELECT COUNT(*) FROM attempt_answers aa WHERE aa.attempt_id=a.id) answered,
      (SELECT COUNT(*) FROM questions q WHERE q.round_id=a.round_id AND q.active=1) questionCount
      FROM attempts a JOIN rounds r ON r.id=a.round_id WHERE a.id=?1 AND a.user_id=?2`).bind(params.id, user.id).first();
    if (!attempt || attempt.status !== "in_progress" || now > attemptGraceDeadline(Number(attempt.closesAt))) return json({ error: "attempt_unavailable" }, 404);
    const answered = Number(attempt.answered || 0), questionCount = Number(attempt.questionCount || 0);
    if (!answered || answered >= questionCount) return json({ error: "nothing_to_advance" }, 409);
    if (!attempt.currentQuestionStartedAt) {
      await env.DB.prepare("UPDATE attempts SET current_question_started_at=?1 WHERE id=?2 AND current_question_started_at IS NULL AND status='in_progress'").bind(now, params.id).run();
    }
    const persisted: any = await env.DB.prepare("SELECT current_question_started_at startedAt FROM attempts WHERE id=?1").bind(params.id).first();
    const startedAt = Number(persisted?.startedAt || now);
    return json({ ok: true, nextIndex: answered, startedAt, remainingSeconds: Math.max(0, Number(attempt.secondsPerQuestion) - Math.floor((now - startedAt) / 1000)) });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
