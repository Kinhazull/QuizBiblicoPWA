import { GameType, validateContent, type WordleContentPayload } from "../../../../shared/content";
import { requireUser, type AppEnv } from "../../../_lib/auth";
import { json } from "../../../_lib/security";
import { findPublishedUniversalContent } from "../../../_lib/universal-content-store";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const content = await findPublishedUniversalContent(
      env,
      String(user.organizationId),
      GameType.WORDLE,
    );
    if (!content) {
      return json({ error: "wordle_content_unavailable" }, 404, {
        "cache-control": "no-store, private",
      });
    }
    const validation = validateContent(content.gameType, {
      id: content.id,
      gameType: content.gameType,
      category: content.category,
      tags: content.tags,
      difficulty: content.difficulty,
      biblicalReference: content.biblicalReference,
      status: content.status,
      authorId: content.authorId,
      reviewerId: content.reviewerId,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      version: content.version,
      internalNotes: content.internalNotes,
    }, content.payload);
    if (!validation.valid) {
      console.error("published_wordle_content_invalid", { contentId: content.id });
      return json({ error: "wordle_content_unavailable" }, 503, {
        "cache-control": "no-store, private",
      });
    }
    const payload = content.payload as WordleContentPayload;
    return json({
      content: {
        id: content.id,
        version: content.version,
        word: payload.word,
        hint: payload.hint,
        biblicalReference: content.biblicalReference,
      },
    }, 200, { "cache-control": "no-store, private" });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
