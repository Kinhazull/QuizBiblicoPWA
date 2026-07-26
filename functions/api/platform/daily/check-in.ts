import { requireUser, type AppEnv } from "../../../_lib/auth";
import { claimDailyLogin } from "../../../_lib/platform-daily-retention";
import { json } from "../../../_lib/security";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const daily = await claimDailyLogin(env, user.id, user.organizationId);
    return json({ daily }, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
};
