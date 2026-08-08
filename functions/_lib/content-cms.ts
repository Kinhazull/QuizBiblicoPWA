import {
  ContentStatus,
  Difficulty,
  GameType,
  getContentSchema,
} from "../../shared/content";
import type { AppEnv } from "./auth";

export type UniversalContentSummary = {
  id: string;
  source: "UNIVERSAL_CMS";
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
  links: { edit: string; review: string | null; history: string };
};

export async function loadContentDashboard(env: AppEnv, organizationId: string) {
  const results = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) total FROM content_items WHERE organization_id=?1").bind(organizationId).first<{ total: number }>(),
    env.DB.prepare("SELECT editorial_status AS status,COUNT(*) total FROM content_items WHERE organization_id=?1 GROUP BY editorial_status").bind(organizationId).all<{ status: ContentStatus; total: number }>(),
    env.DB.prepare("SELECT game_type AS gameType,COUNT(*) total FROM content_items WHERE organization_id=?1 GROUP BY game_type")
      .bind(organizationId).all<{ gameType: GameType; total: number }>(),
  ]);
  const count = (index: number) => Number((results[index] as { total?: number } | null)?.total || 0);
  const universalTotal = count(0);
  const statusRows = (results[1] as D1Result<{ status: ContentStatus; total: number }>).results || [];
  const statusCounts = new Map(statusRows.map(row => [row.status, Number(row.total)]));
  const gameRows = (results[2] as D1Result<{ gameType: GameType; total: number }>).results || [];
  const byGameCount = new Map(gameRows.map(row => [row.gameType, Number(row.total)]));
  const byStatus = {
    DRAFT: statusCounts.get(ContentStatus.DRAFT) || 0,
    IN_REVIEW: statusCounts.get(ContentStatus.IN_REVIEW) || 0,
    PUBLISHED: statusCounts.get(ContentStatus.PUBLISHED) || 0,
    ARCHIVED: statusCounts.get(ContentStatus.ARCHIVED) || 0,
  };
  return {
    total: universalTotal,
    archived: byStatus.ARCHIVED,
    needsReview: byStatus.IN_REVIEW,
    byStatus,
    byGame: Object.values(GameType).map(gameType => ({
      gameType,
      count: byGameCount.get(gameType) || 0,
      integrated: true,
      editorialPersisted: byGameCount.get(gameType) || 0,
    })),
  };
}

export async function loadUniversalContent(
  env: AppEnv,
  organizationId: string,
  searchParams: URLSearchParams,
) {
  const gameType = searchParams.get("game") || "";
  const page = Math.max(1, Math.min(100, Number(searchParams.get("page")) || 1));
  const pageSize = Math.max(10, Math.min(50, Number(searchParams.get("pageSize")) || 20));
  const fetchLimit = page * pageSize;
  const dashboard = await loadContentDashboard(env, organizationId);
  const q = String(searchParams.get("q") || "").trim().slice(0, 100);
  const status = String(searchParams.get("status") || "");
  const difficulty = String(searchParams.get("difficulty") || "");
  const category = String(searchParams.get("category") || "").trim().slice(0, 80);
  const book = String(searchParams.get("book") || "").trim().slice(0, 80);
  const reference = String(searchParams.get("reference") || "").trim().slice(0, 120);
  const tag = String(searchParams.get("tag") || "").trim().slice(0, 80);
  const onlyArchived = searchParams.get("archived") === "1";

  let universalTotal = 0;
  let universalItems: UniversalContentSummary[] = [];
  const universalFilters = ["organization_id=?1"];
  const universalValues: unknown[] = [organizationId];
  const addUniversal = (sql: string, value: unknown) => {
    universalValues.push(value);
    universalFilters.push(sql.replace("?", `?${universalValues.length}`));
  };
  if (gameType) addUniversal("game_type=?", gameType);
  if (onlyArchived) addUniversal("editorial_status=?", ContentStatus.ARCHIVED);
  else if (status && Object.values(ContentStatus).includes(status as ContentStatus)) addUniversal("editorial_status=?", status);
  if (difficulty) addUniversal("difficulty=?", difficulty);
  if (category) addUniversal("category=?", category);
  if (reference) addUniversal("biblical_reference LIKE ?", `%${reference}%`);
  if (tag) addUniversal("tags_json LIKE ?", `%"${tag.replaceAll("\"", "\\\"")}"%`);
  if (book) addUniversal("payload_json LIKE ?", `%"book":"${book.replaceAll("\"", "\\\"")}"%`);
  if (q) {
    universalValues.push(`%${q}%`);
    universalFilters.push(`(payload_json LIKE ?${universalValues.length} OR biblical_reference LIKE ?${universalValues.length} OR category LIKE ?${universalValues.length})`);
  }
  const count = await env.DB.prepare(`SELECT COUNT(*) total FROM content_items WHERE ${universalFilters.join(" AND ")}`)
    .bind(...universalValues).first<{ total: number }>();
  universalTotal = Number(count?.total || 0);
  const rowValues = [...universalValues, fetchLimit];
  const rows = await env.DB.prepare(
    `SELECT * FROM content_items WHERE ${universalFilters.join(" AND ")} ORDER BY updated_at DESC,id LIMIT ?${rowValues.length}`,
  ).bind(...rowValues).all<Record<string, unknown>>();
  universalItems = rows.results.map(row => {
      let payload: Record<string, unknown> = {};
      let tags: string[] = [];
      try { payload = JSON.parse(String(row.payload_json)); } catch { payload = {}; }
      try { tags = JSON.parse(String(row.tags_json)); } catch { tags = []; }
      const schema = getContentSchema(String(row.game_type));
      const titleField = schema?.fields.find(field => typeof payload[field.key] === "string" && String(payload[field.key]).trim());
      const id = String(row.id);
      return {
        id,
        source: "UNIVERSAL_CMS",
        gameType: String(row.game_type) as GameType,
        title: titleField ? String(payload[titleField.key]) : schema?.label || "Rascunho universal",
        biblicalReference: typeof row.biblical_reference === "string" ? row.biblical_reference : null,
        book: typeof payload.book === "string" ? payload.book : null,
        category: String(row.category),
        difficulty: String(row.difficulty) as Difficulty,
        status: Object.values(ContentStatus).includes(String(row.editorial_status) as ContentStatus)
          ? String(row.editorial_status) as ContentStatus : ContentStatus.DRAFT,
        version: Number(row.version),
        updatedAt: Number(row.updated_at),
        timesUsed: 0,
        tags: tags.filter(value => typeof value === "string").map(label => ({ id: label, label })),
        indicators: ["Conteúdo editorial persistido", "Integração com o jogo pendente"],
        links: {
          edit: `/admin/conteudo/editor?id=${encodeURIComponent(id)}`,
          review: null,
          history: `/api/admin/content/${encodeURIComponent(id)}/versions`,
        },
      };
  });

  const cmsFacets = (await env.DB.prepare(
    "SELECT DISTINCT category,tags_json,payload_json FROM content_items WHERE organization_id=?1 ORDER BY category",
  ).bind(organizationId).all<{ category: string; tags_json: string; payload_json: string }>()).results;
  const safeArray = (value: string) => {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter(item => typeof item === "string") : []; }
    catch { return []; }
  };
  const payloadBook = (value: string) => {
    try { const parsed = JSON.parse(value); return typeof parsed.book === "string" ? parsed.book : null; }
    catch { return null; }
  };
  const combined = universalItems
    .sort((left, right) => right.updatedAt - left.updatedAt || left.id.localeCompare(right.id));
  const offset = (page - 1) * pageSize;
  const total = universalTotal;
  const unique = (values: (string | null | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))];
  return {
    items: combined.slice(offset, offset + pageSize),
    facets: {
      categories: unique(cmsFacets.map(row => row.category)),
      books: unique(cmsFacets.map(row => payloadBook(row.payload_json))),
      tags: unique([
        ...cmsFacets.flatMap(row => safeArray(row.tags_json)),
      ]),
      difficulties: Object.values(Difficulty),
      statuses: Object.values(ContentStatus),
      sources: ["UNIVERSAL_CMS"],
    },
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), hasMore: page * pageSize < total },
    totals: dashboard,
  };
}
