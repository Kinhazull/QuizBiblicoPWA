import { requireUser, type AppEnv } from "./auth";
import { getDailyObjective } from "./platform-daily-objectives";
import { json } from "./security";
import { PublicErrorCategory, publicError } from "./operational-observability";

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
      return publicError(error, { category: PublicErrorCategory.DEPENDENCY_FAILURE, code: "daily_objective_unavailable", component: "daily-objectives", operation: logCode, retryable: true });
    }
  };
}
