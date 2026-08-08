import { requireUser, type AppEnv } from "../../_lib/auth";
import { json, verifyPassword } from "../../_lib/security";
import { exportUserData } from "../../_lib/privacy-data";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    return json(await exportUserData(env, user), 200, { "cache-control": "no-store, private" });
  } catch (response) {
    if (response instanceof Response) return response;
    const supportId = crypto.randomUUID();
    console.error("privacy_export_failed", { supportId });
    return json({ error: "unexpected_error", supportId }, 500, { "cache-control": "no-store, private" });
  }
};

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env), body: any = await request.json();
    if (user.role === "admin") return json({ error: "admin_cannot_request" }, 400);
    const stored: any = await env.DB.prepare("SELECT password_hash,password_salt FROM users WHERE id=?1").bind(user.id).first();
    if (!stored || !await verifyPassword(String(body.password || ""), stored.password_salt, stored.password_hash)) return json({ error: "invalid_password" }, 403);
    const exists = await env.DB.prepare("SELECT id FROM privacy_requests WHERE user_id=?1 AND request_type='deletion' AND status='pending'").bind(user.id).first();
    if (exists) return json({ error: "already_requested" }, 409);
    const id = crypto.randomUUID(), now = Date.now();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO privacy_requests(id,user_id,organization_id,request_type,status,requested_at) VALUES(?1,?2,?3,'deletion','pending',?4)").bind(id, user.id, user.organizationId, now),
      env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES(?1,?2,?3,'privacy.deletion_requested','privacy_request',?4,'{}',?5)").bind(crypto.randomUUID(), user.organizationId, user.id, id, now),
    ]);
    return json({ ok: true, id }, 201);
  } catch (response) {
    if (response instanceof Response) return response;
    const supportId = crypto.randomUUID();
    console.error("privacy_request_failed", { supportId });
    return json({ error: "unexpected_error", supportId }, 500, { "cache-control": "no-store, private" });
  }
};
