import { requireUser, type AppEnv } from "../../_lib/auth";
import { json } from "../../_lib/security";
import { getUserStatistics } from "../../_lib/platform-statistics";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    return json(
      await getUserStatistics(env, user.id, user.organizationId),
      200,
      { "cache-control": "no-store, private" },
    );
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
