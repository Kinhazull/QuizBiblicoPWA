import type { AppEnv } from "../../../_lib/auth";
import { requirePermission } from "../../../_lib/permissions";
import { suggestEventContent } from "../../../_lib/platform-events";
import { json } from "../../../_lib/security";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requirePermission(request, env, "rounds.manage");
    const suggestions = await suggestEventContent(env, user.organizationId, await request.json() as Record<string, unknown>);
    return json({ suggestions, requiresApproval: true }, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : "event_suggestion_failed" }, 400);
  }
};
