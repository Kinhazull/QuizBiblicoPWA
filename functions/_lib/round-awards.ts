import type { AppEnv } from "./auth";
import { flushBadgeSync, syncBadges } from "./badges";

export const PARTICIPANTS_PER_RUN = 7;
export const AWARD_CRON_INTERVAL_MINUTES = 1;

async function pendingParticipants(env: AppEnv, roundId: string, jobType: "close" | "cancel", limit: number) {
  return env.DB.prepare(`SELECT DISTINCT a.user_id userId
    FROM attempts a
    LEFT JOIN round_award_participant_processing p
      ON p.round_id=a.round_id AND p.user_id=a.user_id AND p.job_type=?2
   WHERE a.round_id=?1 AND p.user_id IS NULL
     AND (?2='cancel' OR (a.mode='official' AND a.status='completed'))
   ORDER BY a.user_id LIMIT ?3`).bind(roundId, jobType, limit).all();
}

async function processParticipantBatch(env: AppEnv, roundId: string, jobType: "close" | "cancel", now: number, limit = PARTICIPANTS_PER_RUN) {
  const pending: any = await pendingParticipants(env, roundId, jobType, limit);
  for (const row of pending.results as any[]) {
    await syncBadges(env, row.userId);
    await env.DB.prepare(`INSERT OR IGNORE INTO round_award_participant_processing
      (round_id,user_id,job_type,processed_at) VALUES(?1,?2,?3,?4)`)
      .bind(roundId, row.userId, jobType, now).run();
  }
  const remaining: any = await env.DB.prepare(`SELECT COUNT(DISTINCT a.user_id) total
    FROM attempts a
    LEFT JOIN round_award_participant_processing p
      ON p.round_id=a.round_id AND p.user_id=a.user_id AND p.job_type=?2
   WHERE a.round_id=?1 AND p.user_id IS NULL
     AND (?2='cancel' OR (a.mode='official' AND a.status='completed'))`)
    .bind(roundId, jobType).first();
  const remainingParticipants = Number(remaining?.total || 0);
  return { processed: pending.results.length, complete: remainingParticipants === 0, remainingParticipants };
}

export async function processClosedRoundAwards(env: AppEnv, now = Date.now(), roundLimit = 4, participantLimit = PARTICIPANTS_PER_RUN) {
  let budget = Math.max(1, Math.min(PARTICIPANTS_PER_RUN, participantLimit));
  const queued: any = await env.DB.prepare(`SELECT requested.entity_id userId,MIN(requested.created_at) requestedAt
    FROM audit_logs requested WHERE requested.action='badge.sync_requested' AND NOT EXISTS(
      SELECT 1 FROM audit_logs completed WHERE completed.action='badge.sync_completed'
      AND completed.entity_id=requested.entity_id AND completed.created_at>=requested.created_at)
    GROUP BY requested.entity_id ORDER BY requestedAt,userId LIMIT ?1`).bind(budget).all();
  let queuedParticipants = 0;
  for (const row of queued.results as any[]) {
    if (await flushBadgeSync(env,row.userId)) queuedParticipants += 1;
    budget -= 1;
    if (!budget) break;
  }
  const due: any = await env.DB.prepare(`SELECT r.id,r.organization_id organizationId
    FROM rounds r LEFT JOIN round_award_processing p ON p.round_id=r.id
   WHERE p.round_id IS NULL AND r.status<>'cancelled' AND r.status<>'draft' AND r.closes_at<=?1
   ORDER BY r.closes_at,r.id LIMIT ?2`).bind(now, roundLimit).all();
  let rounds = 0, participants = 0, pendingRounds = 0, remainingParticipants = 0;
  for (const round of due.results as any[]) {
    if (!budget) { pendingRounds += 1; continue; }
    const batch = await processParticipantBatch(env, round.id, "close", now, budget);
    participants += batch.processed;
    budget -= batch.processed;
    remainingParticipants += batch.remainingParticipants;
    if (!batch.complete) { pendingRounds += 1; continue; }
    const count: any = await env.DB.prepare("SELECT COUNT(*) total FROM round_award_participant_processing WHERE round_id=?1 AND job_type='close'").bind(round.id).first();
    const participantCount = Number(count?.total || 0);
    const marker = env.DB.prepare("INSERT OR IGNORE INTO round_award_processing(round_id,processed_at,participant_count) VALUES(?1,?2,?3)").bind(round.id, now, participantCount);
    const close = env.DB.prepare("UPDATE rounds SET status='closed',updated_at=?1 WHERE id=?2 AND status IN ('scheduled','active') AND closes_at<=?1").bind(now, round.id);
    const audit = env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) SELECT ?1,?2,NULL,'round.awards_processed','round',?3,?4,?5 WHERE NOT EXISTS(SELECT 1 FROM audit_logs WHERE action='round.awards_processed' AND entity_id=?3)").bind(crypto.randomUUID(), round.organizationId, round.id, JSON.stringify({ participants: participantCount }), now);
    await env.DB.batch([marker, close, audit]);
    rounds += 1;
  }
  const cancelled: any = await env.DB.prepare(`SELECT r.id FROM rounds r LEFT JOIN round_badge_reconciliations b ON b.round_id=r.id
    WHERE r.status='cancelled' AND b.round_id IS NULL ORDER BY r.updated_at LIMIT ?1`).bind(roundLimit).all();
  let reconciledCancelled = 0, pendingCancelled = 0;
  for (const round of cancelled.results as any[]) {
    if (!budget) { pendingCancelled += 1; continue; }
    const batch = await processParticipantBatch(env, round.id, "cancel", now, budget);
    participants += batch.processed;
    budget -= batch.processed;
    remainingParticipants += batch.remainingParticipants;
    if (!batch.complete) { pendingCancelled += 1; continue; }
    await env.DB.prepare("INSERT OR IGNORE INTO round_badge_reconciliations(round_id,reconciled_at) VALUES(?1,?2)").bind(round.id, now).run();
    reconciledCancelled += 1;
  }
  return {
    rounds,
    participants,
    queuedParticipants,
    reconciledCancelled,
    pendingRounds,
    pendingCancelled,
    ...(remainingParticipants > 0 ? {
      remainingParticipants,
      estimatedMinutes: Math.ceil(remainingParticipants / PARTICIPANTS_PER_RUN) * AWARD_CRON_INTERVAL_MINUTES,
    } : {}),
  };
}
