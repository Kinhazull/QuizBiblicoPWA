import type { AppEnv } from "../../../_lib/auth";
import { requirePermission } from "../../../_lib/permissions";
import { getAdminEvent, updatePlatformEvent } from "../../../_lib/platform-events";
import { json } from "../../../_lib/security";
type Context = { request: Request; env: AppEnv; params: { id: string } };
export const onRequestGet = async ({ request, env, params }: Context) => { try { const user: any = await requirePermission(request, env, "rounds.manage"); const event = await getAdminEvent(env, user.organizationId, params.id); return event ? json({ event }, 200, { "cache-control": "no-store, private" }) : json({ error: "event_not_found" }, 404); } catch (error) { if (error instanceof Response) return error; return json({ error: "event_read_failed" }, 500); } };
export const onRequestPatch = async ({ request, env, params }: Context) => { try { const user: any = await requirePermission(request, env, "rounds.manage"); const event = await updatePlatformEvent(env, { organizationId: user.organizationId, userId: user.id }, params.id, await request.json()); return json({ event }, 200, { "cache-control": "no-store, private" }); } catch (error) { if (error instanceof Response) return error; const code=error instanceof Error?error.message:"event_update_failed"; return json({ error: code }, code==="event_not_found"?404:code==="event_locked"?409:400); } };
