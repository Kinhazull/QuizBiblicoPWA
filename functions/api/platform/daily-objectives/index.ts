import { requireUser, type AppEnv } from "../../../_lib/auth";
import { listDailyObjectives } from "../../../_lib/platform-daily-objectives";
import { json } from "../../../_lib/security";
import { PublicErrorCategory, publicError } from "../../../_lib/operational-observability";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const objectives = await listDailyObjectives(env, {
      organizationId: String(user.organizationId),
      userId: String(user.id),
    });
    return json({ objectives }, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    return publicError(error, { category: PublicErrorCategory.DEPENDENCY_FAILURE, code: "daily_objectives_unavailable", component: "daily-objectives", operation: "list_objectives", retryable: true });
  }
};
