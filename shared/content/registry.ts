import { GameType, type ContentSchema } from "./schema-types.ts";
import { associationContentSchema } from "./schemas/association.ts";
import { memoryContentSchema } from "./schemas/memory.ts";
import { quizContentSchema } from "./schemas/quiz.ts";
import { threeCluesContentSchema } from "./schemas/three-clues.ts";
import { timelineContentSchema } from "./schemas/timeline.ts";
import { whoAmIContentSchema } from "./schemas/who-am-i.ts";
import { wordleContentSchema } from "./schemas/wordle.ts";

export const contentSchemas = [
  quizContentSchema,
  wordleContentSchema,
  associationContentSchema,
  timelineContentSchema,
  memoryContentSchema,
  whoAmIContentSchema,
  threeCluesContentSchema,
] as const satisfies readonly ContentSchema[];

const schemaByGameType = new Map(contentSchemas.map(schema => [schema.gameType, schema]));

export const getContentSchema = (gameType: string): ContentSchema | null =>
  schemaByGameType.get(gameType as GameType) ?? null;

export const isSupportedContentGameType = (gameType: string): gameType is GameType =>
  schemaByGameType.has(gameType as GameType);
