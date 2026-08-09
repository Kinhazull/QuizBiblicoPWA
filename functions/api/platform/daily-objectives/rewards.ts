import { requireUser, type AppEnv } from "../../../_lib/auth";
import { claimDailyChallengeReward } from "../../../_lib/platform-daily-challenge";
import { json } from "../../../_lib/security";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const body = await request.json().catch(() => null) as { target?: unknown } | null;
    const target = Number(body?.target);
    if (target !== 3 && target !== 7) return json({ error: "invalid_daily_reward_target" }, 400);
    const result = await claimDailyChallengeReward(env, {
      organizationId: String(user.organizationId), userId: String(user.id),
    }, target);
    return json(result, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    const code = error instanceof Error ? error.message : "daily_reward_failed";
    const status = code === "daily_reward_locked" ? 409 : code === "invalid_daily_reward_target" ? 400 : 500;
    return json({ error: code }, status, { "cache-control": "no-store, private" });
  }
};
