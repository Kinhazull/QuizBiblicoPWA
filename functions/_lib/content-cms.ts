import { legacyQuizToUniversal } from "../../shared/content/adapters/quiz-legacy";
import {
  ContentStatus,
  Difficulty,
  GameType,
  type LegacyQuizQuestion,
} from "../../shared/content";
import type { AppEnv } from "./auth";

export type UniversalContentSummary = {
  id: string;
  gameType: GameType;
  title: string;
  biblicalReference: string | null;
  book: string | null;
  category: string;
  difficulty: Difficulty;
  status: ContentStatus;
  version: number;
  updatedAt: number;
  timesUsed: number;
  tags: readonly { id: string; label: string }[];
  indicators: readonly string[];
  links: { edit: string; review: string; history: string };
};

const statusSql: Record<ContentStatus, string> = {
  DRAFT: "qb.status='draft' AND qb.review_status IN ('draft','changes_requested')",
  IN_REVIEW: "qb.status<>'archived' AND qb.review_status='in_review'",
  PUBLISHED: "qb.status<>'archived' AND qb.review_status NOT IN ('in_review','changes_requested') AND (qb.status='active' OR qb.review_status='approved')",
  ARCHIVED: "qb.status='archived'",
};

const legacyDifficulty = (value: unknown): "easy" | "medium" | "hard" =>
  value === "easy" || value === "hard" ? value : "medium";
const legacyStatus = (value: unknown): "draft" | "active" | "archived" =>
  value === "draft" || value === "archived" ? value : "active";
const legacyReviewStatus = (value: unknown): "draft" | "in_review" | "approved" | "changes_requested" =>
  value === "in_review" || value === "approved" || value === "changes_requested" ? value : "draft";

export function adaptLegacyQuizSummary(
  row: Record<string, unknown>,
  choices: readonly Record<string, unknown>[],
): UniversalContentSummary {
  const legacy: LegacyQuizQuestion = {
    id: String(row.id),
    reference: typeof row.reference === "string" && row.reference ? row.reference : null,
    book: typeof row.book === "string" && row.book ? row.book : null,
    theme: typeof row.theme === "string" ? row.theme : "Sem tema",
    category: typeof row.category === "string" && row.category ? row.category : null,
    difficulty: legacyDifficulty(row.difficulty),
    prompt: String(row.prompt ?? ""),
    commentary: typeof row.commentary === "string" && row.commentary ? row.commentary : null,
    status: legacyStatus(row.status),
    reviewStatus: legacyReviewStatus(row.review_status),
    version: Math.max(1, Number(row.version) || 1),
    createdBy: typeof row.created_by === "string" ? row.created_by : "legacy",
    updatedBy: typeof row.updated_by === "string" ? row.updated_by : null,
    createdAt: Number(row.created_at) || 0,
    updatedAt: Number(row.updated_at) || Number(row.created_at) || 0,
    choices: choices.map(choice => ({
      id: typeof choice.id === "string" ? choice.id : undefined,
      text: String(choice.text ?? ""),
      position: Number(choice.position) || 0,
      correct: choice.correct === true || Number(choice.correct) === 1,
    })),
  };
  const universal = legacyQuizToUniversal(legacy);
  const indicators = [
    ...(legacy.reviewStatus === "changes_requested" ? ["Ajustes solicitados"] : []),
    ...(choices.length !== 4 || choices.filter(choice => Number(choice.correct) === 1).length !== 1
      ? ["Alternativas inconsistentes"] : []),
  ];
  return {
    id: universal.id,
    gameType: GameType.QUIZ,
    title: universal.content.payload.prompt,
    biblicalReference: universal.biblicalReference,
    book: universal.content.payload.book,
    category: universal.category,
    difficulty: universal.difficulty,
    status: universal.status,
    version: universal.version,
    updatedAt: universal.updatedAt,
    timesUsed: Math.max(0, Number(row.times_used) || 0),
    tags: universal.tags.map(label => ({ id: label, label })),
    indicators,
    links: {
      edit: `/admin/perguntas?question=${encodeURIComponent(universal.id)}`,
      review: `/admin/perguntas/revisao?question=${encodeURIComponent(universal.id)}`,
      history: `/admin/perguntas/colaboracao?question=${encodeURIComponent(universal.id)}`,
    },
  };
}

export async function loadContentDashboard(env: AppEnv, organizationId: string) {
  const results = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) total FROM question_bank WHERE organization_id=?1").bind(organizationId).first<{ total: number }>(),
    env.DB.prepare("SELECT COUNT(*) total FROM question_bank WHERE organization_id=?1 AND status='archived'").bind(organizationId).first<{ total: number }>(),
    env.DB.prepare("SELECT COUNT(*) total FROM question_bank WHERE organization_id=?1 AND status<>'archived' AND review_status='in_review'").bind(organizationId).first<{ total: number }>(),
    ...Object.values(ContentStatus).map(status =>
      env.DB.prepare(`SELECT COUNT(*) total FROM question_bank qb WHERE qb.organization_id=?1 AND ${statusSql[status]}`).bind(organizationId).first<{ total: number }>()),
  ]);
  const count = (index: number) => Number(results[index]?.total || 0);
  const byStatus = Object.fromEntries(Object.values(ContentStatus).map((status, index) => [status, count(index + 3)]));
  return {
    total: count(0),
    archived: count(1),
    needsReview: count(2),
    byStatus,
    byGame: Object.values(GameType).map(gameType => ({
      gameType,
      count: gameType === GameType.QUIZ ? count(0) : 0,
      integrated: gameType === GameType.QUIZ,
    })),
  };
}

export async function loadUniversalContent(
  env: AppEnv,
  organizationId: string,
  searchParams: URLSearchParams,
) {
  const gameType = searchParams.get("game") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.max(10, Math.min(50, Number(searchParams.get("pageSize")) || 20));
  const dashboard = await loadContentDashboard(env, organizationId);
  if (gameType && gameType !== GameType.QUIZ) return {
    items: [], facets: { categories: [], books: [], tags: [], difficulties: Object.values(Difficulty), statuses: Object.values(ContentStatus) },
    pagination: { page, pageSize, total: 0, totalPages: 1, hasMore: false },
    totals: dashboard,
  };

  const filters = ["qb.organization_id=?1"];
  const values: unknown[] = [organizationId];
  const add = (sql: string, value: unknown) => { values.push(value); filters.push(sql.replace("?", `?${values.length}`)); };
  const q = String(searchParams.get("q") || "").trim().slice(0, 100);
  const status = String(searchParams.get("status") || "");
  const difficulty = String(searchParams.get("difficulty") || "");
  const category = String(searchParams.get("category") || "").trim().slice(0, 80);
  const book = String(searchParams.get("book") || "").trim().slice(0, 80);
  const reference = String(searchParams.get("reference") || "").trim().slice(0, 120);
  const tag = String(searchParams.get("tag") || "").trim().slice(0, 80);
  const onlyArchived = searchParams.get("archived") === "1";
  if (onlyArchived) filters.push(statusSql.ARCHIVED);
  else if (Object.values(ContentStatus).includes(status as ContentStatus)) filters.push(statusSql[status as ContentStatus]);
  else filters.push("qb.status<>'archived'");
  if (difficulty) {
    const map: Record<string, string> = { EASY: "easy", MEDIUM: "medium", HARD: "hard", VERY_EASY: "easy", SPECIAL: "hard" };
    if (map[difficulty]) add("qb.difficulty=?", map[difficulty]);
  }
  if (category) add("qb.category=?", category);
  if (book) add("qb.book=?", book);
  if (reference) add("qb.reference LIKE ?", `%${reference}%`);
  if (tag) {
    values.push(tag, tag, tag);
    const first = values.length - 2;
    filters.push(`(qb.theme=?${first} OR qb.book=?${first + 1} OR qb.category=?${first + 2})`);
  }
  if (q) {
    values.push(`%${q}%`);
    filters.push(`(qb.prompt LIKE ?${values.length} OR qb.reference LIKE ?${values.length} OR qb.theme LIKE ?${values.length})`);
  }
  const countValues = [...values];
  const count = await env.DB.prepare(`SELECT COUNT(*) total FROM question_bank qb WHERE ${filters.join(" AND ")}`).bind(...countValues).first<{ total: number }>();
  values.push(pageSize, (page - 1) * pageSize);
  const rows = await env.DB.prepare(
    `SELECT qb.* FROM question_bank qb WHERE ${filters.join(" AND ")} ORDER BY qb.updated_at DESC, qb.id LIMIT ?${values.length - 1} OFFSET ?${values.length}`,
  ).bind(...values).all<Record<string, unknown>>();
  const ids = rows.results.map(row => String(row.id));
  const choices = ids.length
    ? await env.DB.prepare(`SELECT * FROM question_bank_choices WHERE question_id IN (${ids.map((_, index) => `?${index + 1}`).join(",")}) ORDER BY question_id,position`).bind(...ids).all<Record<string, unknown>>()
    : { results: [] as Record<string, unknown>[] };
  const byQuestion = new Map<string, Record<string, unknown>[]>();
  choices.results.forEach(choice => {
    const id = String(choice.question_id);
    byQuestion.set(id, [...(byQuestion.get(id) || []), choice]);
  });
  const facets = await env.DB.prepare(
    "SELECT DISTINCT category,book,theme FROM question_bank WHERE organization_id=?1 AND status<>'archived' ORDER BY category,book,theme",
  ).bind(organizationId).all<{ category: string | null; book: string | null; theme: string | null }>();
  const total = Number(count?.total || 0);
  const unique = (key: "category" | "book" | "theme") => [...new Set(facets.results.map(row => row[key]).filter((value): value is string => Boolean(value)))];
  return {
    items: rows.results.map(row => adaptLegacyQuizSummary(row, byQuestion.get(String(row.id)) || [])),
    facets: {
      categories: unique("category"),
      books: unique("book"),
      tags: [...new Set([...unique("theme"), ...unique("book")])],
      difficulties: Object.values(Difficulty),
      statuses: Object.values(ContentStatus),
    },
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), hasMore: page * pageSize < total },
    totals: dashboard,
  };
}
