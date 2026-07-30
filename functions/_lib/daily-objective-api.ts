import { requireUser, type AppEnv } from "./auth";
import { getDailyObjective } from "./platform-daily-objectives";
import { json } from "./security";

export function dailyObjectiveGet(gameType: string, logCode: string) {
  return async ({ request, env }: { request: Request; env: AppEnv }) => {
    try {
      const user: any = await requireUser(request, env);
      const objective = await getDailyObjective(env, {
        organizationId: String(user.organizationId),
        userId: String(user.id),
      }, gameType);
      return json({ objective }, 200, { "cache-control": "no-store, private" });
    } catch (error) {
      if (error instanceof Response) return error;
      console.error(logCode, {
        code: error instanceof Error ? error.message : "unknown_error",
      });
      return json({ error: "daily_objective_unavailable" }, 503, {
        "cache-control": "no-store, private",
      });
    }
  };
}

