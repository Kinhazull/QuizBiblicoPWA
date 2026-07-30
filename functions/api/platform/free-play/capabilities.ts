import { requireUser, type AppEnv } from "../../../_lib/auth";
import { publicFreePlayCapabilities } from "../../../_lib/platform-free-play";
import { json } from "../../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    await requireUser(request, env);
    return json({ games: publicFreePlayCapabilities() }, 200, {
      "cache-control": "no-store, private",
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: "free_play_capabilities_unavailable" }, 500);
  }
};
