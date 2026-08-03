import type { AppEnv } from "../../_lib/auth";
import { requirePermission } from "../../_lib/permissions";
import { createPlatformEvent, listAdminEvents } from "../../_lib/platform-events";
import { json } from "../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try { const user: any = await requirePermission(request, env, "rounds.manage"); return json({ events: await listAdminEvents(env, user.organizationId) }, 200, { "cache-control": "no-store, private" }); }
  catch (error) { if (error instanceof Response) return error; return json({ error: "event_list_failed" }, 500); }
};
export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try { const user: any = await requirePermission(request, env, "rounds.manage"); const event = await createPlatformEvent(env, { organizationId: user.organizationId, userId: user.id }, await request.json()); return json({ event }, 201, { "cache-control": "no-store, private" }); }
  catch (error) { if (error instanceof Response) return error; return json({ error: error instanceof Error ? error.message : "event_create_failed" }, 400); }
};
