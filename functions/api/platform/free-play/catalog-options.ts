import { requireUser, type AppEnv } from "../../../_lib/auth";
import { freePlayCatalogOptions } from "../../../_lib/platform-free-play";
import { json } from "../../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const gameType = new URL(request.url).searchParams.get("gameType") ?? "";
    const options = await freePlayCatalogOptions(env, {
      organizationId: String(user.organizationId),
      userId: String(user.id),
    }, gameType);
    return json({ options }, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    const code = error instanceof Error ? error.message : "free_play_options_unavailable";
    return json({ error: code }, code === "unsupported_game" ? 400 : 500);
  }
};
