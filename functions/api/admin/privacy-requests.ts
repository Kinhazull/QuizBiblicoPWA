import { requirePermission } from "../../_lib/permissions";
import type { AppEnv } from "../../_lib/auth";
import { json, verifyPassword } from "../../_lib/security";
import { ACCOUNT_ANONYMIZATION_CONFIRMATION, anonymizeUserAccount } from "../../_lib/privacy-lifecycle";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const admin: any = await requirePermission(request, env, "members.manage");
    const rows = await env.DB.prepare(`SELECT pr.id,pr.request_type requestType,pr.status,pr.requested_at requestedAt,
      u.display_name displayName,u.username FROM privacy_requests pr JOIN users u ON u.id=pr.user_id
      WHERE pr.organization_id=?1 ORDER BY CASE pr.status WHEN 'pending' THEN 0 ELSE 1 END,pr.requested_at DESC`)
      .bind(admin.organizationId).all();
    return json({ requests: rows.results }, 200, { "cache-control": "no-store, private" });
  } catch (response) {
    if (response instanceof Response) return response;
    const supportId = crypto.randomUUID();
    console.error("admin_privacy_requests_failed", { supportId });
    return json({ error: "unexpected_error", supportId }, 500, { "cache-control": "no-store, private" });
  }
};

export const onRequestPatch = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const admin: any = await requirePermission(request, env, "members.manage");
    const body: any = await request.json();
    const id = String(body.id || ""), action = String(body.action || "");
    if (!["approve", "reject"].includes(action)) return json({ error: "invalid_action" }, 400);
    if (action === "approve" && body.confirmation !== ACCOUNT_ANONYMIZATION_CONFIRMATION) {
      return json({ error: "confirmation_required" }, 400);
    }
    const credential: any = await env.DB.prepare("SELECT password_hash,password_salt FROM users WHERE id=?1")
      .bind(admin.id).first();
    if (!credential || !await verifyPassword(String(body.password || ""), credential.password_salt, credential.password_hash)) {
      return json({ error: "invalid_password" }, 403);
    }
    const item: any = await env.DB.prepare(`SELECT * FROM privacy_requests
      WHERE id=?1 AND organization_id=?2 AND status='pending'`).bind(id, admin.organizationId).first();
    if (!item) return json({ error: "not_found" }, 404);
    const now = Date.now();
    if (action === "approve") {
      await anonymizeUserAccount(env, {
        userId: String(item.user_id), organizationId: admin.organizationId,
        resolvedBy: admin.id, requestId: id, now,
      });
    } else {
      await env.DB.batch([
        env.DB.prepare("UPDATE privacy_requests SET status='rejected',resolved_at=?1,resolved_by=?2 WHERE id=?3 AND status='pending'")
          .bind(now, admin.id, id),
        env.DB.prepare(`INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at)
          VALUES(?1,?2,?3,'privacy.reject','privacy_request',?4,'{}',?5)`)
          .bind(crypto.randomUUID(), admin.organizationId, admin.id, id, now),
      ]);
    }
    return json({ ok: true }, 200, { "cache-control": "no-store, private" });
  } catch (response) {
    if (response instanceof Response) return response;
    const supportId = crypto.randomUUID();
    console.error("admin_privacy_request_resolution_failed", { supportId });
    return json({ error: "unexpected_error", supportId }, 500, { "cache-control": "no-store, private" });
  }
};
