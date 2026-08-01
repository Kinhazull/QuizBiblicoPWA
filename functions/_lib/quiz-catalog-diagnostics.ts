import {
  ContentStatus,
  Difficulty,
  GameType,
  validateContent,
  type ContentValidationIssue,
} from "../../shared/content";
import type { AppEnv } from "./auth";

const reasonCodes = [
  "missing_library_projection",
  "unavailable_library_status",
  "game_type_mismatch",
  "version_mismatch",
  "cms_not_published",
  "invalid_metadata",
  "invalid_payload",
  "invalid_biblical_reference",
  "invalid_difficulty",
  "insufficient_choices",
  "duplicate_choices",
  "invalid_correct_answer_count",
  "unknown_reason",
] as const;

type ReasonCode = typeof reasonCodes[number];
type Row = Record<string, unknown>;

const safeJson = <T>(value: unknown, fallback: T): T => {
  try { return JSON.parse(String(value ?? "")) as T; } catch { return fallback; }
};

function metadata(row: Row) {
  return {
    id: String(row.id),
    gameType: String(row.game_type),
    category: String(row.category ?? ""),
    tags: safeJson<string[]>(row.tags_json, []),
    difficulty: String(row.difficulty),
    biblicalReference: typeof row.biblical_reference === "string" ? row.biblical_reference : null,
    status: String(row.status),
    authorId: String(row.author_id ?? ""),
    reviewerId: typeof row.reviewer_id === "string" ? row.reviewer_id : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    version: Number(row.version),
    internalNotes: typeof row.internal_notes === "string" ? row.internal_notes : null,
  };
}

function validationReason(issues: readonly ContentValidationIssue[]): ReasonCode {
  const has = (field: string, code?: string) => issues.some(issue =>
    issue.field === field || issue.field.startsWith(`${field}.`)
      ? code === undefined || issue.code === code
      : false);
  if (has("metadata.biblicalReference")) return "invalid_biblical_reference";
  if (has("metadata.difficulty")) return "invalid_difficulty";
  if (has("choices", "minimum_items") || has("choices", "maximum_items")) return "insufficient_choices";
  if (has("choices", "duplicate_items")) return "duplicate_choices";
  if (has("choices", "invalid_correct_count")) return "invalid_correct_answer_count";
  if (issues.some(issue => issue.field.startsWith("metadata."))) return "invalid_metadata";
  if (issues.some(issue => !issue.field.startsWith("metadata."))) return "invalid_payload";
  return "unknown_reason";
}

function primaryIssue(issues: readonly ContentValidationIssue[]) {
  const issue = issues[0];
  return issue ? { code: issue.code, field: issue.field } : { code: "unknown", field: "unknown" };
}

function difficultyCounts(rows: readonly Row[]) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const difficulty = String(row.difficulty || "UNKNOWN");
    counts[difficulty] = (counts[difficulty] ?? 0) + 1;
  }
  return counts;
}

const dailySatisfied = (counts: Record<string, number>) =>
  (counts[Difficulty.EASY] ?? 0) >= 2
  && (counts[Difficulty.MEDIUM] ?? 0) >= 2
  && (counts[Difficulty.HARD] ?? 0) >= 1;

function automaticConclusion(input: {
  cmsPublished: number;
  libraryTotal: number;
  available: number;
  versionMismatches: number;
  eligible: number;
  failedValidation: number;
  first200Daily: boolean;
  completeDaily: boolean;
}) {
  if (input.cmsPublished > 0 && input.libraryTotal === 0) return "library_not_populated";
  if (input.libraryTotal > 0 && input.available === 0) return "library_not_available";
  if (input.versionMismatches > 0) return "version_mismatch";
  if (input.failedValidation > 0 && input.eligible === 0) return "schema_registry_failure";
  if (input.eligible >= 5 && input.completeDaily && !input.first200Daily) return "first_200_affects_daily_only";
  if (input.eligible >= 5) return "eligible_catalog_generator_failure";
  return "no_inconsistency_detected";
}

export async function loadQuizCatalogDiagnostics(env: AppEnv, organizationId: string) {
  const [cmsResult, libraryResult] = await Promise.all([
    env.DB.prepare(`SELECT id,game_type,status,category,difficulty,biblical_reference,tags_json,
        payload_json,version,author_id,reviewer_id,created_at,updated_at,internal_notes
      FROM content_items WHERE organization_id=?1 AND game_type=?2 ORDER BY id`)
      .bind(organizationId, GameType.QUIZ).all<Row>(),
    env.DB.prepare(`SELECT organization_id,content_id,game_type,content_version,difficulty,
        availability_status,priority,usage_count,last_used_at,first_published_at
      FROM universal_content_library WHERE organization_id=?1 ORDER BY content_id`)
      .bind(organizationId).all<Row>(),
  ]);
  const cmsRows = cmsResult.results;
  const publishedRows = cmsRows.filter(row => row.status === ContentStatus.PUBLISHED);
  const libraryRows = libraryResult.results;
  const libraryByContent = new Map(libraryRows.map(row => [String(row.content_id), row]));
  const availability: Record<string, number> = {};
  for (const row of libraryRows.filter(row => row.game_type === GameType.QUIZ)) {
    const status = String(row.availability_status || "UNKNOWN");
    availability[status] = (availability[status] ?? 0) + 1;
  }

  const reasons = Object.fromEntries(reasonCodes.map(code => [code, 0])) as Record<ReasonCode, number>;
  const examples: Array<Record<string, unknown>> = [];
  const eligible: Row[] = [];
  let contentIdMatches = 0;
  let gameTypeMatches = 0;
  let versionMatches = 0;
  let publishedAvailable = 0;
  let failedValidation = 0;

  for (const row of cmsRows) {
    const library = libraryByContent.get(String(row.id));
    let reason: ReasonCode | null = null;
    let issues: readonly ContentValidationIssue[] = [];
    if (library) {
      contentIdMatches += 1;
      if (library.game_type === row.game_type) gameTypeMatches += 1;
      if (Number(library.content_version) === Number(row.version)) versionMatches += 1;
      if (row.status === ContentStatus.PUBLISHED && library.availability_status === "AVAILABLE") {
        publishedAvailable += 1;
      }
    }
    if (row.status !== ContentStatus.PUBLISHED) reason = "cms_not_published";
    else if (!library) reason = "missing_library_projection";
    else {
      if (library.game_type !== row.game_type) reason = "game_type_mismatch";
      else {
        if (Number(library.content_version) !== Number(row.version)) reason = "version_mismatch";
        else {
          if (library.availability_status !== "AVAILABLE") reason = "unavailable_library_status";
          else {
            const validation = validateContent(GameType.QUIZ, metadata(row), safeJson(row.payload_json, null));
            issues = validation.errors;
            if (!validation.valid) {
              failedValidation += 1;
              reason = validationReason(issues);
            } else eligible.push({ ...row, ...library });
          }
        }
      }
    }
    if (reason) {
      reasons[reason] += 1;
      if (examples.length < 10) {
        const issue = primaryIssue(issues);
        examples.push({
          contentId: String(row.id),
          cmsVersion: Number(row.version),
          libraryVersion: library ? Number(library.content_version) : null,
          difficulty: String(row.difficulty || "UNKNOWN"),
          status: String(row.status),
          errorCode: issues.length ? issue.code : reason,
          invalidField: issues.length ? issue.field : null,
        });
      }
    }
  }

  const orderedLibraryWindow = libraryRows
    .filter(row => row.game_type === GameType.QUIZ && row.availability_status === "AVAILABLE")
    .sort((left, right) =>
      Number(right.priority) - Number(left.priority)
      || Number(left.usage_count) - Number(right.usage_count)
      || Number(left.last_used_at ?? Number.MIN_SAFE_INTEGER) - Number(right.last_used_at ?? Number.MIN_SAFE_INTEGER)
      || Number(left.first_published_at) - Number(right.first_published_at)
      || String(left.content_id).localeCompare(String(right.content_id)))
    .slice(0, 200);
  const eligibleIds = new Set(eligible.map(row => String(row.id)));
  const first200Eligible = orderedLibraryWindow.filter(row => eligibleIds.has(String(row.content_id)));
  const eligibleDistribution = difficultyCounts(eligible);
  const first200Distribution = difficultyCounts(first200Eligible);
  const availableQuiz = availability.AVAILABLE ?? 0;

  return {
    generatedAt: Date.now(),
    cms: { published: publishedRows.length, totalQuiz: cmsRows.length },
    library: {
      total: libraryRows.filter(row => row.game_type === GameType.QUIZ).length,
      byAvailabilityStatus: availability,
    },
    crossCheck: { contentIdMatches, gameTypeMatches, versionMatches, publishedAvailable },
    eligibleCatalog: {
      total: eligible.length,
      byDifficulty: eligibleDistribution,
      failedSchemaValidation: failedValidation,
    },
    exclusions: { reasons, examples },
    generatorWindow: {
      limit: 200,
      libraryCandidates: orderedLibraryWindow.length,
      eligible: first200Eligible.length,
      byDifficulty: first200Distribution,
      satisfiesDailyDistribution: dailySatisfied(first200Distribution),
      completeCatalogSatisfiesDailyDistribution: dailySatisfied(eligibleDistribution),
    },
    conclusion: automaticConclusion({
      cmsPublished: publishedRows.length,
      libraryTotal: libraryRows.filter(row => row.game_type === GameType.QUIZ).length,
      available: availableQuiz,
      versionMismatches: reasons.version_mismatch,
      eligible: eligible.length,
      failedValidation,
      first200Daily: dailySatisfied(first200Distribution),
      completeDaily: dailySatisfied(eligibleDistribution),
    }),
  };
}
