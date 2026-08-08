import type { AppEnv } from "./auth";
import { sha256 } from "./security";

export const ACCOUNT_ANONYMIZATION_CONFIRMATION = "ANONIMIZAR_CONTA";

export async function anonymizeUserAccount(env: AppEnv, input: {
  userId: string;
  organizationId: string;
  resolvedBy: string;
  requestId: string;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const current: any = await env.DB.prepare(`SELECT id,role,status,username FROM users
    WHERE id=?1 AND organization_id=?2`).bind(input.userId, input.organizationId).first();
  if (!current || current.role === "admin") throw new Error("privacy_subject_unavailable");
  if (current.status === "rejected" && String(current.username).startsWith("removed_")) {
    await env.DB.prepare(`UPDATE privacy_requests SET status='completed',resolved_at=COALESCE(resolved_at,?1),
      resolved_by=COALESCE(resolved_by,?2) WHERE id=?3 AND user_id=?4 AND organization_id=?5`)
      .bind(now, input.resolvedBy, input.requestId, input.userId, input.organizationId).run();
    return { alreadyAnonymized: true };
  }
  const pseudonym = (await sha256(`privacy:${input.organizationId}:${input.userId}`)).slice(0, 24);
  const anonymousUsername = `removed_${pseudonym}`;
  const statements = [
    env.DB.prepare(`UPDATE users SET display_name='Participante removido',username=?1,nickname=NULL,bio=NULL,
      favorite_book=NULL,favorite_verse=NULL,use_nickname_in_ranking=0,profile_public=0,status='rejected',
      password_hash='removed',password_salt='removed',must_change_password=1,last_login_at=NULL,updated_at=?2
      WHERE id=?3 AND organization_id=?4 AND role<>'admin'`).bind(anonymousUsername, now, input.userId, input.organizationId),
    env.DB.prepare("DELETE FROM sessions WHERE user_id=?1").bind(input.userId),
    env.DB.prepare("DELETE FROM account_recovery_codes WHERE user_id=?1").bind(input.userId),
    env.DB.prepare("DELETE FROM user_permissions WHERE user_id=?1").bind(input.userId),
    env.DB.prepare("DELETE FROM notification_receipts WHERE user_id=?1").bind(input.userId),
    env.DB.prepare(`UPDATE privacy_requests SET status='completed',resolved_at=?1,resolved_by=?2
      WHERE id=?3 AND user_id=?4 AND organization_id=?5 AND status='pending'`)
      .bind(now, input.resolvedBy, input.requestId, input.userId, input.organizationId),
    env.DB.prepare(`INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at)
      VALUES(?1,?2,?3,'privacy.anonymization_completed','privacy_request',?4,?5,?6)`)
      .bind(crypto.randomUUID(), input.organizationId, input.resolvedBy, input.requestId,
        JSON.stringify({ policyVersion: 1, subjectPseudonym: pseudonym }), now),
  ];
  const results = await env.DB.batch(statements);
  if (Number((results[0] as any)?.meta?.changes || 0) !== 1 || Number((results[5] as any)?.meta?.changes || 0) !== 1) {
    throw new Error("privacy_anonymization_conflict");
  }
  const fk = await env.DB.prepare("PRAGMA foreign_key_check").all();
  if (fk.results.length) throw new Error("privacy_anonymization_fk_failed");
  return { alreadyAnonymized: false };
}
