import {
  type Difficulty,
} from "../../shared/content";
import type { AppEnv } from "./auth";
import type { PersistedUniversalContent } from "./universal-content-store";

export const LibraryAvailabilityStatus = {
  AVAILABLE: "AVAILABLE",
  RESERVED_DAILY: "RESERVED_DAILY",
  RESERVED_EVENT: "RESERVED_EVENT",
  ARCHIVED: "ARCHIVED",
} as const;
export type LibraryAvailabilityStatus =
  typeof LibraryAvailabilityStatus[keyof typeof LibraryAvailabilityStatus];

export const LibraryOrder = {
  PRIORITY: "priority",
  LEAST_USED: "least_used",
  PUBLICATION_NEWEST: "publication_newest",
  PUBLICATION_OLDEST: "publication_oldest",
} as const;
export type LibraryOrder = typeof LibraryOrder[keyof typeof LibraryOrder];

export type UniversalLibraryEntry = {
  organizationId: string;
  gameType: string;
  contentId: string;
  contentVersion: number;
  difficulty: Difficulty;
  themes: string[];
  books: string[];
  tags: string[];
  priority: number;
  usageCount: number;
  lastUsedAt: number | null;
  lastUsedMode: string | null;
  firstPublishedAt: number;
  availabilityStatus: LibraryAvailabilityStatus;
  createdAt: number;
  updatedAt: number;
};

export type UniversalLibraryFilters = {
  organizationId: string;
  gameType?: string;
  difficulty?: Difficulty;
  theme?: string;
  availabilityStatus?: LibraryAvailabilityStatus;
  order?: LibraryOrder;
  limit?: number;
};

type LibraryRow = Record<string, unknown>;
const safeStrings = (value: unknown) => {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === "string") : [];
  } catch {
    return [];
  }
};
const unique = (values: readonly (string | null | undefined)[]) =>
  [...new Set(values.map(value => value?.normalize("NFKC").trim()).filter(Boolean) as string[])];

function extractBook(reference: string | null) {
  if (!reference) return null;
  const normalized = reference.normalize("NFKC").trim();
  const match = normalized.match(/^(.+?)(?=\s+\d+(?::\d+)?(?:[-–]\d+)?(?:\s|$))/u);
  return (match?.[1] ?? normalized).trim() || null;
}

export function contentLibraryMetadata(content: PersistedUniversalContent) {
  const theme = typeof content.payload.theme === "string" ? content.payload.theme : null;
  const book = typeof content.payload.book === "string" ? content.payload.book : null;
  return {
    themes: unique([theme, content.category]),
    books: unique([book, extractBook(content.biblicalReference)]),
    tags: unique(content.tags),
  };
}

export function rowToUniversalLibraryEntry(row: LibraryRow): UniversalLibraryEntry {
  return {
    organizationId: String(row.organization_id),
    gameType: String(row.game_type),
    contentId: String(row.content_id),
    contentVersion: Number(row.content_version),
    difficulty: String(row.difficulty) as Difficulty,
    themes: safeStrings(row.themes_json),
    books: safeStrings(row.books_json),
    tags: safeStrings(row.tags_json),
    priority: Number(row.priority),
    usageCount: Number(row.usage_count),
    lastUsedAt: row.last_used_at === null || row.last_used_at === undefined
      ? null
      : Number(row.last_used_at),
    lastUsedMode: typeof row.last_used_mode === "string" ? row.last_used_mode : null,
    firstPublishedAt: Number(row.first_published_at),
    availabilityStatus: String(row.availability_status) as LibraryAvailabilityStatus,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function preparePublishedContentLibrarySync(
  env: AppEnv,
  content: PersistedUniversalContent,
  nextVersion: number,
  now: number,
) {
  const metadata = contentLibraryMetadata(content);
  return env.DB.prepare(`INSERT INTO universal_content_library(
      organization_id,content_id,game_type,content_version,difficulty,themes_json,books_json,tags_json,
      priority,usage_count,last_used_at,last_used_mode,first_published_at,availability_status,created_at,updated_at
    )
    SELECT ?1,?2,?3,?4,?5,?6,?7,?8,0,0,NULL,NULL,?9,'AVAILABLE',?9,?9
    WHERE EXISTS(
      SELECT 1 FROM content_items
      WHERE id=?2 AND organization_id=?1 AND version=?4 AND status='PUBLISHED'
    )
    ON CONFLICT(organization_id,content_id) DO UPDATE SET
      game_type=excluded.game_type,
      content_version=excluded.content_version,
      difficulty=excluded.difficulty,
      themes_json=excluded.themes_json,
      books_json=excluded.books_json,
      tags_json=excluded.tags_json,
      availability_status='AVAILABLE',
      updated_at=excluded.updated_at`)
    .bind(
      content.organizationId,
      content.id,
      content.gameType,
      nextVersion,
      content.difficulty,
      JSON.stringify(metadata.themes),
      JSON.stringify(metadata.books),
      JSON.stringify(metadata.tags),
      now,
    );
}

export function prepareDraftContentLibrarySync(
  env: AppEnv,
  content: PersistedUniversalContent,
  nextVersion: number,
  now: number,
) {
  return env.DB.prepare(`UPDATE universal_content_library
    SET content_version=?1,availability_status='ARCHIVED',updated_at=?2
    WHERE organization_id=?3 AND content_id=?4
      AND EXISTS(
        SELECT 1 FROM content_items
        WHERE id=?4 AND organization_id=?3 AND version=?1 AND status='DRAFT'
      )`)
    .bind(nextVersion, now, content.organizationId, content.id);
}

const orderSql: Record<LibraryOrder, string> = {
  priority: "priority DESC,usage_count ASC,last_used_at ASC,first_published_at ASC,content_id",
  least_used: "usage_count ASC,last_used_at ASC,first_published_at ASC,content_id",
  publication_newest: "first_published_at DESC,content_id",
  publication_oldest: "first_published_at ASC,content_id",
};

export async function listUniversalLibrary(env: AppEnv, filters: UniversalLibraryFilters) {
  const where = ["organization_id=?1"];
  const bindings: unknown[] = [filters.organizationId];
  const bind = (value: unknown) => {
    bindings.push(value);
    return `?${bindings.length}`;
  };
  if (filters.gameType) where.push(`game_type=${bind(filters.gameType)}`);
  if (filters.difficulty) where.push(`difficulty=${bind(filters.difficulty)}`);
  if (filters.availabilityStatus) {
    where.push(`availability_status=${bind(filters.availabilityStatus)}`);
  }
  if (filters.theme) {
    where.push(`EXISTS(
      SELECT 1 FROM json_each(universal_content_library.themes_json)
      WHERE lower(value)=lower(${bind(filters.theme.normalize("NFKC").trim())})
    )`);
  }
  const limit = Math.max(1, Math.min(200, Math.trunc(filters.limit ?? 50)));
  bindings.push(limit);
  const order = orderSql[filters.order ?? LibraryOrder.PRIORITY];
  const result = await env.DB.prepare(
    `SELECT * FROM universal_content_library
     WHERE ${where.join(" AND ")}
     ORDER BY ${order}
     LIMIT ?${bindings.length}`,
  ).bind(...bindings).all<LibraryRow>();
  return result.results.map(rowToUniversalLibraryEntry);
}

export async function recordUniversalLibraryUsage(
  env: AppEnv,
  identity: { organizationId: string; contentId: string; contentVersion: number },
  mode: string,
  usedAt = Date.now(),
) {
  const normalizedMode = mode.normalize("NFKC").trim();
  if (!normalizedMode || normalizedMode.length > 60) {
    throw new Error("invalid_library_usage_mode");
  }
  const result = await env.DB.prepare(`UPDATE universal_content_library
    SET usage_count=usage_count+1,last_used_at=?1,last_used_mode=?2,updated_at=?1
    WHERE organization_id=?3 AND content_id=?4 AND content_version=?5
      AND availability_status='AVAILABLE'`)
    .bind(
      usedAt,
      normalizedMode,
      identity.organizationId,
      identity.contentId,
      identity.contentVersion,
    ).run();
  return { updated: Number(result.meta.changes ?? 0) === 1 };
}
