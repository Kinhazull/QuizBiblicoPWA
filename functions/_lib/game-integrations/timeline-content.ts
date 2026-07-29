import type { TimelineRound } from "../../../app/games/timeline/engine";
import type { TimelineContentPayload } from "../../../shared/content";
import { sha256 } from "../security";

export async function timelineRoundFromContent(
  contentId: string,
  payload: TimelineContentPayload,
): Promise<TimelineRound> {
  const events = await Promise.all(payload.events.map(async event => ({
    id: `event-${(await sha256(`${contentId}:${event.position}:${event.title}`)).slice(0, 20)}`,
    title: event.title,
    description: event.description ?? null,
    position: event.position,
  })));
  return { id: contentId, title: payload.title, events };
}
