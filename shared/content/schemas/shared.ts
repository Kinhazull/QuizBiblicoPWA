import type {
  ContentCapabilities,
  ContentField,
  ContentValidationIssue,
} from "../schema-types.ts";

export const standardCapabilities = (overrides: Partial<ContentCapabilities> = {}): ContentCapabilities => ({
  supportsExplanation: false,
  supportsPreview: true,
  supportsBulkImport: false,
  supportsCollaboration: true,
  supportsVersioning: true,
  supportsDuplicateDetection: true,
  ...overrides,
});

export const field = (
  key: string,
  label: string,
  type: ContentField["type"],
  required = true,
  extra: Partial<ContentField> = {},
): ContentField => ({
  key,
  label,
  description: extra.description ?? label,
  type,
  required,
  ...extra,
});

export const issue = (fieldName: string, code: string, message: string): ContentValidationIssue => ({
  field: fieldName,
  code,
  message,
});

export const objectArray = (value: unknown): readonly Record<string, unknown>[] =>
  Array.isArray(value) && value.every(item => item && typeof item === "object" && !Array.isArray(item))
    ? value as readonly Record<string, unknown>[]
    : [];
