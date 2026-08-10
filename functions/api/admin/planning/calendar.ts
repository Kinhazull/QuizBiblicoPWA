import { requirePermission } from "../../../_lib/permissions";
import type { AppEnv } from "../../../_lib/auth";
import { json } from "../../../_lib/security";
import { getPlatformPlanningCalendar } from "../../../_lib/platform-planning";
import { PublicErrorCategory, publicDomainError } from "../../../_lib/public-error";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requirePermission(request, env, "events.manage");
    const query = new URL(request.url).searchParams;
    const data = await getPlatformPlanningCalendar(env, String(user.organizationId), {
      from: Number(query.get("from")), to: Number(query.get("to")), status: query.get("status"), gameType: query.get("gameType"),
    });
    return json(data, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    return publicDomainError(error, {
      invalid_planning_interval: { category: PublicErrorCategory.VALIDATION_ERROR, status: 400 },
      planning_interval_too_large: { category: PublicErrorCategory.VALIDATION_ERROR, status: 400 },
      invalid_planning_status: { category: PublicErrorCategory.VALIDATION_ERROR, status: 400 },
      invalid_planning_game: { category: PublicErrorCategory.VALIDATION_ERROR, status: 400 },
    }, { component: "admin-planning", operation: "read_calendar" });
  }
};
