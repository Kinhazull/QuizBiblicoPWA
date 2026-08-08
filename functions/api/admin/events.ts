import type { AppEnv } from "../../_lib/auth";
import { requirePermission } from "../../_lib/permissions";
import { createPlatformEvent, listAdminEvents } from "../../_lib/platform-events";
import { json } from "../../_lib/security";
import { PublicErrorCategory, publicDomainError, publicError } from "../../_lib/operational-observability";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try { const user: any = await requirePermission(request, env, "events.manage"); return json({ events: await listAdminEvents(env, user.organizationId) }, 200, { "cache-control": "no-store, private" }); }
  catch (error) { return publicError(error, { category: PublicErrorCategory.INTERNAL_ERROR, code: "event_list_failed", component: "admin-events", operation: "list_events" }); }
};
export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try { const user: any = await requirePermission(request, env, "events.manage"); const event = await createPlatformEvent(env, { organizationId: user.organizationId, userId: user.id }, await request.json()); return json({ event }, 201, { "cache-control": "no-store, private" }); }
  catch (error) { return publicDomainError(error, { invalid_event: { category: PublicErrorCategory.VALIDATION_ERROR, status: 400 }, invalid_event_games: { category: PublicErrorCategory.VALIDATION_ERROR, status: 400 }, invalid_event_content: { category: PublicErrorCategory.VALIDATION_ERROR, status: 400 }, invalid_event_content_count: { category: PublicErrorCategory.VALIDATION_ERROR, status: 400 } }, { component: "admin-events", operation: "create_event" }); }
};
