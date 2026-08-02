import { GameType } from "./schema-types.ts";
import { EDITORIAL_TAXONOMY_POLICY } from "./editorial-taxonomy.ts";

export type EditorialContract = {
  gameType: GameType;
  contentUnit: "QUESTION" | "WORD" | "SET";
  requiredMetadata: readonly ["category", "difficulty", "tags"];
  requiredForPublished: readonly ["biblicalReference"];
  payloadFields: readonly string[];
  themeSources: readonly string[];
  taxonomyPolicy: typeof EDITORIAL_TAXONOMY_POLICY;
};

const contract = (
  gameType: GameType,
  contentUnit: EditorialContract["contentUnit"],
  payloadFields: readonly string[],
  themeSources: readonly string[],
): EditorialContract => Object.freeze({
  gameType,
  contentUnit,
  requiredMetadata: ["category", "difficulty", "tags"] as const,
  requiredForPublished: ["biblicalReference"] as const,
  payloadFields: Object.freeze([...payloadFields]),
  themeSources: Object.freeze([...themeSources]),
  taxonomyPolicy: EDITORIAL_TAXONOMY_POLICY,
});

export const EDITORIAL_CONTRACTS = Object.freeze({
  [GameType.QUIZ]: contract(GameType.QUIZ, "QUESTION", ["prompt", "choices", "book", "theme", "explanation"], ["payload.theme", "metadata.category", "metadata.tags"]),
  [GameType.WORDLE]: contract(GameType.WORDLE, "WORD", ["word", "hint"], ["metadata.category", "metadata.tags"]),
  [GameType.MEMORY]: contract(GameType.MEMORY, "SET", ["title", "pairs"], ["metadata.category", "metadata.tags"]),
  [GameType.TIMELINE]: contract(GameType.TIMELINE, "SET", ["title", "events"], ["metadata.category", "metadata.tags"]),
  [GameType.ASSOCIATION]: contract(GameType.ASSOCIATION, "SET", ["title", "pairs"], ["metadata.category", "metadata.tags"]),
  [GameType.WHO_AM_I]: contract(GameType.WHO_AM_I, "SET", ["title", "challenges"], ["metadata.category", "metadata.tags"]),
  [GameType.THREE_CLUES]: contract(GameType.THREE_CLUES, "SET", ["title", "challenges"], ["metadata.category", "metadata.tags"]),
} satisfies Record<GameType, EditorialContract>);

export const getEditorialContract = (gameType: string): EditorialContract | null =>
  EDITORIAL_CONTRACTS[gameType as GameType] ?? null;
