import {
  ContentStatus,
  type ContentField,
  type ContentValidationIssue,
  type GameSpecificContent,
  type SharedContentModel,
} from "./schema-types.ts";
import { getContentSchema } from "./registry.ts";
import { validateEditorialMetadata } from "./editorial-validation.ts";

export type ContentValidationResult = {
  valid: boolean;
  errors: readonly ContentValidationIssue[];
  warnings: readonly ContentValidationIssue[];
  normalizedValue: SharedContentModel | null;
};

const plainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const normalizedText = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ");

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

export function validateContent(gameType: string, metadata: unknown, payload: unknown): ContentValidationResult {
  const schema = getContentSchema(gameType);
  if (!schema) return {
    valid: false,
    errors: [{ field: "gameType", code: "unsupported_game", message: `Jogo não suportado: ${gameType}.` }],
    warnings: [],
    normalizedValue: null,
  };
  const errors: ContentValidationIssue[] = [];
  const editorial = validateEditorialMetadata(schema.gameType, metadata);
  errors.push(...editorial.errors);
  const normalizedMetadata = editorial.value;
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
