import { requireUser, type AppEnv } from "../../../_lib/auth";
import { adaptPlatformGameCompletion, type PlatformGameCompletion } from "../../../_lib/game-integrations/platform-game-completion";
import { publishOfficialCoreEvent } from "../../../_lib/platform-event-runtime";
import { json } from "../../../_lib/security";

const SAFE_ERROR = /^[a-z0-9_]{1,100}$/;

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const body = await request.json().catch(() => null) as PlatformGameCompletion | null;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "invalid_game_completion" }, 400);
    }
    const event = adaptPlatformGameCompletion(body, {
      userId: user.id,
      organizationId: user.organizationId,
      completedAt: Date.now(),
    });
    const result = await publishOfficialCoreEvent(env, event, event.occurredAt);
    return json({
      ok: true,
      eventId: event.eventId,
      outcome: event.payload.correctAnswers > 0 ? "won" : "lost",
      score: event.payload.score,
      processing: result.status,
      duplicate: result.duplicate,
    }, result.status === "completed" ? 200 : 202, {
      "cache-control": "no-store, private",
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const code = error instanceof Error && SAFE_ERROR.test(error.message)
      ? error.message
      : "game_completion_failed";
    const status = code.startsWith("invalid_") || code.startsWith("incomplete_") || code.startsWith("unsupported_")
      ? 400
      : 500;
    return json({ error: code }, status, { "cache-control": "no-store, private" });
  }
};
