import type { MemorySet } from "../../../app/games/memory/engine";
import type { MemoryContentPayload } from "../../../shared/content";
import { sha256 } from "../security";

export async function memorySetFromContent(
  contentId: string,
  payload: MemoryContentPayload,
): Promise<MemorySet> {
  const pairs = await Promise.all(payload.pairs.map(async (pair, index) => ({
    id: `pair-${(await sha256(`${contentId}:${index}:${pair.front}:${pair.back}`)).slice(0, 20)}`,
    front: pair.front,
    back: pair.back,
  })));
  return { id: contentId, title: payload.title, pairs };
}
