import type { AppEnv } from "../../../_lib/auth";
import { requirePermission } from "../../../_lib/permissions";
import { listEventContentOptions, suggestEventContent } from "../../../_lib/platform-events";
import { json } from "../../../_lib/security";
import { PublicErrorCategory, publicDomainError } from "../../../_lib/operational-observability";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requirePermission(request, env, "events.manage");
    const suggestions = await suggestEventContent(env, user.organizationId, await request.json() as Record<string, unknown>);
    return json({ suggestions, requiresApproval: true }, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    return publicDomainError(error, { invalid_event_game: { category: PublicErrorCategory.VALIDATION_ERROR, status: 400 } }, { component: "admin-events", operation: "suggest_content" });
  }
};

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requirePermission(request, env, "events.manage");
    const url = new URL(request.url);
    const result = await listEventContentOptions(env, user.organizationId, Object.fromEntries(url.searchParams));
    return json(result, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    return publicDomainError(error, { invalid_event_game: { category: PublicErrorCategory.VALIDATION_ERROR, status: 400 } }, { component: "admin-events", operation: "list_content_options" });
  }
};
