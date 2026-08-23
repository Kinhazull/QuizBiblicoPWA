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

export type MemorySelectionContent = {
  id: string;
  version: number;
  payload: MemoryContentPayload;
};

const normalizedPairKey = (front: string, back: string) =>
  `${front.normalize("NFKC").trim().toLocaleLowerCase("pt-BR")}\u0000${back.normalize("NFKC").trim().toLocaleLowerCase("pt-BR")}`;

const deterministicIndex = (hash: string, length: number) => {
  let value = 0;
  for (const character of hash.slice(0, 16)) value = (value * 131 + character.charCodeAt(0)) >>> 0;
  return value % length;
};

/**
 * New generated selections persist three source contents and deterministically
 * take one canonical pair from each. A one-item selection is historical and
 * deliberately keeps the former fixed-set contract byte-for-byte.
 */
export async function memorySetFromSelection(
  selectionId: string,
  seed: string,
  contents: readonly MemorySelectionContent[],
): Promise<MemorySet> {
  if (contents.length === 1) {
    return memorySetFromContent(contents[0].id, contents[0].payload);
  }
  if (contents.length !== 3) throw new Error("invalid_memory_selection_content_count");

  const used = new Set<string>();
  const selected = [];
  for (const content of contents) {
    if (!content.payload.pairs.length) throw new Error("invalid_memory_content");
    const hash = await sha256(`${seed}:${content.id}:${content.version}:memory-pair-v1`);
    const start = deterministicIndex(hash, content.payload.pairs.length);
    let chosenIndex = -1;
    for (let offset = 0; offset < content.payload.pairs.length; offset += 1) {
      const index = (start + offset) % content.payload.pairs.length;
      const pair = content.payload.pairs[index];
      const key = normalizedPairKey(pair.front, pair.back);
      if (!used.has(key)) {
        used.add(key);
        chosenIndex = index;
        break;
      }
    }
    if (chosenIndex < 0) throw new Error("duplicate_memory_pair_selection");
    const pair = content.payload.pairs[chosenIndex];
    selected.push({
      id: `pair-${(await sha256(`${content.id}:${chosenIndex}:${pair.front}:${pair.back}`)).slice(0, 20)}`,
      front: pair.front,
      back: pair.back,
    });
  }
  return { id: selectionId, title: "Memória Bíblica", pairs: selected };
}
