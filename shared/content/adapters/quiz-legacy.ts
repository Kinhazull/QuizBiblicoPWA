import {
  ContentStatus,
  Difficulty,
  GameType,
  type QuizContent,
  type QuizContentPayload,
  type SharedContentModel,
} from "../schema-types.ts";

export type LegacyQuizDifficulty = "easy" | "medium" | "hard";
export type LegacyQuizStatus = "draft" | "active" | "archived";
export type LegacyQuizReviewStatus = "draft" | "in_review" | "approved" | "changes_requested";
export type LegacyQuizChoice = {
  id?: string;
  text: string;
  position?: number;
  correct: boolean | number;
};
export type LegacyQuizQuestion = {
  id: string;
  reference: string | null;
  book: string | null;
  theme: string;
  category: string | null;
  difficulty: LegacyQuizDifficulty;
  prompt: string;
  commentary: string | null;
  status: LegacyQuizStatus;
  reviewStatus: LegacyQuizReviewStatus;
  version: number;
  createdBy: string;
  updatedBy?: string | null;
  createdAt: number;
  updatedAt: number;
  internalNotes?: string | null;
  choices: readonly LegacyQuizChoice[];
};

const difficultyToUniversal: Record<LegacyQuizDifficulty, Difficulty> = {
  easy: Difficulty.EASY,
  medium: Difficulty.MEDIUM,
  hard: Difficulty.HARD,
};

const difficultyToLegacy: Record<Difficulty, LegacyQuizDifficulty> = {
  VERY_EASY: "easy",
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
  SPECIAL: "hard",
};

function statusToUniversal(question: LegacyQuizQuestion): ContentStatus {
  if (question.status === "archived") return ContentStatus.ARCHIVED;
  if (question.reviewStatus === "in_review") return ContentStatus.IN_REVIEW;
  if (question.reviewStatus === "changes_requested") return ContentStatus.DRAFT;
  if (question.status === "active" || question.reviewStatus === "approved") return ContentStatus.PUBLISHED;
  return ContentStatus.DRAFT;
}

function editorialNote(question: LegacyQuizQuestion): string | null {
  if (question.reviewStatus !== "changes_requested") return question.internalNotes ?? null;
  const note = "Revisão legada: alterações solicitadas.";
  return question.internalNotes ? `${note} ${question.internalNotes}` : note;
}

export function legacyQuizToUniversal(question: LegacyQuizQuestion): SharedContentModel<QuizContent> {
  const payload: QuizContentPayload = {
    prompt: question.prompt,
    choices: [...question.choices]
      .sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
      .map(choice => ({ text: choice.text, correct: choice.correct === true || choice.correct === 1 })),
    book: question.book,
    theme: question.theme,
    explanation: question.commentary,
    legacyEditorial: { status: question.status, reviewStatus: question.reviewStatus },
  };
  return {
    id: question.id,
    gameType: GameType.QUIZ,
    category: question.category ?? question.theme,
    tags: [...new Set([question.theme, question.book].filter((value): value is string => Boolean(value)))],
    difficulty: difficultyToUniversal[question.difficulty],
    biblicalReference: question.reference,
    status: statusToUniversal(question),
    authorId: question.createdBy,
    reviewerId: question.updatedBy ?? null,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
    version: Math.max(1, question.version),
    internalNotes: editorialNote(question),
    content: { gameType: GameType.QUIZ, payload },
  };
}

function canonicalLegacyStatus(status: ContentStatus): {
  status: LegacyQuizStatus;
  reviewStatus: LegacyQuizReviewStatus;
} {
  if (status === ContentStatus.IN_REVIEW) return { status: "draft", reviewStatus: "in_review" };
  if (status === ContentStatus.PUBLISHED) return { status: "active", reviewStatus: "approved" };
  if (status === ContentStatus.ARCHIVED) return { status: "archived", reviewStatus: "approved" };
  return { status: "draft", reviewStatus: "draft" };
}

function compatibleLegacyEditorial(
  status: ContentStatus,
  editorial: QuizContentPayload["legacyEditorial"],
) {
  if (!editorial?.status || !editorial.reviewStatus) return null;
  const candidate = statusToUniversal({
    status: editorial.status,
    reviewStatus: editorial.reviewStatus,
  } as LegacyQuizQuestion);
  return candidate === status ? editorial as Required<NonNullable<typeof editorial>> : null;
}

export function universalQuizToLegacy(content: SharedContentModel<QuizContent>): LegacyQuizQuestion {
  if (content.gameType !== GameType.QUIZ || content.content.gameType !== GameType.QUIZ) {
    throw new TypeError("Somente conteúdo do Quiz pode ser convertido para o formato legado.");
  }
  const payload = content.content.payload;
  const editorial = compatibleLegacyEditorial(content.status, payload.legacyEditorial)
    ?? canonicalLegacyStatus(content.status);
  return {
    id: content.id,
    reference: content.biblicalReference,
    book: payload.book,
    theme: payload.theme,
    category: content.category,
    difficulty: difficultyToLegacy[content.difficulty],
    prompt: payload.prompt,
    commentary: payload.explanation,
    status: editorial.status,
    reviewStatus: editorial.reviewStatus,
    version: content.version,
    createdBy: content.authorId,
    updatedBy: content.reviewerId,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
    internalNotes: content.internalNotes,
    choices: payload.choices.map((choice, position) => ({
      text: choice.text,
      correct: choice.correct,
      position,
    })),
  };
}
