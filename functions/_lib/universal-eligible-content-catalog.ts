import {
  ContentStatus,
  validateContent,
  type GameType,
} from "../../shared/content";
import type { AppEnv } from "./auth";
import {
  LibraryAvailabilityStatus,
  listUniversalLibrary,
  type UniversalLibraryFilters,
} from "./universal-content-library";

const safeStrings = (value: unknown) => {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === "string") : [];
  } catch {
    return [];
  }
};

export async function listEligibleUniversalContent(
  env: AppEnv,
  filters: Omit<UniversalLibraryFilters, "availabilityStatus">,
) {
  const candidates = await listUniversalLibrary(env, {
    ...filters,
    availabilityStatus: LibraryAvailabilityStatus.AVAILABLE,
  });
  if (candidates.length === 0) return [];

  const placeholders = candidates.map((_, index) => `?${index + 2}`).join(",");
  const contentRows = await env.DB.prepare(`SELECT * FROM content_items
    WHERE organization_id=?1 AND status='PUBLISHED' AND id IN (${placeholders})`)
    .bind(filters.organizationId, ...candidates.map(candidate => candidate.contentId))
    .all<Record<string, unknown>>();
  const rowsById = new Map(contentRows.results.map(row => [String(row.id), row]));

  return candidates.filter(candidate => {
    const row = rowsById.get(candidate.contentId);
    if (
      !row
      || String(row.game_type) !== candidate.gameType
      || Number(row.version) !== candidate.contentVersion
    ) return false;
    const metadata = {
      id: String(row.id),
      gameType: String(row.game_type) as GameType,
      category: String(row.category),
      tags: safeStrings(row.tags_json),
      difficulty: String(row.difficulty),
      biblicalReference: typeof row.biblical_reference === "string" ? row.biblical_reference : null,
      status: ContentStatus.PUBLISHED,
      authorId: String(row.author_id),
      reviewerId: typeof row.reviewer_id === "string" ? row.reviewer_id : null,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      version: Number(row.version),
      internalNotes: typeof row.internal_notes === "string" ? row.internal_notes : null,
    };
    try {
      return validateContent(
        candidate.gameType,
        metadata,
        JSON.parse(String(row.payload_json)),
      ).valid;
    } catch {
      return false;
    }
  });
}
