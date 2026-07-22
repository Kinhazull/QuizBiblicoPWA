import { requireUser, type AppEnv } from "../../../../_lib/auth";
import { claimMissionReward } from "../../../../_lib/platform-missions";
import { json } from "../../../../_lib/security";

export const onRequestPost = async ({ request, env, params }: {
  request: Request;
  env: AppEnv;
  params: { id: string };
}) => {
  try {
    const user: any = await requireUser(request, env);
    const mission = await claimMissionReward(env, String(params.id || ""), user.id, user.organizationId);
    return json({ mission }, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    const code = error instanceof Error ? error.message : "mission_claim_failed";
    if (code === "mission_not_found") return json({ error: code }, 404);
    if (code === "mission_not_claimable") return json({ error: code }, 409);
    if (code === "invalid_mission_assignment") return json({ error: code }, 400);
    throw error;
  }
};
