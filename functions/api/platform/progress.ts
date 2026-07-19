import { requireUser, type AppEnv } from "../../_lib/auth";
import { getUserProgress } from "../../_lib/platform-progress";
import { json } from "../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const progress = await getUserProgress(env, user.id, user.organizationId);
    return json({ progress }, 200, { "cache-control": "no-store, private" });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
