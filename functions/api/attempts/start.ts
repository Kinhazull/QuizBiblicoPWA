import { requireUser, type AppEnv } from "../../_lib/auth";
import { json, randomToken } from "../../_lib/security";
import { seededShuffle } from "../../_lib/shuffle";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env); const body: any = await request.json(); const roundId = String(body.roundId || ""); const mode = body.mode === "practice" ? "practice" : "official"; const now = Date.now();
    const round: any = await env.DB.prepare(`SELECT * FROM rounds WHERE id=?1 AND organization_id=?2`).bind(roundId, user.organizationId).first();
    if (!round || now < round.opens_at || now >= round.closes_at) return json({ error: "round_unavailable" }, 403);
    const count: any = await env.DB.prepare(`SELECT COUNT(*) AS total FROM attempts WHERE user_id=?1 AND round_id=?2 AND mode=?3`).bind(user.id, roundId, mode).first(); const attemptNumber = Number(count?.total || 0) + 1;
    if (mode === "official" && attemptNumber > round.official_attempt_limit) return json({ error: "attempt_limit" }, 403);
    const questionsResult = await env.DB.prepare(`SELECT id,reference,prompt,commentary FROM questions WHERE round_id=?1 AND active=1`).bind(roundId).all(); const seed = randomToken(18); const questions = seededShuffle(questionsResult.results as any[], seed);
    const hydrated = [];
    for (const question of questions) { const choices = await env.DB.prepare(`SELECT id,text FROM choices WHERE question_id=?1`).bind((question as any).id).all(); hydrated.push({ id: (question as any).id, reference: (question as any).reference, prompt: (question as any).prompt, choices: seededShuffle(choices.results as any[], `${seed}:${(question as any).id}`) }); }
    const id = crypto.randomUUID(); await env.DB.prepare(`INSERT INTO attempts (id,user_id,round_id,attempt_number,mode,status,shuffle_seed,started_at) VALUES (?1,?2,?3,?4,?5,'in_progress',?6,?7)`).bind(id, user.id, roundId, attemptNumber, mode, seed, now).run();
    return json({ attempt: { id, attemptNumber, mode, secondsPerQuestion: round.seconds_per_question, questions: hydrated } }, 201);
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
