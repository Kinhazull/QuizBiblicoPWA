import { requireUser, type AppEnv } from "../../_lib/auth";
import { json, randomToken } from "../../_lib/security";
import { seededShuffle } from "../../_lib/shuffle";
import { attemptGraceDeadline, latestAttemptStart } from "../../_lib/attempt-window";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const body: any = await request.json();
    const roundId = String(body.roundId || "");
    const mode = body.mode === "practice" ? "practice" : "official";
    const now = Date.now();
    const round: any = await env.DB.prepare("SELECT r.*,(SELECT COUNT(*) FROM questions q WHERE q.round_id=r.id AND q.active=1) question_count FROM rounds r WHERE r.id=?1 AND r.organization_id=?2").bind(roundId, user.organizationId).first();
    if (!round || !["scheduled", "active"].includes(round.status) || now < Number(round.opens_at)) return json({ error: "round_unavailable" }, 403);

    const existing: any = await env.DB.prepare("SELECT * FROM attempts WHERE user_id=?1 AND round_id=?2 AND mode=?3 AND status='in_progress' ORDER BY started_at DESC LIMIT 1").bind(user.id, roundId, mode).first();
    if (existing) {
      if (now > attemptGraceDeadline(Number(round.closes_at))) return json({ error: "attempt_expired" }, 403);
      await env.DB.prepare("UPDATE attempts SET resumed_count=COALESCE(resumed_count,0)+1,last_resumed_at=?1 WHERE id=?2").bind(now, existing.id).run();
      const questionsResult = await env.DB.prepare("SELECT id,reference,prompt,commentary FROM questions WHERE round_id=?1 AND active=1").bind(roundId).all();
      const questions = seededShuffle(questionsResult.results as any[], existing.shuffle_seed);
      const hydrated = [];
      for (const question of questions) {
        const choices = await env.DB.prepare("SELECT id,text FROM choices WHERE question_id=?1").bind((question as any).id).all();
        hydrated.push({ id: (question as any).id, reference: (question as any).reference, prompt: (question as any).prompt, choices: seededShuffle(choices.results as any[], `${existing.shuffle_seed}:${(question as any).id}`) });
      }
      const progress: any = await env.DB.prepare("SELECT COUNT(*) answered,COALESCE(SUM(points),0) score,MAX(answered_at) lastAnsweredAt FROM attempt_answers WHERE attempt_id=?1").bind(existing.id).first();
      const nextIndex = Number(progress?.answered || 0);
      const base = Number(progress?.lastAnsweredAt || existing.started_at);
      const remaining = Math.max(0, Number(round.seconds_per_question) - Math.floor((now - base) / 1000));
      return json({ attempt: { id: existing.id, attemptNumber: existing.attempt_number, mode, secondsPerQuestion: round.seconds_per_question, questions: hydrated, resumed: true, nextIndex, score: Number(progress?.score || 0), remainingSeconds: remaining, graceDeadline: attemptGraceDeadline(Number(round.closes_at)) } });
    }

    if (now >= Number(round.closes_at)) return json({ error: "round_unavailable" }, 403);
    const latestStart = latestAttemptStart(Number(round.closes_at), Number(round.question_count || 10), Number(round.seconds_per_question));
    if (now > latestStart) return json({ error: "round_closing", latestStartAt: latestStart }, 403);
    const count: any = await env.DB.prepare("SELECT COUNT(*) AS total FROM attempts WHERE user_id=?1 AND round_id=?2 AND mode=?3").bind(user.id, roundId, mode).first();
    const attemptNumber = Number(count?.total || 0) + 1;
    if (mode === "official" && attemptNumber > round.official_attempt_limit) return json({ error: "attempt_limit" }, 403);
    const questionsResult = await env.DB.prepare("SELECT id,reference,prompt,commentary FROM questions WHERE round_id=?1 AND active=1").bind(roundId).all();
    const seed = randomToken(18);
    const questions = seededShuffle(questionsResult.results as any[], seed);
    const hydrated = [];
    for (const question of questions) {
      const choices = await env.DB.prepare("SELECT id,text FROM choices WHERE question_id=?1").bind((question as any).id).all();
      hydrated.push({ id: (question as any).id, reference: (question as any).reference, prompt: (question as any).prompt, choices: seededShuffle(choices.results as any[], `${seed}:${(question as any).id}`) });
    }
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO attempts (id,user_id,round_id,attempt_number,mode,status,shuffle_seed,started_at) VALUES (?1,?2,?3,?4,?5,'in_progress',?6,?7)").bind(id, user.id, roundId, attemptNumber, mode, seed, now).run();
    return json({ attempt: { id, attemptNumber, mode, secondsPerQuestion: round.seconds_per_question, questions: hydrated, graceDeadline: attemptGraceDeadline(Number(round.closes_at)) } }, 201);
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
