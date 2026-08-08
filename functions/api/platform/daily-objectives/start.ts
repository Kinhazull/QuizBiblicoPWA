import { requireUser, type AppEnv } from "../../../_lib/auth";
import { startDailyObjective } from "../../../_lib/platform-daily-objectives";
import { json } from "../../../_lib/security";
import { PublicErrorCategory, publicDomainError } from "../../../_lib/operational-observability";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const body = await request.json().catch(() => null) as { selectionId?: unknown } | null;
    if (!body || typeof body.selectionId !== "string") {
      return json({ error: "invalid_daily_selection" }, 400);
    }
    const participation = await startDailyObjective(env, {
      organizationId: String(user.organizationId),
      userId: String(user.id),
    }, body.selectionId);
    return json({ participation }, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    return publicDomainError(error, {
      invalid_daily_selection: { category: PublicErrorCategory.VALIDATION_ERROR, status: 400 },
      daily_selection_expired: { category: PublicErrorCategory.CONFLICT, status: 409 },
      daily_participation_finished: { category: PublicErrorCategory.CONFLICT, status: 409 },
    }, { component: "daily-objectives", operation: "start_selection" });
  }
};
