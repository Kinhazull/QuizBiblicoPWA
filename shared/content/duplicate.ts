import {
  ContentStatus,
  type GameSpecificContent,
  type SharedContentMetadata,
  type SharedContentModel,
} from "./schema-types.ts";
import { getContentSchema } from "./registry.ts";

export const normalizeDuplicateText = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

export type ContentDuplicateKey = {
  gameType: string;
  key: string;
  fields: readonly string[];
};

export function createContentDuplicateKey(
  gameType: string,
  metadata: SharedContentMetadata,
  payload: Readonly<Record<string, unknown>>,
): ContentDuplicateKey | null {
  const schema = getContentSchema(gameType);
  if (!schema || !schema.capabilities.supportsDuplicateDetection) return null;
  const parts = schema.duplicateStrategy.buildParts(metadata, payload).map(normalizeDuplicateText).filter(Boolean);
  if (!parts.length) return null;
  return { gameType, key: `${gameType}:${parts.join("|")}`, fields: schema.duplicateStrategy.fields };
}

export function duplicateContent<TContent extends GameSpecificContent>(
  source: SharedContentModel<TContent>,
  options: { id: string; authorId: string; now: number },
): SharedContentModel<TContent> {
  if (!options.id.trim() || options.id === source.id) {
    throw new TypeError("A cópia precisa de um novo identificador.");
  }
  return {
    ...source,
    id: options.id.trim(),
    status: ContentStatus.DRAFT,
    authorId: options.authorId,
    reviewerId: null,
    createdAt: options.now,
    updatedAt: options.now,
    version: 1,
    internalNotes: `Duplicado de ${source.id}.`,
    tags: [...source.tags],
    content: {
      ...source.content,
      payload: structuredClone(source.content.payload),
    },
  };
}
