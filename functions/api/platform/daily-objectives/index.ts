import { requireUser, type AppEnv } from "../../../_lib/auth";
import { getDailyChallengeState } from "../../../_lib/platform-daily-challenge";
import { json } from "../../../_lib/security";
import { PublicErrorCategory, publicError } from "../../../_lib/operational-observability";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const daily = await getDailyChallengeState(env, {
      organizationId: String(user.organizationId),
      userId: String(user.id),
    });
    return json({ ...daily }, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    return publicError(error, { category: PublicErrorCategory.DEPENDENCY_FAILURE, code: "daily_objectives_unavailable", component: "daily-objectives", operation: "list_objectives", retryable: true });
  }
};
