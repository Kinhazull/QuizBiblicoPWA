import { requireUser, type AppEnv } from "../../../_lib/auth";
import { generateFreePlaySelection } from "../../../_lib/platform-free-play";
import { json } from "../../../_lib/security";

const CLIENT_ERRORS = new Set([
  "unsupported_game",
  "unsupported_filter",
  "invalid_quantity",
  "invalid_idempotency_key",
  "mode_disabled",
  "insufficient_eligible_content",
  "selection_key_conflict",
]);

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  let requestedGameType = "";
  try {
    const user: any = await requireUser(request, env);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "invalid_generation_request" }, 400);
    }
    requestedGameType = String((body as Record<string, unknown>).gameType ?? "");
    const game = await generateFreePlaySelection(env, {
      organizationId: String(user.organizationId),
      userId: String(user.id),
    }, body as Record<string, unknown>);
    return json({ game }, 201, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    const code = error instanceof Error ? error.message : "generation_failed";
    if (
      code === "insufficient_eligible_content"
      && requestedGameType === "quiz-biblico"
      && env.QUIZ_LEGACY_FALLBACK_ENABLED !== "false"
    ) {
      return json({
        game: { gameType: requestedGameType, mode: "LEGACY_READ_ONLY", playHref: "/jogar?legacy=1" },
      }, 200, { "cache-control": "no-store, private" });
    }
    return json({ error: CLIENT_ERRORS.has(code) ? code : "generation_failed" }, CLIENT_ERRORS.has(code) ? 400 : 500, {
      "cache-control": "no-store, private",
    });
  }
};
