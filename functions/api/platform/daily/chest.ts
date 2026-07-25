import { requireUser, type AppEnv } from "../../../_lib/auth";
import { openDailyChest } from "../../../_lib/platform-daily-retention";
import { json } from "../../../_lib/security";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const daily = await openDailyChest(env, user.id, user.organizationId);
    return json({ daily }, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    const code = error instanceof Error ? error.message : "daily_chest_failed";
    if (code === "daily_chest_locked") return json({ error: code }, 409);
    throw error;
  }
};
