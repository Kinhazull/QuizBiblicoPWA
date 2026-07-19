import { requireUser, type AppEnv } from "../../_lib/auth";
import { listAchievements } from "../../_lib/platform-achievements";
import { json } from "../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const achievements = await listAchievements(env, user.id, user.organizationId);
    const unlocked = achievements.filter(item => item.unlocked).length;
    const summary = { total: achievements.length, unlocked, pending: achievements.length - unlocked };
    return json({ achievements, summary }, 200, { "cache-control": "no-store, private" });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
