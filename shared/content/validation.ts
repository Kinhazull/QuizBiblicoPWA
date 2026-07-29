import {
  ContentStatus,
  Difficulty,
  type ContentField,
  type ContentValidationIssue,
  type GameSpecificContent,
  type GameType,
  type SharedContentMetadata,
  type SharedContentModel,
} from "./schema-types.ts";
import { getContentSchema } from "./registry.ts";

export type ContentValidationResult = {
  valid: boolean;
  errors: readonly ContentValidationIssue[];
  warnings: readonly ContentValidationIssue[];
  normalizedValue: SharedContentModel | null;
};

const plainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const normalizedText = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ");
const optionalText = (value: unknown) => value === null || value === undefined || value === ""
  ? null
  : typeof value === "string" ? normalizedText(value) : value;

const normalizePayload = (value: unknown): unknown => {
  if (typeof value === "string") return normalizedText(value);
  if (Array.isArray(value)) return value.map(normalizePayload);
  if (plainObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizePayload(item)]));
  return value;
};

const allowedStatusTransitions: Record<ContentStatus, readonly ContentStatus[]> = {
  DRAFT: [ContentStatus.DRAFT, ContentStatus.IN_REVIEW, ContentStatus.ARCHIVED],
  IN_REVIEW: [ContentStatus.DRAFT, ContentStatus.IN_REVIEW, ContentStatus.PUBLISHED, ContentStatus.ARCHIVED],
  PUBLISHED: [ContentStatus.PUBLISHED, ContentStatus.ARCHIVED],
  ARCHIVED: [ContentStatus.DRAFT, ContentStatus.ARCHIVED],
};

export const canTransitionContentStatus = (from: ContentStatus, to: ContentStatus): boolean =>
  allowedStatusTransitions[from]?.includes(to) ?? false;

function validateField(
  field: ContentField,
  value: unknown,
  path = field.key,
  depth = 0,
): ContentValidationIssue[] {
  const errors: ContentValidationIssue[] = [];
  const missing = value === undefined || value === null || value === "";
  if (field.required && missing) return [{ field: path, code: "required", message: `${field.label} é obrigatório.` }];
  if (missing) return errors;
  if (depth > 4) return [{ field: path, code: "maximum_depth", message: `${field.label} excede a profundidade permitida.` }];
  if (field.type === "text" || field.type === "textarea" || field.type === "reference") {
    if (typeof value !== "string") return [{ field: path, code: "invalid_type", message: `${field.label} deve ser texto.` }];
    if (field.minimum !== undefined && value.length < field.minimum) errors.push({ field: path, code: "minimum", message: `${field.label} deve ter ao menos ${field.minimum} caracteres.` });
    if (field.maximum !== undefined && value.length > field.maximum) errors.push({ field: path, code: "maximum", message: `${field.label} deve ter no máximo ${field.maximum} caracteres.` });
  } else if (field.type === "select") {
    if (!field.options?.some(option => option.value === value)) errors.push({ field: path, code: "invalid_option", message: `${field.label} possui uma opção inválida.` });
  } else if (field.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) errors.push({ field: path, code: "invalid_type", message: `${field.label} deve ser numérico.` });
    else {
      if (field.minimum !== undefined && value < field.minimum) errors.push({ field: path, code: "minimum", message: `${field.label} está abaixo do mínimo.` });
      if (field.maximum !== undefined && value > field.maximum) errors.push({ field: path, code: "maximum", message: `${field.label} está acima do máximo.` });
    }
  } else if (field.type === "boolean" && typeof value !== "boolean") {
    errors.push({ field: path, code: "invalid_type", message: `${field.label} deve ser booleano.` });
  } else if (field.type === "list") {
    if (!Array.isArray(value)) errors.push({ field: path, code: "invalid_type", message: `${field.label} deve ser uma lista.` });
    else {
      if (field.minimumItems !== undefined && value.length < field.minimumItems) errors.push({ field: path, code: "minimum_items", message: `${field.label} deve ter ao menos ${field.minimumItems} itens.` });
      if (field.maximumItems !== undefined && value.length > field.maximumItems) errors.push({ field: path, code: "maximum_items", message: `${field.label} deve ter no máximo ${field.maximumItems} itens.` });
      value.forEach((item, index) => {
        if (field.itemField) errors.push(...validateField(field.itemField, item, `${path}.${index}`, depth + 1));
        if (field.fields) {
          if (!plainObject(item)) {
            errors.push({ field: `${path}.${index}`, code: "invalid_type", message: `O item ${index + 1} de ${field.label} deve ser um objeto.` });
          } else {
            field.fields.forEach(child => errors.push(
              ...validateField(child, item[child.key], `${path}.${index}.${child.key}`, depth + 1),
            ));
          }
        }
      });
    }
  } else if (field.type === "object") {
    if (!plainObject(value)) errors.push({ field: path, code: "invalid_type", message: `${field.label} deve ser um objeto.` });
    else field.fields?.forEach(child => errors.push(
      ...validateField(child, value[child.key], `${path}.${child.key}`, depth + 1),
    ));
  }
  return errors;
}

function normalizeMetadata(gameType: GameType, input: unknown, errors: ContentValidationIssue[]): SharedContentMetadata | null {
  if (!plainObject(input)) {
    errors.push({ field: "metadata", code: "invalid_type", message: "Os metadados devem ser um objeto." });
    return null;
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
  if (errors.length) return null;
  const tags = [...new Set((input.tags as string[]).map(normalizedText).filter(Boolean))];
  return {
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
  };
}

export function validateContent(gameType: string, metadata: unknown, payload: unknown): ContentValidationResult {
  const schema = getContentSchema(gameType);
  if (!schema) return {
    valid: false,
    errors: [{ field: "gameType", code: "unsupported_game", message: `Jogo não suportado: ${gameType}.` }],
    warnings: [],
    normalizedValue: null,
  };
  const errors: ContentValidationIssue[] = [];
  const normalizedMetadata = normalizeMetadata(schema.gameType, metadata, errors);
  if (!plainObject(payload)) errors.push({ field: "payload", code: "invalid_type", message: "O conteúdo específico deve ser um objeto." });
  const normalizedPayload = plainObject(payload) ? normalizePayload(payload) as Record<string, unknown> : {};
  if (plainObject(payload)) {
    schema.fields.forEach(contentField => errors.push(...validateField(contentField, normalizedPayload[contentField.key])));
    errors.push(...schema.validation(normalizedPayload));
  }
  if (errors.length || !normalizedMetadata) return { valid: false, errors, warnings: [], normalizedValue: null };
  return {
    valid: true,
    errors: [],
    warnings: [],
    normalizedValue: {
      ...normalizedMetadata,
      content: { gameType: schema.gameType, payload: normalizedPayload } as GameSpecificContent,
    },
  };
}
