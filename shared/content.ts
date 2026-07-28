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

type SpecificContent<TGameType extends GameType> = {
  gameType: TGameType;
  payload: Readonly<Record<string, unknown>>;
};

export type QuizContent = SpecificContent<typeof GameType.QUIZ>;
export type WordleContent = SpecificContent<typeof GameType.WORDLE>;
export type TimelineContent = SpecificContent<typeof GameType.TIMELINE>;
export type MemoryContent = SpecificContent<typeof GameType.MEMORY>;
export type AssociationContent = SpecificContent<typeof GameType.ASSOCIATION>;
export type WhoAmIContent = SpecificContent<typeof GameType.WHO_AM_I>;
export type ThreeCluesContent = SpecificContent<typeof GameType.THREE_CLUES>;

export type GameSpecificContent =
  | QuizContent
  | WordleContent
  | TimelineContent
  | MemoryContent
  | AssociationContent
  | WhoAmIContent
  | ThreeCluesContent;

export type SharedContentModel<TContent extends GameSpecificContent = GameSpecificContent> =
  Omit<SharedContentMetadata, "gameType"> & {
    gameType: TContent["gameType"];
    content: TContent;
  };
