import { Difficulty, type Difficulty as DifficultyValue } from "../../shared/content";
import type { AppEnv } from "./auth";
import { listEligibleUniversalContent } from "./universal-eligible-content-catalog";
import { getGameGenerationCapability } from "./universal-game-generation-capabilities";
import {
  GeneratedSelectionStatus,
  type DifficultyDistribution,
  type GeneratedGameSelection,
  type GeneratedSelectionItem,
  type GenerationFailure,
  type UniversalGameSelectionRequest,
} from "./universal-game-generation-contract";
import {
  type UniversalLibraryEntry,
} from "./universal-content-library";
import { sha256 } from "./security";

const difficultyOrder = Object.values(Difficulty);
const normalizedTexts = (values: readonly string[] | undefined) =>
  [...new Set((values ?? [])
    .map(value => value.normalize("NFKC").trim().toLocaleLowerCase("pt-BR"))
    .filter(Boolean))]
    .sort();
const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]));
  }
  return value;
};
const stableJson = (value: unknown) => JSON.stringify(stableValue(value));

type NormalizedRequest = UniversalGameSelectionRequest & {
  selectionKey: string;
  seed: string;
  themes: string[];
  books: string[];
  tags: string[];
  excludeContentIds: string[];
};

function normalizeRequest(request: UniversalGameSelectionRequest) {
  const errors: string[] = [];
  const capability = getGameGenerationCapability(request.gameType);
  if (!capability) errors.push("gameType");
  const selectionKey = request.selectionKey.normalize("NFKC").trim();
  if (!selectionKey || selectionKey.length > 160) errors.push("selectionKey");
  if (!Number.isInteger(request.algorithmVersion) || request.algorithmVersion !== 1) {
    errors.push("algorithmVersion");
  }
  if (!Number.isInteger(request.count) || request.count < 1) errors.push("count");
  if (capability && (
    request.count < capability.minimumContents
    || request.count > capability.maximumContents
    || !capability.supportedModes.includes(request.mode)
  )) errors.push("capability");
  if (request.difficulty && !difficultyOrder.includes(request.difficulty)) errors.push("difficulty");
  if (request.difficulty && request.difficultyDistribution) errors.push("difficultyProfile");
  if (request.expiresAt !== undefined && request.expiresAt !== null && (
    !Number.isSafeInteger(request.expiresAt) || request.expiresAt <= 0
  )) errors.push("expiresAt");
  if (request.difficultyDistribution) {
    const entries = Object.entries(request.difficultyDistribution);
    if (
      entries.length === 0
      || entries.some(([difficulty, weight]) =>
        !difficultyOrder.includes(difficulty as DifficultyValue)
        || typeof weight !== "number"
        || !Number.isFinite(weight)
        || weight <= 0)
    ) errors.push("difficultyDistribution");
  }
  if (errors.length) return { ok: false as const, errors };
  const excludeContentIds = normalizedTexts([
    ...(request.excludeContentIds ?? []),
    ...(request.repetitionWindow?.recentContentIds ?? []),
  ]);
  const logicalSeed = request.seed?.normalize("NFKC").trim()
    || `${request.organizationId}|${request.gameType}|${request.mode}|${selectionKey}|${request.algorithmVersion}`;
  return {
    ok: true as const,
    value: {
      ...request,
      selectionKey,
      seed: logicalSeed,
      themes: normalizedTexts(request.themes),
      books: normalizedTexts(request.books),
      tags: normalizedTexts(request.tags),
      excludeContentIds,
    } satisfies NormalizedRequest,
  };
}

function matchesAny(candidate: readonly string[], requested: readonly string[]) {
  if (requested.length === 0) return true;
  const normalized = new Set(normalizedTexts(candidate));
  return requested.some(value => normalized.has(value));
}

function matchesAll(candidate: readonly string[], requested: readonly string[]) {
  if (requested.length === 0) return true;
  const normalized = new Set(normalizedTexts(candidate));
  return requested.every(value => normalized.has(value));
}

function difficultyCounts(count: number, distribution: DifficultyDistribution) {
  const entries = difficultyOrder
    .map(difficulty => ({ difficulty, weight: distribution[difficulty] ?? 0 }))
    .filter(item => item.weight > 0);
  const totalWeight = entries.reduce((sum, item) => sum + item.weight, 0);
  const allocations = entries.map((item, index) => {
    const exact = count * item.weight / totalWeight;
    return {
      ...item,
      index,
      count: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });
  let remaining = count - allocations.reduce((sum, item) => sum + item.count, 0);
  for (const item of [...allocations].sort((left, right) =>
    right.remainder - left.remainder || left.index - right.index)) {
    if (remaining-- <= 0) break;
    item.count += 1;
  }
  return new Map(allocations.map(item => [item.difficulty, item.count]));
}

async function seededKey(seedHash: string, algorithmVersion: number, candidate: UniversalLibraryEntry) {
  return sha256(
    `${seedHash}|${algorithmVersion}|${candidate.contentId}|${candidate.contentVersion}`,
  );
}

function diversityKey(candidate: UniversalLibraryEntry) {
  return normalizedTexts(candidate.themes)[0]
    ?? normalizedTexts(candidate.books)[0]
    ?? normalizedTexts(candidate.tags)[0]
    ?? "_";
}

async function deterministicDiverseOrder(
  candidates: readonly UniversalLibraryEntry[],
  seedHash: string,
  algorithmVersion: number,
) {
  const keyed = await Promise.all(candidates.map(async candidate => ({
    candidate,
    key: await seededKey(seedHash, algorithmVersion, candidate),
  })));
  const buckets = new Map<string, typeof keyed>();
  for (const item of keyed) {
    const key = diversityKey(item.candidate);
    buckets.set(key, [...(buckets.get(key) ?? []), item]);
  }
  const compare = (left: typeof keyed[number], right: typeof keyed[number]) =>
    right.candidate.priority - left.candidate.priority
    || left.candidate.usageCount - right.candidate.usageCount
    || left.key.localeCompare(right.key)
    || left.candidate.contentId.localeCompare(right.candidate.contentId);
  for (const bucket of buckets.values()) bucket.sort(compare);
  const orderedBuckets = [...buckets.entries()].sort((left, right) =>
    compare(left[1][0], right[1][0]) || left[0].localeCompare(right[0]));
  const result: UniversalLibraryEntry[] = [];
  for (let position = 0; result.length < candidates.length; position += 1) {
    for (const [, bucket] of orderedBuckets) {
      if (bucket[position]) result.push(bucket[position].candidate);
    }
  }
  return result;
}

export async function selectUniversalCandidates(
  candidates: readonly UniversalLibraryEntry[],
  request: UniversalGameSelectionRequest,
) {
  const normalized = normalizeRequest(request);
  if (!normalized.ok) {
    return {
      ok: false as const,
      error: {
        code: "invalid_generation_request",
        details: normalized.errors,
      } satisfies GenerationFailure,
    };
  }
  const value = normalized.value;
  const seedHash = await sha256(value.seed);
  const exclusions = new Set(value.excludeContentIds);
  const filtered = candidates.filter(candidate =>
    candidate.organizationId === value.organizationId
    && candidate.gameType === value.gameType
    && !exclusions.has(candidate.contentId.toLocaleLowerCase("pt-BR"))
    && (!value.difficulty || candidate.difficulty === value.difficulty)
    && matchesAny(candidate.themes, value.themes)
    && matchesAny(candidate.books, value.books)
    && matchesAll(candidate.tags, value.tags));

  const counts = value.difficultyDistribution
    ? difficultyCounts(value.count, value.difficultyDistribution)
    : null;
  const selected: UniversalLibraryEntry[] = [];
  if (counts) {
    for (const difficulty of difficultyOrder) {
      const needed = counts.get(difficulty) ?? 0;
      if (needed === 0) continue;
      const ordered = await deterministicDiverseOrder(
        filtered.filter(candidate => candidate.difficulty === difficulty),
        seedHash,
        value.algorithmVersion,
      );
      selected.push(...ordered.slice(0, needed));
    }
  } else {
    selected.push(...(await deterministicDiverseOrder(
      filtered,
      seedHash,
      value.algorithmVersion,
    )).slice(0, value.count));
  }
  if (selected.length !== value.count) {
    return {
      ok: false as const,
      error: {
        code: "insufficient_eligible_content",
        organizationId: value.organizationId,
        gameType: value.gameType,
        requestedCount: value.count,
        availableCount: filtered.length,
        filters: {
          difficulty: value.difficulty ?? null,
          difficultyDistribution: value.difficultyDistribution ?? null,
          themes: value.themes,
          books: value.books,
          tags: value.tags,
          exclusions: value.excludeContentIds,
        },
      } satisfies GenerationFailure,
    };
  }
  const finalOrder = await Promise.all(selected.map(async candidate => ({
    candidate,
    key: await seededKey(`${seedHash}|final`, value.algorithmVersion, candidate),
  })));
  finalOrder.sort((left, right) =>
    left.key.localeCompare(right.key)
    || left.candidate.contentId.localeCompare(right.candidate.contentId));
  return {
    ok: true as const,
    seedHash,
    normalizedRequest: value,
    candidates: finalOrder.map(item => item.candidate),
  };
}

type SelectionRow = Record<string, unknown>;
const safeJson = <T>(value: unknown, fallback: T): T => {
  try {
    return JSON.parse(String(value ?? "")) as T;
  } catch {
    return fallback;
  }
};

async function findSelection(
  env: AppEnv,
  identity: Pick<UniversalGameSelectionRequest,
    "organizationId" | "gameType" | "mode" | "selectionKey" | "algorithmVersion">,
) {
  const row = await env.DB.prepare(`SELECT * FROM generated_game_selections
    WHERE organization_id=?1 AND game_type=?2 AND mode=?3
      AND selection_key=?4 AND algorithm_version=?5`)
    .bind(
      identity.organizationId,
      identity.gameType,
      identity.mode,
      identity.selectionKey,
      identity.algorithmVersion,
    ).first<SelectionRow>();
  return row ? hydrateSelection(env, row) : null;
}

async function hydrateSelection(env: AppEnv, row: SelectionRow): Promise<GeneratedGameSelection> {
  const items = await env.DB.prepare(`SELECT * FROM generated_game_selection_items
    WHERE selection_id=?1 AND organization_id=?2 ORDER BY position`)
    .bind(String(row.id), String(row.organization_id)).all<Record<string, unknown>>();
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    requestedByUserId: typeof row.requested_by_user_id === "string"
      ? row.requested_by_user_id
      : null,
    gameType: String(row.game_type),
    mode: String(row.mode) as GeneratedGameSelection["mode"],
    selectionKey: String(row.selection_key),
    algorithmVersion: Number(row.algorithm_version),
    seedHash: String(row.seed_hash),
    requestFingerprint: String(row.request_fingerprint),
    status: String(row.status) as GeneratedGameSelection["status"],
    createdAt: Number(row.created_at),
    expiresAt: row.expires_at === null || row.expires_at === undefined
      ? null
      : Number(row.expires_at),
    items: items.results.map(item => ({
      contentId: String(item.content_id),
      contentVersion: Number(item.content_version),
      position: Number(item.position),
      auditMetadata: safeJson<GeneratedSelectionItem["auditMetadata"]>(
        item.audit_metadata_json,
        {
          difficulty: Difficulty.MEDIUM,
          themes: [],
          books: [],
          tags: [],
          priority: 0,
          usageCount: 0,
        },
      ),
    })),
  };
}

export async function findGeneratedSelectionById(
  env: AppEnv,
  organizationId: string,
  selectionId: string,
) {
  const row = await env.DB.prepare(`SELECT * FROM generated_game_selections
    WHERE id=?1 AND organization_id=?2`).bind(selectionId, organizationId).first<SelectionRow>();
  return row ? hydrateSelection(env, row) : null;
}

export async function generateUniversalGameSelection(
  env: AppEnv,
  request: UniversalGameSelectionRequest,
  now = Date.now(),
) {
  const normalized = normalizeRequest(request);
  if (!normalized.ok) {
    return {
      ok: false as const,
      error: {
        code: getGameGenerationCapability(request.gameType)
          ? "invalid_generation_request"
          : "unsupported_game_capability",
        details: normalized.errors,
      } satisfies GenerationFailure,
    };
  }
  const value = normalized.value;
  if (value.expiresAt !== undefined && value.expiresAt !== null && value.expiresAt <= now) {
    return {
      ok: false as const,
      error: {
        code: "invalid_generation_request",
        details: ["expiresAt"],
      } satisfies GenerationFailure,
    };
  }
  if (value.requestedByUserId) {
    const requestingUser = await env.DB.prepare(
      "SELECT id FROM users WHERE id=?1 AND organization_id=?2 AND status='active'",
    ).bind(value.requestedByUserId, value.organizationId).first();
    if (!requestingUser) {
      return {
        ok: false as const,
        error: {
          code: "invalid_generation_request",
          details: ["requestedByUserId"],
        } satisfies GenerationFailure,
      };
    }
  }
  const fingerprint = await sha256(stableJson({
    organizationId: value.organizationId,
    gameType: value.gameType,
    mode: value.mode,
    selectionKey: value.selectionKey,
    algorithmVersion: value.algorithmVersion,
    seedHash: await sha256(value.seed),
    count: value.count,
    difficulty: value.difficulty ?? null,
    difficultyDistribution: value.difficultyDistribution ?? null,
    themes: value.themes,
    books: value.books,
    tags: value.tags,
    exclusions: value.excludeContentIds,
    expiresAt: value.expiresAt ?? null,
  }));
  const existing = await findSelection(env, value);
  if (existing) {
    return existing.requestFingerprint === fingerprint
      ? { ok: true as const, selection: existing, reused: true as const }
      : {
        ok: false as const,
        error: {
          code: "selection_key_conflict",
          selectionId: existing.id,
        } satisfies GenerationFailure,
      };
  }
  const catalog = await listEligibleUniversalContent(env, {
    organizationId: value.organizationId,
    gameType: value.gameType,
    limit: 200,
  });
  const selected = await selectUniversalCandidates(catalog, value);
  if (!selected.ok) return selected;
  const selectionId = `selection_${(await sha256(
    `${value.organizationId}|${value.gameType}|${value.mode}|${value.selectionKey}|${value.algorithmVersion}`,
  )).slice(0, 32)}`;
  const filters = {
    count: value.count,
    difficulty: value.difficulty ?? null,
    difficultyDistribution: value.difficultyDistribution ?? null,
    themes: value.themes,
    books: value.books,
    tags: value.tags,
    exclusions: value.excludeContentIds,
  };
  const itemStatements = selected.candidates.map((candidate, index) =>
    env.DB.prepare(`INSERT INTO generated_game_selection_items(
      selection_id,organization_id,content_id,content_version,position,audit_metadata_json,created_at
    ) VALUES(
      ?1,
      ?2,
      (
        SELECT item.id FROM content_items item
        JOIN universal_content_library library
          ON library.organization_id=item.organization_id AND library.content_id=item.id
        WHERE item.id=?3 AND item.organization_id=?2 AND item.version=?4
          AND item.status='PUBLISHED'
          AND library.content_version=?4
          AND library.availability_status='AVAILABLE'
          AND EXISTS(
            SELECT 1 FROM generated_game_selections
            WHERE id=?1 AND organization_id=?2 AND request_fingerprint=?8
          )
      ),
      ?4,?5,?6,?7
    )`)
      .bind(
        selectionId,
        value.organizationId,
        candidate.contentId,
        candidate.contentVersion,
        index + 1,
        JSON.stringify({
          difficulty: candidate.difficulty,
          themes: candidate.themes,
          books: candidate.books,
          tags: candidate.tags,
          priority: candidate.priority,
          usageCount: candidate.usageCount,
        }),
        now,
        fingerprint,
      ));
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO generated_game_selections(
        id,organization_id,requested_by_user_id,game_type,mode,selection_key,algorithm_version,
        seed_hash,request_fingerprint,status,filters_json,created_at,expires_at
      ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,'ACTIVE',?10,?11,?12)`)
        .bind(
          selectionId,
          value.organizationId,
          value.requestedByUserId ?? null,
          value.gameType,
          value.mode,
          value.selectionKey,
          value.algorithmVersion,
          selected.seedHash,
          fingerprint,
          JSON.stringify(filters),
          now,
          value.expiresAt ?? null,
        ),
      ...itemStatements,
    ]);
  } catch {
    const concurrent = await findSelection(env, value);
    if (concurrent?.requestFingerprint === fingerprint) {
      return { ok: true as const, selection: concurrent, reused: true as const };
    }
    if (concurrent) {
      return {
        ok: false as const,
        error: {
          code: "selection_key_conflict",
          selectionId: concurrent.id,
        } satisfies GenerationFailure,
      };
    }
    throw new Error("universal_game_selection_persistence_failed");
  }
  const selection = await findGeneratedSelectionById(env, value.organizationId, selectionId);
  if (!selection || selection.status !== GeneratedSelectionStatus.ACTIVE) {
    throw new Error("universal_game_selection_persistence_failed");
  }
  return { ok: true as const, selection, reused: false as const };
}
