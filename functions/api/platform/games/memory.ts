import { GameType, validateContent, type MemoryContentPayload } from "../../../../shared/content";
import { createMemoryDeck } from "../../../../app/games/memory/engine";
import { requireUser, type AppEnv } from "../../../_lib/auth";
import { memorySetFromContent } from "../../../_lib/game-integrations/memory-content";
import { json } from "../../../_lib/security";
import { findPublishedUniversalContent } from "../../../_lib/universal-content-store";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const content = await findPublishedUniversalContent(
      env,
      String(user.organizationId),
      GameType.MEMORY,
    );
    if (!content) {
      return json({ error: "memory_content_unavailable" }, 404, {
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
      console.error("published_memory_content_invalid", { contentId: content.id });
      return json({ error: "memory_content_unavailable" }, 503, {
        "cache-control": "no-store, private",
      });
    }
    const set = await memorySetFromContent(content.id, content.payload as MemoryContentPayload);
    return json({
      content: {
        id: content.id,
        version: content.version,
        title: set.title,
        cards: createMemoryDeck(set).map(card => ({
          cardId: card.cardId,
          pairId: card.pairId,
          label: card.label,
        })),
        pairCount: set.pairs.length,
        biblicalReference: content.biblicalReference,
      },
    }, 200, { "cache-control": "no-store, private" });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
