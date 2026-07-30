import { requireUser, type AppEnv } from "../../../_lib/auth";
import { listDailyObjectives } from "../../../_lib/platform-daily-objectives";
import { json } from "../../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const objectives = await listDailyObjectives(env, {
      organizationId: String(user.organizationId),
      userId: String(user.id),
    });
    return json({ objectives }, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("daily_objectives_failed", {
      code: error instanceof Error ? error.message : "unknown_error",
    });
    return json({ error: "daily_objectives_unavailable" }, 503, {
      "cache-control": "no-store, private",
    });
  }
};
