import { requireUser, type AppEnv } from "../../../_lib/auth";
import { getFreePlaySelection } from "../../../_lib/platform-free-play";
import { json } from "../../../_lib/security";
import { PublicErrorCategory, publicDomainError } from "../../../_lib/operational-observability";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const selectionId = new URL(request.url).searchParams.get("selectionId") ?? "";
    if (!selectionId) return json({ error: "invalid_free_play_selection" }, 400);
    const game = await getFreePlaySelection(env, {
      organizationId: String(user.organizationId),
      userId: String(user.id),
    }, selectionId);
    return json({ game }, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    return publicDomainError(error, {
      invalid_free_play_selection: { category: PublicErrorCategory.NOT_FOUND, status: 404 },
    }, { component: "free-play", operation: "read_selection" });
  }
};
