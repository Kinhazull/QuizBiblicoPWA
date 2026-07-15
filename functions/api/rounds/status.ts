import { requireUser, type AppEnv } from "../../_lib/auth";
import { json } from "../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => { try {
  const user: any = await requireUser(request, env), now = Date.now();
  const current: any = await env.DB.prepare(`SELECT id,title,theme,opens_at opensAt,closes_at closesAt,official_attempt_limit attemptLimit,seconds_per_question secondsPerQuestion,advanced_rules_json advancedRulesJson FROM rounds WHERE organization_id=?1 AND opens_at<=?2 AND closes_at>?2 AND status IN ('scheduled','active') ORDER BY opens_at DESC LIMIT 1`).bind(user.organizationId, now).first();
  const next: any = await env.DB.prepare(`SELECT id,title,opens_at opensAt FROM rounds WHERE organization_id=?1 AND opens_at>?2 AND status='scheduled' ORDER BY opens_at LIMIT 1`).bind(user.organizationId, now).first();
  const recent: any = await env.DB.prepare(`SELECT r.id,r.title,r.closes_at closesAt,MAX(CASE WHEN a.mode='official' AND a.status='completed' THEN a.score END) bestScore FROM rounds r LEFT JOIN attempts a ON a.round_id=r.id AND a.user_id=?1 WHERE r.organization_id=?2 AND (r.closes_at<=?3 OR r.status='closed') AND r.status<>'cancelled' GROUP BY r.id ORDER BY r.closes_at DESC LIMIT 1`).bind(user.id, user.organizationId, now).first();
  let completion = null, practice = null, ranking = null;
  if (current) {
    let rules: any = null; try { rules = current.advancedRulesJson ? JSON.parse(current.advancedRulesJson) : null; } catch {}
    current.practiceAllowed = rules?.allowPractice === true; delete current.advancedRulesJson;
    const official: any = await env.DB.prepare(`SELECT COUNT(CASE WHEN status<>'invalid' THEN 1 END) attemptsUsed,COUNT(CASE WHEN status='completed' THEN 1 END) completedAttempts,MAX(CASE WHEN status='completed' THEN score END) bestScore,MAX(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) inProgress FROM attempts WHERE user_id=?1 AND round_id=?2 AND mode='official'`).bind(user.id, current.id).first();
    const attemptsUsed = Number(official?.attemptsUsed || 0);
    const training: any = await env.DB.prepare(`SELECT COUNT(CASE WHEN status='completed' THEN 1 END) completed,MAX(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) inProgress FROM attempts WHERE user_id=?1 AND round_id=?2 AND mode='practice'`).bind(user.id, current.id).first();
    completion = { attemptsUsed, bestScore: Number(official?.bestScore || 0), completed: Number(official?.completedAttempts || 0) >= 1, inProgress: Boolean(official?.inProgress), optionalAttemptsRemaining: Math.max(0, Number(current.attemptLimit || 2) - attemptsUsed) };
    practice = { completed: Number(training?.completed || 0), inProgress: Boolean(training?.inProgress) };
    if (completion.completed) ranking = await env.DB.prepare(`WITH best AS (SELECT user_id,MAX(score) score,MAX(correct_answers) correctAnswers,MIN(total_time_ms) totalTimeMs FROM attempts WHERE round_id=?1 AND mode='official' AND status='completed' GROUP BY user_id),ranked AS (SELECT user_id,RANK() OVER(ORDER BY score DESC,correctAnswers DESC,totalTimeMs ASC) position FROM best) SELECT position FROM ranked WHERE user_id=?2`).bind(current.id, user.id).first();
  }
  return json({ serverNow: now, current, next, recent, completion, practice, ranking: ranking ? { position: Number((ranking as any).position), provisional: true } : null });
} catch (response) { if (response instanceof Response) return response; throw response; } };
