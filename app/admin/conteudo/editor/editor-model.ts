import {
  ContentStatus,
  Difficulty,
  GameType,
  getContentSchema,
  type ContentField,
  type ContentTemplate,
  type SharedContentMetadata,
} from "../../../../shared/content";

export const editorGameAliases = {
  quiz: GameType.QUIZ,
  wordle: GameType.WORDLE,
  association: GameType.ASSOCIATION,
  timeline: GameType.TIMELINE,
  memory: GameType.MEMORY,
  "who-am-i": GameType.WHO_AM_I,
  "three-clues": GameType.THREE_CLUES,
} as const;

export type EditorGameAlias = keyof typeof editorGameAliases;
export type EditorMetadata = Omit<SharedContentMetadata, "tags"> & { tags: string[] };
export type ReferenceDraft = { id: string; label: string; type: string };
export type EditorDraft = {
  gameType: GameType;
  templateId: string | null;
  metadata: EditorMetadata;
  payload: Record<string, unknown>;
  reference: ReferenceDraft;
};

export function aliasForGame(gameType: GameType): EditorGameAlias {
  return (Object.entries(editorGameAliases).find(([, value]) => value === gameType)?.[0] ?? "quiz") as EditorGameAlias;
}

export function gameFromQuery(value: string | null) {
  if (!value) return { gameType: GameType.QUIZ, invalid: false };
  const gameType = editorGameAliases[value as EditorGameAlias];
  return { gameType: gameType ?? GameType.QUIZ, invalid: !gameType };
}

const clone = <T,>(value: T): T => value === undefined ? value : structuredClone(value);

export function defaultFieldValue(field: ContentField, depth = 0): unknown {
  if (depth > 4) return null;
  if (field.defaultValue !== undefined) return clone(field.defaultValue);
  if (field.type === "boolean") return false;
  if (field.type === "number") return field.minimum ?? 0;
  if (field.type === "list") {
    return Array.from({ length: field.minimumItems ?? 0 }, () => defaultListItem(field, depth + 1));
  }
  if (field.type === "object") {
    return Object.fromEntries((field.fields ?? []).map(child => [child.key, defaultFieldValue(child, depth + 1)]));
  }
  return "";
}

export function defaultListItem(field: ContentField, depth = 0): unknown {
  if (depth > 4) return "";
  if (field.fields?.length) {
    return Object.fromEntries(field.fields.map(child => [child.key, defaultFieldValue(child, depth + 1)]));
  }
  return field.itemField ? defaultFieldValue(field.itemField, depth + 1) : "";
}

function normalizeTemplateField(field: ContentField, value: unknown) {
  if (field.type !== "list") return clone(value);
  if (typeof value === "number") {
    return Array.from({ length: Math.max(0, value) }, () => defaultListItem(field));
  }
  if (!Array.isArray(value)) return clone(value);
  if (!field.fields?.length) return clone(value);
  return value.map(item => {
    if (item && typeof item === "object" && !Array.isArray(item)) return clone(item);
    const result = defaultListItem(field) as Record<string, unknown>;
    const primary = field.fields?.find(child => child.type === "text");
    if (primary) result[primary.key] = item;
    return result;
  });
}

export function createEditorDraft(gameType: GameType, template?: ContentTemplate | null): EditorDraft {
  const schema = getContentSchema(gameType);
  if (!schema) throw new TypeError(`Schema não encontrado: ${gameType}`);
  const now = Date.now();
  const metadata: EditorMetadata = {
    id: `local-${gameType}-${now}`,
    gameType,
    category: "",
    tags: [],
    difficulty: Difficulty.MEDIUM,
    biblicalReference: null,
    status: ContentStatus.DRAFT,
    authorId: "editor-local",
    reviewerId: null,
    createdAt: now,
    updatedAt: now,
    version: 1,
    internalNotes: null,
  };
  const payload = Object.fromEntries(schema.fields.map(field => [field.key, defaultFieldValue(field)]));
  const draft = { gameType, templateId: null, metadata, payload, reference: { id: "", label: "", type: "passage" } };
  return template ? applyTemplate(draft, template) : draft;
}

export function applyTemplate(draft: EditorDraft, template: ContentTemplate): EditorDraft {
  const schema = getContentSchema(draft.gameType);
  if (!schema) return draft;
  const metadata = { ...draft.metadata, updatedAt: Date.now() };
  const payload = Object.fromEntries(schema.fields.map(field => [field.key, defaultFieldValue(field)]));
  for (const [key, value] of Object.entries(template.values)) {
    const field = schema.fields.find(candidate => candidate.key === key);
    if (field) payload[key] = normalizeTemplateField(field, value);
    else if (key in metadata) (metadata as unknown as Record<string, unknown>)[key] = clone(value);
  }
  return { ...draft, templateId: template.id, metadata, payload };
}

export function updateAtPath(source: unknown, path: readonly (string | number)[], value: unknown): unknown {
  if (!path.length) return value;
  const [head, ...tail] = path;
  if (typeof head === "number") {
    const array = Array.isArray(source) ? [...source] : [];
    array[head] = updateAtPath(array[head], tail, value);
    return array;
  }
  const object = source && typeof source === "object" && !Array.isArray(source)
    ? { ...(source as Record<string, unknown>) }
    : {};
  object[head] = updateAtPath(object[head], tail, value);
  return object;
}

