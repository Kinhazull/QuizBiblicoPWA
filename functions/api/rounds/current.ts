import { requireUser, type AppEnv } from "../../_lib/auth";
import { json } from "../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try { const user: any = await requireUser(request, env); const now = Date.now(); const round: any = await env.DB.prepare(`SELECT * FROM rounds WHERE organization_id=?1 AND status IN ('scheduled','active') AND opens_at<=?2 AND closes_at>?2 ORDER BY opens_at DESC LIMIT 1`).bind(user.organizationId, now).first(); if (!round) return json({ round: null }); const attempts: any = await env.DB.prepare(`SELECT COUNT(*) AS used, MAX(score) AS best FROM attempts WHERE user_id=?1 AND round_id=?2 AND mode='official' AND status='completed'`).bind(user.id, round.id).first(); return json({ round: { id: round.id, title: round.title, theme: round.theme, description: round.description, closesAt: round.closes_at, attemptLimit: round.official_attempt_limit, attemptsUsed: attempts?.used || 0, bestScore: attempts?.best || 0 } }); }
  catch (response) { if (response instanceof Response) return response; throw response; }
};
