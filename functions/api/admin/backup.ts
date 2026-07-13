import { requireAdmin, type AppEnv } from "../../_lib/auth";
import { json, verifyPassword } from "../../_lib/security";

async function rows(env: AppEnv, sql: string, ...bindings: unknown[]) {
  const result = await env.DB.prepare(sql).bind(...bindings).all();
  return result.results;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const admin: any = await requireAdmin(request, env);
    const body: any = await request.json();
    const credentials: any = await env.DB.prepare("SELECT password_hash,password_salt FROM users WHERE id=?1").bind(admin.id).first();
    if (!credentials || !await verifyPassword(String(body.password || ""), credentials.password_salt, credentials.password_hash)) return json({ error: "invalid_password" }, 403);

    const organizationId = admin.organizationId;
    const data = {
      format: "conte-os-feitos-backup",
      schemaVersion: 6,
      exportedAt: Date.now(),
      organizationId,
      tables: {
        organizations: await rows(env, "SELECT * FROM organizations WHERE id=?1", organizationId),
        groups: await rows(env, "SELECT * FROM groups WHERE organization_id=?1", organizationId),
        users: await rows(env, "SELECT * FROM users WHERE organization_id=?1", organizationId),
        invitations: await rows(env, "SELECT * FROM invitations WHERE organization_id=?1", organizationId),
        rounds: await rows(env, "SELECT * FROM rounds WHERE organization_id=?1", organizationId),
        questions: await rows(env, "SELECT q.* FROM questions q JOIN rounds r ON r.id=q.round_id WHERE r.organization_id=?1", organizationId),
        choices: await rows(env, "SELECT c.* FROM choices c JOIN questions q ON q.id=c.question_id JOIN rounds r ON r.id=q.round_id WHERE r.organization_id=?1", organizationId),
        attempts: await rows(env, "SELECT a.* FROM attempts a JOIN users u ON u.id=a.user_id WHERE u.organization_id=?1", organizationId),
        attempt_answers: await rows(env, "SELECT aa.* FROM attempt_answers aa JOIN attempts a ON a.id=aa.attempt_id JOIN users u ON u.id=a.user_id WHERE u.organization_id=?1", organizationId),
        audit_logs: await rows(env, "SELECT * FROM audit_logs WHERE organization_id=?1", organizationId),
        user_badges: await rows(env, "SELECT ub.* FROM user_badges ub JOIN users u ON u.id=ub.user_id WHERE u.organization_id=?1", organizationId),
        notification_receipts: await rows(env, "SELECT nr.* FROM notification_receipts nr JOIN users u ON u.id=nr.user_id WHERE u.organization_id=?1", organizationId),
        legal_consents: await rows(env, "SELECT lc.* FROM legal_consents lc JOIN users u ON u.id=lc.user_id WHERE u.organization_id=?1", organizationId),
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
