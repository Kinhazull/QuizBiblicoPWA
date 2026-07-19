import type { AppEnv } from "../../_lib/auth";
import { requirePermission } from "../../_lib/permissions";
import { json, verifyPassword } from "../../_lib/security";
import { enforceRateLimit, requestFingerprint } from "../../_lib/abuse";

async function rows(env: AppEnv, sql: string, ...bindings: unknown[]) {
  const result = await env.DB.prepare(sql).bind(...bindings).all();
  return result.results;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const admin: any = await requirePermission(request,env,"permissions.manage");
    const retry = await enforceRateLimit(env, `backup:${admin.id}:${await requestFingerprint(request)}`, 3, 60 * 60 * 1000);
    if (retry) return json({ error: "too_many_requests", retryAfter: retry }, 429, { "retry-after": String(retry) });
    const body: any = await request.json();
    const credentials: any = await env.DB.prepare("SELECT password_hash,password_salt FROM users WHERE id=?1").bind(admin.id).first();
    if (!credentials || !await verifyPassword(String(body.password || ""), credentials.password_salt, credentials.password_hash)) return json({ error: "invalid_password" }, 403);

    const organizationId = admin.organizationId;
    const data = {
      format: "conte-os-feitos-backup",
      schemaVersion: 25,
      credentialsExcluded: true,
      exportedAt: Date.now(),
      organizationId,
      tables: {
        organizations: await rows(env, "SELECT * FROM organizations WHERE id=?1", organizationId),
        groups: await rows(env, "SELECT * FROM groups WHERE organization_id=?1", organizationId),
        users: await rows(env, "SELECT id,organization_id,group_id,username,display_name,role,status,must_change_password,approved_at,approved_by,last_login_at,created_at,updated_at,nickname,use_nickname_in_ranking,profile_public,bio,favorite_book,favorite_verse FROM users WHERE organization_id=?1", organizationId),
        invitations: await rows(env, "SELECT id,organization_id,group_id,label,approval_required,max_uses,uses,expires_at,active,created_by,created_at FROM invitations WHERE organization_id=?1", organizationId),
        rounds: await rows(env, "SELECT * FROM rounds WHERE organization_id=?1", organizationId),
        questions: await rows(env, "SELECT q.* FROM questions q JOIN rounds r ON r.id=q.round_id WHERE r.organization_id=?1", organizationId),
        choices: await rows(env, "SELECT c.* FROM choices c JOIN questions q ON q.id=c.question_id JOIN rounds r ON r.id=q.round_id WHERE r.organization_id=?1", organizationId),
        attempts: await rows(env, "SELECT a.* FROM attempts a JOIN users u ON u.id=a.user_id WHERE u.organization_id=?1", organizationId),
        attempt_answers: await rows(env, "SELECT aa.* FROM attempt_answers aa JOIN attempts a ON a.id=aa.attempt_id JOIN users u ON u.id=a.user_id WHERE u.organization_id=?1", organizationId),
        audit_logs: await rows(env, "SELECT * FROM audit_logs WHERE organization_id=?1", organizationId),
        user_badges: await rows(env, "SELECT ub.* FROM user_badges ub JOIN users u ON u.id=ub.user_id WHERE u.organization_id=?1", organizationId),
        notification_receipts: await rows(env, "SELECT nr.* FROM notification_receipts nr JOIN users u ON u.id=nr.user_id WHERE u.organization_id=?1", organizationId),
        legal_consents: await rows(env, "SELECT lc.* FROM legal_consents lc JOIN users u ON u.id=lc.user_id WHERE u.organization_id=?1", organizationId),
        announcements: await rows(env, "SELECT * FROM announcements WHERE organization_id=?1", organizationId),
        privacy_requests: await rows(env, "SELECT * FROM privacy_requests WHERE organization_id=?1", organizationId),
        seasons: await rows(env, "SELECT * FROM seasons WHERE organization_id=?1", organizationId),
        question_bank: await rows(env, "SELECT * FROM question_bank WHERE organization_id=?1", organizationId),
        question_bank_choices: await rows(env, "SELECT qbc.* FROM question_bank_choices qbc JOIN question_bank qb ON qb.id=qbc.question_id WHERE qb.organization_id=?1", organizationId),
        user_permissions: await rows(env, "SELECT up.* FROM user_permissions up JOIN users u ON u.id=up.user_id WHERE u.organization_id=?1", organizationId),
        ai_question_suggestions: await rows(env, "SELECT id,organization_id,requested_by,model,request_json,question_json,status,imported_question_id,created_at,reviewed_at,reviewed_by FROM ai_question_suggestions WHERE organization_id=?1", organizationId),
        batch_operations: await rows(env, "SELECT * FROM batch_operations WHERE organization_id=?1", organizationId),
        season_snapshots: await rows(env, "SELECT ss.* FROM season_snapshots ss JOIN seasons s ON s.id=ss.season_id WHERE s.organization_id=?1", organizationId),
        season_awards: await rows(env, "SELECT sa.* FROM season_awards sa JOIN seasons s ON s.id=sa.season_id WHERE s.organization_id=?1", organizationId),
        round_award_processing: await rows(env, "SELECT p.* FROM round_award_processing p JOIN rounds r ON r.id=p.round_id WHERE r.organization_id=?1", organizationId),
        round_badge_reconciliations: await rows(env, "SELECT b.* FROM round_badge_reconciliations b JOIN rounds r ON r.id=b.round_id WHERE r.organization_id=?1", organizationId),
        round_award_participant_processing: await rows(env, "SELECT p.* FROM round_award_participant_processing p JOIN rounds r ON r.id=p.round_id WHERE r.organization_id=?1", organizationId),
        user_platform_progress: await rows(env, "SELECT * FROM user_platform_progress WHERE organization_id=?1", organizationId),
        platform_xp_ledger: await rows(env, "SELECT * FROM platform_xp_ledger WHERE organization_id=?1", organizationId),
        platform_coin_ledger: await rows(env, "SELECT * FROM platform_coin_ledger WHERE organization_id=?1", organizationId),
        platform_achievement_definitions: await rows(env, "SELECT * FROM platform_achievement_definitions"),
        user_platform_achievements: await rows(env, "SELECT * FROM user_platform_achievements WHERE organization_id=?1", organizationId),
      },
    };

    await env.DB.prepare("INSERT INTO audit_logs (id,organization_id,actor_user_id,action,entity_type,details_json,created_at) VALUES (?1,?2,?3,'backup.exported','organization',?4,?5)").bind(crypto.randomUUID(), organizationId, admin.id, JSON.stringify({ schemaVersion: data.schemaVersion }), Date.now()).run();
    const date = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="conte-os-feitos-backup-${date}.json"`,
        "cache-control": "no-store, private",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
