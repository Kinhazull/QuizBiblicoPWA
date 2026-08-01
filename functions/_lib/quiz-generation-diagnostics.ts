import { ContentStatus, Difficulty, GameType, validateContent } from "../../shared/content";
import { GameMode, getModeCapability } from "../../shared/game-modes";
import type { AppEnv } from "./auth";
import { generatedSelectionSafePayload, organizationDayKey, dailySeed, dailySelectionKey } from "./platform-daily-objectives";
import { getGameGenerationCapability } from "./universal-game-generation-capabilities";
import { GameGenerationMode, type GeneratedGameSelection, type UniversalGameSelectionRequest } from "./universal-game-generation-contract";
import { selectUniversalCandidates } from "./universal-game-generator";
import { listEligibleUniversalContent } from "./universal-eligible-content-catalog";
import { sha256 } from "./security";

type Row = Record<string, unknown>;
const QUIZ_COUNT = 5;
const ALGORITHM_VERSION = 1;
const FREE_PLAY_DIAGNOSTIC_KEY = "diagnostic-preview";
const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

const safeJson = <T>(value: unknown, fallback: T): T => {
  try { return JSON.parse(String(value ?? "")) as T; } catch { return fallback; }
};
const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]),
  );
  return value;
};
const stableJson = (value: unknown) => JSON.stringify(stableValue(value));
const normalizedTexts = (values: readonly string[]) => [...new Set(values
  .map(value => value.normalize("NFKC").trim().toLocaleLowerCase("pt-BR"))
  .filter(Boolean))].sort();

function nextOrganizationDayStart(at: number, timeZone: string) {
  const current = organizationDayKey(at, timeZone);
  let high = at + 60 * 60 * 1000;
  while (organizationDayKey(high, timeZone) === current && high < at + 32 * 60 * 60 * 1000) {
    high += 60 * 60 * 1000;
  }
  let low = high - 60 * 60 * 1000;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (organizationDayKey(middle, timeZone) === current) low = middle;
    else high = middle;
  }
  return high;
}

function distribution(rows: readonly { difficulty: string }[]) {
  const result: Record<string, number> = {};
  for (const row of rows) result[row.difficulty] = (result[row.difficulty] ?? 0) + 1;
  return result;
}

async function expectedFingerprint(request: UniversalGameSelectionRequest) {
  return sha256(stableJson({
    organizationId: request.organizationId,
    gameType: request.gameType,
    mode: request.mode,
    selectionKey: request.selectionKey,
    algorithmVersion: request.algorithmVersion,
    seedHash: await sha256(String(request.seed ?? "")),
    count: request.count,
    difficulty: request.difficulty ?? null,
    difficultyDistribution: request.difficultyDistribution ?? null,
    themes: request.themes ?? [],
    books: request.books ?? [],
    tags: request.tags ?? [],
    exclusions: normalizedTexts([
      ...(request.excludeContentIds ?? []),
      ...(request.repetitionWindow?.recentContentIds ?? []),
    ]),
    expiresAt: request.expiresAt ?? null,
  }));
}

function stage(code: string | null, historicalValid = true) {
  if (code === "invalid_generation_request" || code === "unsupported_game_capability") return "capability_validation";
  if (code === "selection_key_conflict") return "selection_identity";
  if (code === "insufficient_eligible_content") return "candidate_selection";
  if (!historicalValid) return "historical_resolution";
  return code ? "unknown" : "ready_to_persist";
}

const explanations: Record<string, string> = {
  invalid_generation_request: "Os parâmetros reais não são aceitos pela capacidade registrada do Quiz.",
  unsupported_game_capability: "O Quiz não possui capacidade registrada para este modo.",
  selection_key_conflict: "A mesma chave lógica já representa uma solicitação diferente.",
  insufficient_eligible_content: "Os candidatos restantes não satisfazem a quantidade ou distribuição solicitada.",
  historical_content_unavailable: "Um item selecionável não possui a versão histórica necessária.",
  historical_content_invalid: "A versão histórica existe, mas não passa pelo contrato atual do Quiz.",
  incomplete_selection: "Uma seleção persistida possui quantidade de itens diferente da solicitada.",
  participation_conflict: "Existe participação incompatível com a seleção ou com seu modo.",
};

async function historicalCheck(env: AppEnv, organizationId: string, candidates: readonly {
  contentId: string; contentVersion: number;
}[], seedHash: string) {
  const contents: Array<{ id: string; version: number; metadata: Record<string, unknown>; payload: Record<string, unknown> }> = [];
  let missing = 0;
  let invalid = 0;
  for (const candidate of candidates.slice(0, QUIZ_COUNT)) {
    const row = await env.DB.prepare(`SELECT metadata_json,payload_json FROM content_versions
      WHERE organization_id=?1 AND content_id=?2 AND version=?3`)
      .bind(organizationId, candidate.contentId, candidate.contentVersion).first<Row>();
    if (!row) { missing += 1; continue; }
    const metadata = safeJson<Record<string, unknown>>(row.metadata_json, {});
    const payload = safeJson<Record<string, unknown>>(row.payload_json, {});
    if (metadata.status !== ContentStatus.PUBLISHED
      || metadata.gameType !== GameType.QUIZ
      || !validateContent(GameType.QUIZ, metadata, payload).valid) {
      invalid += 1;
      continue;
    }
    contents.push({ id: candidate.contentId, version: candidate.contentVersion, metadata, payload });
  }
  let safePayloadCreatable = false;
  if (contents.length === Math.min(QUIZ_COUNT, candidates.length) && contents.length > 0) {
    const selection = {
      id: "diagnostic-only", organizationId, requestedByUserId: null, gameType: GameType.QUIZ,
      mode: GameGenerationMode.INTERNAL_TEST, selectionKey: "diagnostic-only",
      algorithmVersion: ALGORITHM_VERSION, seedHash, requestFingerprint: "diagnostic-only",
      status: "ACTIVE", createdAt: 0, expiresAt: null,
      items: candidates.slice(0, contents.length).map((candidate, index) => ({
        ...candidate, position: index + 1,
        auditMetadata: { difficulty: Difficulty.MEDIUM, themes: [], books: [], tags: [], priority: 0, usageCount: 0 },
      })),
    } as GeneratedGameSelection;
    const payload = await generatedSelectionSafePayload(selection, contents);
    safePayloadCreatable = Array.isArray((payload as { questions?: unknown[] }).questions);
  }
  return { sampled: Math.min(QUIZ_COUNT, candidates.length), resolved: contents.length, missing, invalid, safePayloadCreatable };
}

export async function loadQuizGenerationDiagnostics(
  env: AppEnv,
  identity: { organizationId: string; userId: string },
  now = Date.now(),
) {
  const capability = getGameGenerationCapability(GameType.QUIZ);
  const freeMode = getModeCapability(GameMode.FREE_PLAY);
  const catalog = await listEligibleUniversalContent(env, {
    organizationId: identity.organizationId, gameType: GameType.QUIZ, limit: 200,
  });
  const recentRows = await env.DB.prepare(`SELECT usage.content_id
    FROM generated_game_participation_usage usage
    JOIN generated_game_participations participation ON participation.id=usage.participation_id
    WHERE participation.organization_id=?1 AND participation.user_id=?2
      AND participation.game_type=?3 AND participation.mode='FREE_PLAY'
      AND usage.recorded_at IS NOT NULL
    ORDER BY usage.recorded_at DESC LIMIT 20`)
    .bind(identity.organizationId, identity.userId, GameType.QUIZ).all<Row>();
  const recentIds = [...new Set(recentRows.results.map(row => String(row.content_id)))];
  const freeRequest: UniversalGameSelectionRequest = {
    organizationId: identity.organizationId,
    requestedByUserId: identity.userId,
    gameType: GameType.QUIZ,
    mode: GameGenerationMode.FREE_PLAY,
    selectionKey: `free:${identity.userId}:${FREE_PLAY_DIAGNOSTIC_KEY}`,
    algorithmVersion: ALGORITHM_VERSION,
    seed: [identity.organizationId, identity.userId, GameType.QUIZ, FREE_PLAY_DIAGNOSTIC_KEY, "v1", JSON.stringify({
      count: QUIZ_COUNT, difficulty: null, theme: null, book: null,
    })].join("|"),
    count: QUIZ_COUNT,
    repetitionWindow: { recentContentIds: recentIds },
  };
  let freeSelection = await selectUniversalCandidates(catalog, freeRequest);
  let repetitionFallbackNeeded = false;
  let effectiveFreeRequest = freeRequest;
  if (!freeSelection.ok && freeSelection.error.code === "insufficient_eligible_content" && recentIds.length) {
    repetitionFallbackNeeded = true;
    effectiveFreeRequest = { ...freeRequest, repetitionWindow: undefined };
    freeSelection = await selectUniversalCandidates(catalog, effectiveFreeRequest);
  }
  const freeExisting = await env.DB.prepare(`SELECT id,request_fingerprint FROM generated_game_selections
    WHERE organization_id=?1 AND game_type=?2 AND mode='FREE_PLAY' AND selection_key=?3 AND algorithm_version=?4`)
    .bind(identity.organizationId, GameType.QUIZ, freeRequest.selectionKey, ALGORITHM_VERSION).first<Row>();
  const freeFingerprint = await expectedFingerprint(effectiveFreeRequest);
  const freeConflict = Boolean(freeExisting && String(freeExisting.request_fingerprint) !== freeFingerprint);
  const freeCandidates = freeSelection.ok ? freeSelection.candidates : [];
  const freeHistory = await historicalCheck(env, identity.organizationId, freeCandidates, freeSelection.ok ? freeSelection.seedHash : "");
  let freeCode = freeConflict ? "selection_key_conflict" : freeSelection.ok ? null : freeSelection.error.code;
  if (!freeCode && freeHistory.missing) freeCode = "historical_content_unavailable";
  if (!freeCode && freeHistory.invalid) freeCode = "historical_content_invalid";

  const organization = await env.DB.prepare("SELECT timezone FROM organizations WHERE id=?1")
    .bind(identity.organizationId).first<Row>();
  const timeZone = String(organization?.timezone || DEFAULT_TIME_ZONE);
  const dayKey = organizationDayKey(now, timeZone);
  const expiresAt = nextOrganizationDayStart(now, timeZone);
  const dailyRequest: UniversalGameSelectionRequest = {
    organizationId: identity.organizationId,
    gameType: GameType.QUIZ,
    mode: GameGenerationMode.DAILY,
    selectionKey: dailySelectionKey(dayKey, GameType.QUIZ),
    algorithmVersion: ALGORITHM_VERSION,
    seed: dailySeed(identity.organizationId, dayKey, GameType.QUIZ),
    count: QUIZ_COUNT,
    difficultyDistribution: { [Difficulty.EASY]: 2, [Difficulty.MEDIUM]: 2, [Difficulty.HARD]: 1 },
    expiresAt,
  };
  const dailySelection = await selectUniversalCandidates(catalog, dailyRequest);
  const expectedDailyFingerprint = await expectedFingerprint(dailyRequest);
  const dailyExisting = await env.DB.prepare(`SELECT * FROM generated_game_selections
    WHERE organization_id=?1 AND game_type=?2 AND mode='DAILY' AND selection_key=?3 AND algorithm_version=?4`)
    .bind(identity.organizationId, GameType.QUIZ, dailyRequest.selectionKey, ALGORITHM_VERSION).first<Row>();
  const dailyItems = dailyExisting ? await env.DB.prepare(`SELECT content_id,content_version,position
    FROM generated_game_selection_items WHERE organization_id=?1 AND selection_id=?2 ORDER BY position`)
    .bind(identity.organizationId, String(dailyExisting.id)).all<Row>() : { results: [] as Row[] };
  const dailyConflict = Boolean(dailyExisting && String(dailyExisting.request_fingerprint) !== expectedDailyFingerprint);
  const dailyCandidates = dailyExisting
    ? dailyItems.results.map(row => ({ contentId: String(row.content_id), contentVersion: Number(row.content_version) }))
    : dailySelection.ok ? dailySelection.candidates : [];
  const dailyHistory = await historicalCheck(env, identity.organizationId, dailyCandidates, dailySelection.ok ? dailySelection.seedHash : String(dailyExisting?.seed_hash ?? ""));
  const dailyPartial = Boolean(dailyExisting && dailyItems.results.length !== QUIZ_COUNT);
  const dailyExpired = Boolean(dailyExisting && (
    String(dailyExisting.status) === "EXPIRED" || Number(dailyExisting.expires_at ?? Number.MAX_SAFE_INTEGER) <= now
  ));
  let dailyCode = dailyConflict ? "selection_key_conflict" : dailyPartial ? "incomplete_selection"
    : dailySelection.ok ? null : dailySelection.error.code;
  if (!dailyCode && dailyHistory.missing) dailyCode = "historical_content_unavailable";
  if (!dailyCode && dailyHistory.invalid) dailyCode = "historical_content_invalid";

  const selections = await env.DB.prepare(`SELECT * FROM generated_game_selections
    WHERE organization_id=?1 AND game_type=?2 ORDER BY created_at DESC`)
    .bind(identity.organizationId, GameType.QUIZ).all<Row>();
  const selectionItems = await env.DB.prepare(`SELECT item.selection_id,item.content_id,item.content_version,item.position,
      content.id AS current_content_id,version.id AS historical_version_id
    FROM generated_game_selection_items item
    JOIN generated_game_selections selection ON selection.id=item.selection_id
    LEFT JOIN content_items content ON content.organization_id=item.organization_id AND content.id=item.content_id
    LEFT JOIN content_versions version ON version.organization_id=item.organization_id
      AND version.content_id=item.content_id AND version.version=item.content_version
    WHERE selection.organization_id=?1 AND selection.game_type=?2`)
    .bind(identity.organizationId, GameType.QUIZ).all<Row>();
  const itemCountBySelection = new Map<string, number>();
  for (const item of selectionItems.results) {
    const id = String(item.selection_id);
    itemCountBySelection.set(id, (itemCountBySelection.get(id) ?? 0) + 1);
  }
  const incompleteSelections = selections.results.filter(row => {
    const filters = safeJson<{ count?: number }>(row.filters_json, {});
    return itemCountBySelection.get(String(row.id)) !== Number(filters.count ?? 0);
  }).length;
  const participations = await env.DB.prepare(`SELECT participation.id,participation.selection_id,
      participation.user_id,participation.mode,participation.status,selection.mode AS selection_mode,
      selection.id AS valid_selection_id
    FROM generated_game_participations participation
    LEFT JOIN generated_game_selections selection ON selection.id=participation.selection_id
      AND selection.organization_id=participation.organization_id
      AND selection.game_type=participation.game_type
    WHERE participation.organization_id=?1 AND participation.game_type=?2`)
    .bind(identity.organizationId, GameType.QUIZ).all<Row>();
  const participationConflicts = participations.results.filter(row =>
    !row.valid_selection_id || row.mode !== row.selection_mode).length;
  const currentUserActive = participations.results.filter(row =>
    row.user_id === identity.userId && ["CREATED", "STARTED"].includes(String(row.status))).length;
  const selectionKeyModes = new Map<string, Set<string>>();
  for (const row of selections.results) {
    const key = String(row.selection_key);
    selectionKeyModes.set(key, new Set([...(selectionKeyModes.get(key) ?? []), String(row.mode)]));
  }

  return {
    freePlay: {
      request: { gameType: GameType.QUIZ, mode: GameGenerationMode.FREE_PLAY, count: QUIZ_COUNT, filters: {} },
      catalogCandidates: catalog.length,
      repetitionExclusions: recentIds.length,
      candidatesAfterExclusions: catalog.filter(item => !normalizedTexts(recentIds).includes(
        item.contentId.normalize("NFKC").trim().toLocaleLowerCase("pt-BR"),
      )).length,
      finalDistribution: distribution(freeCandidates),
      capabilityAccepted: Boolean(capability?.supportedModes.includes(GameGenerationMode.FREE_PLAY)
        && capability.allowedCounts.includes(QUIZ_COUNT) && freeMode?.active),
      selectionKeyConflict: freeConflict,
      repetitionFallbackNeeded,
      canSelectFive: freeSelection.ok,
      historicalResolution: freeHistory,
      success: !freeCode,
      failureStage: stage(freeCode, !freeHistory.missing && !freeHistory.invalid),
      technicalCode: freeCode,
      explanation: freeCode ? explanations[freeCode] ?? "Falha não classificada após o Catálogo Elegível." : "A geração em memória e a resolução histórica estão prontas para persistência.",
    },
    daily: {
      request: { gameType: GameType.QUIZ, mode: GameGenerationMode.DAILY, count: QUIZ_COUNT,
        difficultyDistribution: { EASY: 2, MEDIUM: 2, HARD: 1 }, algorithmVersion: ALGORITHM_VERSION },
      dayKey,
      selectionKey: dailyRequest.selectionKey,
      existingSelection: dailyExisting ? {
        id: String(dailyExisting.id), status: String(dailyExisting.status), items: dailyItems.results.length,
        contentVersions: dailyItems.results.map(row => Number(row.content_version)),
      } : null,
      fingerprintConflict: dailyConflict,
      expired: dailyExpired,
      partial: dailyPartial,
      newGenerationPossible: dailySelection.ok,
      finalDistribution: distribution(dailySelection.ok ? dailySelection.candidates : []),
      historicalResolution: dailyHistory,
      success: !dailyCode && !dailyExpired,
      failureStage: dailyExpired ? "selection_expiration" : stage(dailyCode, !dailyHistory.missing && !dailyHistory.invalid),
      technicalCode: dailyExpired ? "expired_selection" : dailyCode,
      explanation: dailyExpired ? "A seleção diária existente está expirada."
        : dailyCode ? explanations[dailyCode] ?? "Falha não classificada no objetivo diário."
          : "A seleção diária existente ou simulada está íntegra e pode ser carregada.",
    },
    persistence: {
      selections: selections.results.length,
      byMode: Object.fromEntries([...new Set(selections.results.map(row => String(row.mode)))].map(mode => [
        mode, selections.results.filter(row => row.mode === mode).length,
      ])),
      byStatus: Object.fromEntries([...new Set(selections.results.map(row => String(row.status)))].map(status => [
        status, selections.results.filter(row => row.status === status).length,
      ])),
      algorithmVersions: [...new Set(selections.results.map(row => Number(row.algorithm_version)))].sort(),
      crossModeSelectionKeys: [...selectionKeyModes.values()].filter(modes => modes.size > 1).length,
      incompleteSelections,
      missingCurrentContent: selectionItems.results.filter(row => !row.current_content_id).length,
      missingHistoricalVersions: selectionItems.results.filter(row => !row.historical_version_id).length,
    },
    participations: {
      total: participations.results.length,
      conflicting: participationConflicts,
      currentUserActive,
      blocksNewSelection: false,
    },
    endpointContracts: {
      generation: "POST /api/platform/free-play/generate",
      freePlayStart: "POST /api/platform/free-play/start",
      freePlaySelection: "GET /api/platform/free-play/selection",
      dailyObjective: "GET /api/platform/daily-objectives/quiz",
      dailyStart: "POST /api/platform/daily-objectives/start",
      genericUiMessageSource: "GameCard converts every generation error into the generic start message",
    },
  };
}
