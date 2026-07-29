export const GameType = {
  QUIZ: "quiz-biblico",
  WORDLE: "wordle-biblico",
  ASSOCIATION: "associacao-de-temas",
  TIMELINE: "linha-do-tempo-biblica",
  MEMORY: "memoria-biblica",
  WHO_AM_I: "quem-sou-eu",
  THREE_CLUES: "jogo-tres-pistas",
} as const;
export type GameType = typeof GameType[keyof typeof GameType];

export const ContentStatus = {
  DRAFT: "DRAFT",
  IN_REVIEW: "IN_REVIEW",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;
export type ContentStatus = typeof ContentStatus[keyof typeof ContentStatus];

export const Difficulty = {
  VERY_EASY: "VERY_EASY",
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
  SPECIAL: "SPECIAL",
} as const;
export type Difficulty = typeof Difficulty[keyof typeof Difficulty];

export type SharedContentMetadata = {
  id: string;
  gameType: GameType;
  category: string;
  tags: readonly string[];
  difficulty: Difficulty;
  biblicalReference: string | null;
  status: ContentStatus;
  authorId: string;
  reviewerId: string | null;
  createdAt: number;
  updatedAt: number;
  version: number;
  internalNotes: string | null;
};

export type QuizChoice = { text: string; correct: boolean };
export type QuizContentPayload = {
  prompt: string;
  choices: readonly QuizChoice[];
  book: string | null;
  theme: string;
  explanation: string | null;
  legacyEditorial?: {
    status?: "draft" | "active" | "archived";
    reviewStatus?: "draft" | "in_review" | "approved" | "changes_requested";
  };
};
export type WordleContentPayload = { word: string; hint: string | null };
export type TimelineContentPayload = {
  title: string;
  events: readonly { title: string; description?: string | null; position: number }[];
};
export type MemoryContentPayload = {
  title: string;
  pairs: readonly { front: string; back: string }[];
};
export type AssociationContentPayload = {
  title: string;
  pairs: readonly { category?: string; left: string; right: string }[];
};
export type WhoAmIContentPayload = {
  name: string;
  hints: readonly string[];
  options: readonly string[];
};
export type ThreeCluesContentPayload = { answer: string; clues: readonly string[] };

export type SpecificContent<TGameType extends GameType, TPayload> = {
  gameType: TGameType;
  payload: Readonly<TPayload>;
};
export type QuizContent = SpecificContent<typeof GameType.QUIZ, QuizContentPayload>;
export type WordleContent = SpecificContent<typeof GameType.WORDLE, WordleContentPayload>;
export type TimelineContent = SpecificContent<typeof GameType.TIMELINE, TimelineContentPayload>;
export type MemoryContent = SpecificContent<typeof GameType.MEMORY, MemoryContentPayload>;
export type AssociationContent = SpecificContent<typeof GameType.ASSOCIATION, AssociationContentPayload>;
export type WhoAmIContent = SpecificContent<typeof GameType.WHO_AM_I, WhoAmIContentPayload>;
export type ThreeCluesContent = SpecificContent<typeof GameType.THREE_CLUES, ThreeCluesContentPayload>;
export type GameSpecificContent =
  | QuizContent | WordleContent | TimelineContent | MemoryContent
  | AssociationContent | WhoAmIContent | ThreeCluesContent;

export type SharedContentModel<TContent extends GameSpecificContent = GameSpecificContent> =
  Omit<SharedContentMetadata, "gameType"> & {
    gameType: TContent["gameType"];
    content: TContent;
  };

export type ContentFieldType =
  | "text" | "textarea" | "select" | "number" | "boolean"
  | "list" | "object" | "reference";
export type ContentFieldOption = { label: string; value: string | number | boolean };
export type ContentField = {
  key: string;
  label: string;
  description: string;
  type: ContentFieldType;
  required: boolean;
  defaultValue?: unknown;
  options?: readonly ContentFieldOption[];
  minimum?: number;
  maximum?: number;
  minimumItems?: number;
  maximumItems?: number;
  placeholder?: string;
  importColumn?: string;
  itemField?: ContentField;
  fields?: readonly ContentField[];
};
export type ContentTemplate = {
  id: string;
  label: string;
  description: string;
  values: Readonly<Record<string, unknown>>;
};
export type ContentImportColumn = {
  key: string;
  column: string;
  aliases: readonly string[];
  expectedType: "text" | "integer" | "boolean";
  required: boolean;
  transformation: "trim" | "difficulty" | "correct-choice" | "none";
};
export type ContentCapabilities = {
  supportsExplanation: boolean;
  supportsPreview: boolean;
  supportsBulkImport: boolean;
  supportsCollaboration: boolean;
  supportsVersioning: boolean;
  supportsDuplicateDetection: boolean;
};
export type ContentValidationIssue = {
  field: string;
  code: string;
  message: string;
};
export type SpecificValidation = (
  payload: Readonly<Record<string, unknown>>,
) => readonly ContentValidationIssue[];
export type DuplicateStrategy = {
  fields: readonly string[];
  buildParts: (
    metadata: SharedContentMetadata,
    payload: Readonly<Record<string, unknown>>,
  ) => readonly string[];
};
export type ContentSchema = {
  gameType: GameType;
  label: string;
  description: string;
  fields: readonly ContentField[];
  templates: readonly ContentTemplate[];
  validation: SpecificValidation;
  duplicateStrategy: DuplicateStrategy;
  importColumns: readonly ContentImportColumn[];
  capabilities: ContentCapabilities;
};
