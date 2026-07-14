import { requireUser, type AppEnv } from "../../_lib/auth";
import { json } from "../../_lib/security";
import { ATTEMPT_GRACE_MS, latestAttemptStart } from "../../_lib/attempt-window";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const now = Date.now();
    let round: any = await env.DB.prepare("SELECT r.*,(SELECT COUNT(*) FROM questions q WHERE q.round_id=r.id AND q.active=1) question_count FROM rounds r WHERE r.organization_id=?1 AND r.status IN ('scheduled','active') AND r.opens_at<=?2 AND r.closes_at>?2 ORDER BY r.opens_at DESC LIMIT 1").bind(user.organizationId, now).first();
    let resuming = false;

    if (!round) {
      round = await env.DB.prepare("SELECT r.*,(SELECT COUNT(*) FROM questions q WHERE q.round_id=r.id AND q.active=1) question_count FROM rounds r JOIN attempts a ON a.round_id=r.id WHERE a.user_id=?1 AND a.mode='official' AND a.status='in_progress' AND r.status IN ('scheduled','active') AND r.closes_at<=?2 AND r.closes_at+?3>?2 ORDER BY a.started_at DESC LIMIT 1").bind(user.id, now, ATTEMPT_GRACE_MS).first();
      resuming = Boolean(round);
    }

    if (!round) return json({ round: null });
    const attempts: any = await env.DB.prepare("SELECT COUNT(CASE WHEN status<>'invalid' THEN 1 END) AS used,MAX(CASE WHEN status='completed' THEN score END) AS best FROM attempts WHERE user_id=?1 AND round_id=?2 AND mode='official'").bind(user.id, round.id).first();
    const rules=round.advanced_rules_json?JSON.parse(round.advanced_rules_json):null;
    const latestStartAt = latestAttemptStart(Number(round.closes_at), Number(round.question_count || 10), Number(round.seconds_per_question));
    return json({ round: {
      id: round.id,
      title: round.title,
      theme: round.theme,
      description: round.description,
      closesAt: round.closes_at,
      latestStartAt,
      canStart: now <= latestStartAt,
      resuming,
      attemptLimit: round.official_attempt_limit,
      practiceAllowed: rules?.allowPractice===true,
      attemptsUsed: attempts?.used || 0,
      bestScore: attempts?.best || 0,
    } });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
