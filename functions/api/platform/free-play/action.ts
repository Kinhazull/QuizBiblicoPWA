import { requireUser, type AppEnv } from "../../../_lib/auth";
import { validateFreePlayAction } from "../../../_lib/platform-free-play";
import { json } from "../../../_lib/security";

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (
      !body
      || typeof body.selectionId !== "string"
      || typeof body.gameType !== "string"
      || typeof body.action !== "string"
      || !body.input
      || typeof body.input !== "object"
      || Array.isArray(body.input)
    ) return json({ error: "invalid_free_play_action" }, 400);
    const result = await validateFreePlayAction(env, {
      organizationId: String(user.organizationId),
      userId: String(user.id),
    }, {
      selectionId: body.selectionId,
      gameType: body.gameType,
      action: body.action,
      payload: body.input as Record<string, unknown>,
    });
    return json(result, 200, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    const code = error instanceof Error ? error.message : "free_play_action_failed";
    return json({ error: code }, code.startsWith("invalid_") || code.startsWith("unsupported_") ? 400 : 500);
  }
};
