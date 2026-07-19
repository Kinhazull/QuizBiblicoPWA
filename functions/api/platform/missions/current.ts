import { requireUser, type AppEnv } from "../../../_lib/auth";
import { getCurrentDailyMission } from "../../../_lib/platform-missions";
import { json } from "../../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const mission = await getCurrentDailyMission(env, user.id, user.organizationId);
    return json({ mission }, 200, { "cache-control": "no-store, private" });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
