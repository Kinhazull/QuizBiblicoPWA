import { GameType, validateContent, type TimelineContentPayload } from "../../../../shared/content";
import { requireUser, type AppEnv } from "../../../_lib/auth";
import { json } from "../../../_lib/security";
import { findPublishedUniversalContent } from "../../../_lib/universal-content-store";
import { timelineRoundFromContent } from "../../../_lib/game-integrations/timeline-content";
import { isCorrectTimelineOrder, shuffleTimelineEvents } from "../../../../app/games/timeline/engine";

async function publishedTimeline(env: AppEnv, organizationId: string, contentId?: string) {
  const content = await findPublishedUniversalContent(env, organizationId, GameType.TIMELINE, contentId);
  if (!content) return null;
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
  if (!validation.valid) return null;
  const round = await timelineRoundFromContent(content.id, content.payload as TimelineContentPayload);
  return { content, round };
}

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const published = await publishedTimeline(env, String(user.organizationId));
    if (!published) {
      return json({ error: "timeline_content_unavailable" }, 404, {
        "cache-control": "no-store, private",
      });
    }
    const { content, round } = published;
    return json({
      content: {
        id: content.id,
        version: content.version,
        title: round.title,
        events: shuffleTimelineEvents(round.events).map(event => ({
          id: event.id,
          title: event.title,
          description: event.description ?? null,
        })),
        biblicalReference: content.biblicalReference,
      },
    }, 200, { "cache-control": "no-store, private" });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const body: any = await request.json().catch(() => null);
    if (!body || typeof body.contentId !== "string" || !Number.isInteger(body.contentVersion)
      || !Array.isArray(body.orderedEventIds) || body.orderedEventIds.some((id: unknown) => typeof id !== "string")) {
      return json({ error: "invalid_timeline_order" }, 400, { "cache-control": "no-store, private" });
    }
    const published = await publishedTimeline(env, String(user.organizationId), body.contentId);
    if (!published || published.content.version !== body.contentVersion) {
      return json({ error: "invalid_timeline_content" }, 400, { "cache-control": "no-store, private" });
    }
    return json({
      correct: isCorrectTimelineOrder(published.round, body.orderedEventIds),
    }, 200, { "cache-control": "no-store, private" });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
