import { requireUser, type AppEnv } from "../../_lib/auth";
import { json } from "../../_lib/security";
import { ATTEMPT_GRACE_MS, latestAttemptStart } from "../../_lib/attempt-window";

async function participantState(env: AppEnv, userId: string, round: any) {
  const attempts: any = await env.DB.prepare("SELECT COUNT(CASE WHEN status<>'invalid' THEN 1 END) used,MAX(CASE WHEN status='completed' THEN score END) best,MAX(CASE WHEN mode='official' AND status='in_progress' THEN 1 ELSE 0 END) resuming FROM attempts WHERE user_id=?1 AND round_id=?2 AND mode='official'").bind(userId, round.id).first();
  return { ...round, used: Number(attempts?.used || 0), best: Number(attempts?.best || 0), resuming: Boolean(attempts?.resuming) };
}

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env), now = Date.now();
    const active = await env.DB.prepare("SELECT r.*,(SELECT COUNT(*) FROM questions q WHERE q.round_id=r.id AND q.active=1) question_count FROM rounds r WHERE r.organization_id=?1 AND r.status IN ('scheduled','active') AND r.opens_at<=?2 AND r.closes_at>?2 ORDER BY r.opens_at,r.id").bind(user.organizationId, now).all();
    const candidates = await Promise.all((active.results as any[]).map(round => participantState(env, user.id, round)));
    let round = candidates.find(item => item.resuming) || candidates.find(item => item.used < Number(item.official_attempt_limit)) || candidates[0] || null;
    let resuming = Boolean(round?.resuming);
    if (!round) {
      round = await env.DB.prepare("SELECT r.*,(SELECT COUNT(*) FROM questions q WHERE q.round_id=r.id AND q.active=1) question_count FROM rounds r JOIN attempts a ON a.round_id=r.id WHERE a.user_id=?1 AND a.mode='official' AND a.status='in_progress' AND r.status IN ('scheduled','active') AND r.closes_at<=?2 AND r.closes_at+?3>?2 ORDER BY a.started_at DESC LIMIT 1").bind(user.id, now, ATTEMPT_GRACE_MS).first();
      if (round) round = await participantState(env, user.id, round);
      resuming = Boolean(round);
    }
    if (!round) return json({ round: null, legacyConflictCount: Math.max(0, candidates.length - 1) });
    const rules = round.advanced_rules_json ? JSON.parse(round.advanced_rules_json) : null;
    const latestStartAt = latestAttemptStart(Number(round.closes_at), Number(round.question_count || 10), Number(round.seconds_per_question));
    return json({ round: { id: round.id, title: round.title, theme: round.theme, description: round.description, closesAt: round.closes_at, latestStartAt, canStart: now <= latestStartAt, resuming, attemptLimit: round.official_attempt_limit, practiceAllowed: rules?.allowPractice === true, attemptsUsed: round.used || 0, bestScore: round.best || 0 }, legacyConflictCount: Math.max(0, candidates.length - 1) });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
