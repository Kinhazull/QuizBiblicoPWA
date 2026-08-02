import {
  ContentStatus,
  type ContentValidationIssue,
  type GameType,
  type SharedContentMetadata,
} from "./schema-types.ts";
import { Difficulty } from "./editorial-taxonomy.ts";

const plainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const normalizedText = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ");
const optionalText = (value: unknown) => value === null || value === undefined || value === ""
  ? null
  : typeof value === "string" ? normalizedText(value) : value;

export type EditorialMetadataValidation = {
  value: SharedContentMetadata | null;
  errors: readonly ContentValidationIssue[];
};

/**
 * Validates the common editorial envelope for every game. Categories, themes
 * and tags remain open vocabulary so already-published content stays valid.
 */
export function validateEditorialMetadata(gameType: GameType, input: unknown): EditorialMetadataValidation {
  const errors: ContentValidationIssue[] = [];
  if (!plainObject(input)) {
    return {
      value: null,
      errors: [{ field: "metadata", code: "invalid_type", message: "Os metadados devem ser um objeto." }],
    };
  }
  const id = typeof input.id === "string" ? normalizedText(input.id) : "";
  const category = typeof input.category === "string" ? normalizedText(input.category) : "";
  const authorId = typeof input.authorId === "string" ? normalizedText(input.authorId) : "";
  const status = input.status;
  const difficulty = input.difficulty;
  if (input.gameType !== undefined && input.gameType !== gameType) errors.push({ field: "metadata.gameType", code: "game_mismatch", message: "O jogo dos metadados não corresponde ao schema solicitado." });
  if (!id) errors.push({ field: "metadata.id", code: "required", message: "O identificador é obrigatório." });
  if (!category) errors.push({ field: "metadata.category", code: "required", message: "A categoria é obrigatória." });
  if (!authorId) errors.push({ field: "metadata.authorId", code: "required", message: "O autor é obrigatório." });
  if (!Object.values(ContentStatus).includes(status as ContentStatus)) errors.push({ field: "metadata.status", code: "invalid_option", message: "Status editorial inválido." });
  if (!Object.values(Difficulty).includes(difficulty as Difficulty)) errors.push({ field: "metadata.difficulty", code: "invalid_option", message: "Dificuldade inválida." });
  if (!Array.isArray(input.tags) || input.tags.some(tag => typeof tag !== "string")) errors.push({ field: "metadata.tags", code: "invalid_type", message: "Tags devem ser uma lista de textos." });
  if (!Number.isInteger(input.version) || Number(input.version) < 1) errors.push({ field: "metadata.version", code: "invalid_number", message: "A versão deve ser um inteiro positivo." });
  if (!Number.isFinite(input.createdAt) || Number(input.createdAt) < 0) errors.push({ field: "metadata.createdAt", code: "invalid_number", message: "Data de criação inválida." });
  if (!Number.isFinite(input.updatedAt) || Number(input.updatedAt) < 0) errors.push({ field: "metadata.updatedAt", code: "invalid_number", message: "Data de atualização inválida." });
  const biblicalReference = optionalText(input.biblicalReference);
  if (biblicalReference !== null && typeof biblicalReference !== "string") errors.push({ field: "metadata.biblicalReference", code: "invalid_type", message: "A referência bíblica deve ser texto." });
  if (status === ContentStatus.PUBLISHED && biblicalReference === null) errors.push({ field: "metadata.biblicalReference", code: "required_for_published", message: "Conteúdo publicado exige referência bíblica." });
  if (errors.length) return { value: null, errors };
  const tags = [...new Set((input.tags as string[]).map(normalizedText).filter(Boolean))];
  return {
    errors: [],
    value: {
      id, gameType, category, tags,
      difficulty: difficulty as Difficulty,
      biblicalReference: biblicalReference as string | null,
      status: status as ContentStatus,
      authorId,
      reviewerId: optionalText(input.reviewerId) as string | null,
      createdAt: Number(input.createdAt),
      updatedAt: Number(input.updatedAt),
      version: Number(input.version),
      internalNotes: optionalText(input.internalNotes) as string | null,
    },
  };
}
