import { requireUser, type AppEnv } from "../_lib/auth";
import { json } from "../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env); const url = new URL(request.url); const type = url.searchParams.get("type") || "weekly"; const now = Date.now();
    let query = ""; let bindings: any[] = [user.organizationId];
    if (type === "weekly") {
      const roundId = url.searchParams.get("roundId") || (await env.DB.prepare(`SELECT id FROM rounds WHERE organization_id=?1 AND opens_at<=?2 ORDER BY opens_at DESC LIMIT 1`).bind(user.organizationId, now).first<any>())?.id;
      if (!roundId) return json({ ranking: [] }); bindings.push(roundId);
      query = `SELECT u.id,CASE WHEN u.use_nickname_in_ranking=1 AND u.nickname IS NOT NULL THEN u.nickname ELSE u.display_name END AS displayName,MAX(a.score) AS score,MAX(a.correct_answers) AS correctAnswers,MIN(a.total_time_ms) AS totalTimeMs FROM users u JOIN attempts a ON a.user_id=u.id WHERE u.organization_id=?1 AND a.round_id=?2 AND a.mode='official' AND a.status='completed' GROUP BY u.id ORDER BY score DESC,correctAnswers DESC,totalTimeMs ASC LIMIT 100`;
    } else if (type === "average") {
      query = `WITH best AS (SELECT user_id,round_id,MAX(score) score FROM attempts WHERE mode='official' AND status='completed' GROUP BY user_id,round_id) SELECT u.id,CASE WHEN u.use_nickname_in_ranking=1 AND u.nickname IS NOT NULL THEN u.nickname ELSE u.display_name END AS displayName,ROUND(AVG(best.score)) AS score,COUNT(*) AS roundsPlayed FROM users u JOIN best ON best.user_id=u.id WHERE u.organization_id=?1 GROUP BY u.id HAVING COUNT(*)>=3 ORDER BY score DESC LIMIT 100`;
    } else {
      query = `WITH best AS (SELECT user_id,round_id,MAX(score) score FROM attempts WHERE mode='official' AND status='completed' GROUP BY user_id,round_id) SELECT u.id,CASE WHEN u.use_nickname_in_ranking=1 AND u.nickname IS NOT NULL THEN u.nickname ELSE u.display_name END AS displayName,SUM(best.score) AS score,COUNT(*) AS roundsPlayed FROM users u JOIN best ON best.user_id=u.id WHERE u.organization_id=?1 GROUP BY u.id ORDER BY score DESC LIMIT 100`;
    }
    const { results } = await env.DB.prepare(query).bind(...bindings).all(); return json({ ranking: results });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
