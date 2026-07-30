import { requireUser, type AppEnv } from "../../../_lib/auth";
import { startDailyObjective } from "../../../_lib/platform-daily-objectives";
import { json } from "../../../_lib/security";

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
    const code = error instanceof Error ? error.message : "daily_start_failed";
    return json({ error: code }, code.includes("invalid") || code.includes("expired") ? 400 : 500, {
      "cache-control": "no-store, private",
    });
  }
};

