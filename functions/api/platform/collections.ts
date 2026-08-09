import { requireUser, type AppEnv } from "../../_lib/auth";
import { getPlatformCollectionsView } from "../../_lib/platform-collections";
import { json } from "../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    return json(await getPlatformCollectionsView(env, user.id, user.organizationId), 200, {
      "cache-control": "no-store, private",
    });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
};
