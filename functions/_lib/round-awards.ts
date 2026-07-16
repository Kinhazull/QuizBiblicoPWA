import type { AppEnv } from "./auth";
import { syncBadges } from "./badges";

export async function processClosedRoundAwards(env: AppEnv, now = Date.now(), limit = 20) {
  const due: any = await env.DB.prepare(`SELECT r.id,r.organization_id organizationId
    FROM rounds r LEFT JOIN round_award_processing p ON p.round_id=r.id
   WHERE p.round_id IS NULL AND r.status<>'cancelled' AND r.status<>'draft' AND r.closes_at<=?1
   ORDER BY r.closes_at,r.id LIMIT ?2`).bind(now, limit).all();
  let rounds = 0, participants = 0;
  for (const round of due.results as any[]) {
    const users: any = await env.DB.prepare("SELECT DISTINCT user_id FROM attempts WHERE round_id=?1 AND mode='official' AND status='completed'").bind(round.id).all();
    for (const row of users.results as any[]) await syncBadges(env, row.user_id);
    const marker = env.DB.prepare("INSERT OR IGNORE INTO round_award_processing(round_id,processed_at,participant_count) VALUES(?1,?2,?3)").bind(round.id, now, users.results.length);
    const close = env.DB.prepare("UPDATE rounds SET status='closed',updated_at=?1 WHERE id=?2 AND status IN ('scheduled','active') AND closes_at<=?1").bind(now, round.id);
    const audit = env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) SELECT ?1,?2,NULL,'round.awards_processed','round',?3,?4,?5 WHERE NOT EXISTS(SELECT 1 FROM audit_logs WHERE action='round.awards_processed' AND entity_id=?3)").bind(crypto.randomUUID(), round.organizationId, round.id, JSON.stringify({ participants: users.results.length }), now);
    await env.DB.batch([marker, close, audit]);
    rounds += 1; participants += users.results.length;
  }
  return { rounds, participants };
}
