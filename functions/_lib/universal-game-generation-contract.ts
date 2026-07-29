import type { Difficulty } from "../../shared/content";

export const GameGenerationMode = {
  INTERNAL_TEST: "INTERNAL_TEST",
  DAILY: "DAILY",
  FREE_PLAY: "FREE_PLAY",
  EVENT: "EVENT",
  CUSTOM_JOURNEY: "CUSTOM_JOURNEY",
} as const;
export type GameGenerationMode =
  typeof GameGenerationMode[keyof typeof GameGenerationMode];

export const GeneratedSelectionStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
} as const;
export type GeneratedSelectionStatus =
  typeof GeneratedSelectionStatus[keyof typeof GeneratedSelectionStatus];

export type DifficultyDistribution = Partial<Record<Difficulty, number>>;

export type UniversalGameSelectionRequest = {
  organizationId: string;
  requestedByUserId?: string;
  gameType: string;
  mode: GameGenerationMode;
  selectionKey: string;
  algorithmVersion: number;
  seed?: string;
  count: number;
  difficulty?: Difficulty;
  difficultyDistribution?: DifficultyDistribution;
  themes?: readonly string[];
  books?: readonly string[];
  tags?: readonly string[];
  excludeContentIds?: readonly string[];
  repetitionWindow?: {
    recentContentIds: readonly string[];
  };
  expiresAt?: number | null;
};

export type GeneratedSelectionItem = {
  contentId: string;
  contentVersion: number;
  position: number;
  auditMetadata: {
    difficulty: Difficulty;
    themes: readonly string[];
    books: readonly string[];
    tags: readonly string[];
    priority: number;
    usageCount: number;
  };
};

export type GeneratedGameSelection = {
  id: string;
  organizationId: string;
  requestedByUserId: string | null;
  gameType: string;
  mode: GameGenerationMode;
  selectionKey: string;
  algorithmVersion: number;
  seedHash: string;
  requestFingerprint: string;
  status: GeneratedSelectionStatus;
  createdAt: number;
  expiresAt: number | null;
  items: readonly GeneratedSelectionItem[];
};

export type GenerationFailure =
  | {
    code: "invalid_generation_request" | "unsupported_game_capability";
    details: readonly string[];
  }
  | {
    code: "insufficient_eligible_content";
    organizationId: string;
    gameType: string;
    requestedCount: number;
    availableCount: number;
    filters: Readonly<Record<string, unknown>>;
  }
  | {
    code: "selection_key_conflict";
    selectionId: string;
  };
