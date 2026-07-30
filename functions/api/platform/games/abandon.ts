import { requireUser, type AppEnv } from "../../../_lib/auth";
import { finishDailyParticipation } from "../../../_lib/platform-daily-objectives";
import { finishFreePlayParticipation } from "../../../_lib/platform-free-play";
import { json } from "../../../_lib/security";
import { GameMode } from "../../../../shared/game-modes";

const SAFE_ID = /^[a-zA-Z0-9._:-]{8,160}$/;

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const selectionId = String(body?.selectionId ?? "");
    const gameType = String(body?.gameType ?? "");
    const mode = String(body?.mode ?? "");
    if (
      !SAFE_ID.test(selectionId)
      || !SAFE_ID.test(gameType)
      || ![GameMode.DAILY, GameMode.FREE_PLAY].includes(mode as any)
    ) {
      return json({ error: "invalid_game_abandonment" }, 400);
    }

    const participation = await env.DB.prepare(`SELECT participation.status
      FROM generated_game_participations participation
      JOIN generated_game_selections selection ON selection.id=participation.selection_id
      WHERE participation.selection_id=?1
        AND participation.organization_id=?2
        AND participation.user_id=?3
        AND participation.game_type=?4
        AND participation.mode=?5
        AND selection.organization_id=participation.organization_id
        AND selection.game_type=participation.game_type
        AND selection.mode=participation.mode
      LIMIT 1`)
      .bind(selectionId, String(user.organizationId), String(user.id), gameType, mode)
      .first<{ status: string }>();
    if (!participation) return json({ error: "game_participation_not_found" }, 404);
    if (participation.status === "FINISHED") {
      return json({ ok: true, outcome: "lost", duplicate: true }, 200, {
        "cache-control": "no-store, private",
      });
    }
    if (participation.status !== "STARTED") {
      return json({ error: "game_participation_not_active" }, 409);
    }

    const eventId = `abandon:${mode.toLowerCase()}:${selectionId}:${String(user.id)}`;
    const identity = {
      organizationId: String(user.organizationId),
      userId: String(user.id),
    };
    if (mode === GameMode.DAILY) {
      await finishDailyParticipation(env, identity, selectionId, eventId);
    } else {
      await finishFreePlayParticipation(env, identity, selectionId, eventId);
    }
    return json({ ok: true, outcome: "lost", duplicate: false }, 200, {
      "cache-control": "no-store, private",
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: "game_abandonment_failed" }, 500, {
      "cache-control": "no-store, private",
    });
  }
};
