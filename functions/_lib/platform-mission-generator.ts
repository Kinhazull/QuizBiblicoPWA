import {
  PLATFORM_MISSION_CATALOG,
  type MissionDifficulty,
  type MissionType,
  type PlatformMissionCatalogEntry,
} from "./platform-mission-catalog";

export type MissionGenerationHistory = Readonly<{
  missionId: string;
  resolvedAt: number;
}>;

export type ExistingPlayerMission = Readonly<{
  missionId: string;
  pool: string;
}>;

export type MissionGenerationInput = Readonly<{
  organizationId: string;
  userId: string;
  windowKey: string;
  seed: string;
  now: number;
  types: readonly Exclude<MissionType, "event">[];
  enabledGameIds?: readonly string[];
  allowedDifficulties?: readonly MissionDifficulty[];
  activeSeason?: string | null;
  history?: readonly MissionGenerationHistory[];
  existingMissions?: readonly ExistingPlayerMission[];
}>;

export type GeneratedPlayerMission = Readonly<{
  generationKey: string;
  missionId: string;
  catalogVersion: number;
  type: Exclude<MissionType, "event">;
  scope: "global" | "game";
  scopeKey: string;
  pool: string;
  difficulty: MissionDifficulty;
  visibility: "visible" | "hidden";
  state: "AVAILABLE";
  target: PlatformMissionCatalogEntry["target"];
  reward: PlatformMissionCatalogEntry["reward"];
  gameFilter: readonly string[];
  season: string | null;
}>;

function requiredToken(value: string, error: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 160 || !/^[a-zA-Z0-9._:-]+$/.test(normalized)) throw new Error(error);
  return normalized;
}

function deterministicNumber(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function cooldownMilliseconds(cooldown: PlatformMissionCatalogEntry["cooldown"]) {
  if (cooldown === "once") return Number.POSITIVE_INFINITY;
  const match = /^P([1-9][0-9]*)D$/.exec(cooldown);
  if (!match) throw new Error("invalid_mission_cooldown");
  return Number(match[1]) * 86_400_000;
}

export function isMissionOnCooldown(
  mission: PlatformMissionCatalogEntry,
  history: readonly MissionGenerationHistory[],
  now: number,
) {
  const lastResolvedAt = history
    .filter(item => item.missionId === mission.missionId)
    .reduce((latest, item) => Math.max(latest, item.resolvedAt), Number.NEGATIVE_INFINITY);
  if (!Number.isFinite(lastResolvedAt)) return false;
  if (mission.cooldown === "once") return true;
  return now < lastResolvedAt + cooldownMilliseconds(mission.cooldown);
}

function supportsEnabledGame(mission: PlatformMissionCatalogEntry, enabledGames: ReadonlySet<string>) {
  if (mission.scope === "global") return true;
  return mission.gameFilter.some(gameId => enabledGames.has(gameId));
}

function weightedPick(candidates: readonly PlatformMissionCatalogEntry[], identity: string) {
  const ordered = [...candidates].sort((left, right) => left.missionId.localeCompare(right.missionId));
  const weights = ordered.map(item => item.weight > 0 ? item.weight : 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = deterministicNumber(identity) % total;
  for (let index = 0; index < ordered.length; index += 1) {
    if (cursor < weights[index]) return ordered[index];
    cursor -= weights[index];
  }
  return ordered[ordered.length - 1];
}

function generationKey(input: MissionGenerationInput, mission: PlatformMissionCatalogEntry) {
  return `mission-generation:v${mission.catalogVersion}:${input.organizationId}:${input.userId}:${input.windowKey}:${mission.pool}:${mission.missionId}`;
}

/**
 * Pure deterministic selector. It does not persist, track progress, consume events or grant rewards.
 */
export function generatePlayerMissions(
  rawInput: MissionGenerationInput,
  catalog: readonly PlatformMissionCatalogEntry[] = PLATFORM_MISSION_CATALOG,
): readonly GeneratedPlayerMission[] {
  const input = {
    ...rawInput,
    organizationId: requiredToken(rawInput.organizationId, "invalid_mission_organization"),
    userId: requiredToken(rawInput.userId, "invalid_mission_user"),
    windowKey: requiredToken(rawInput.windowKey, "invalid_mission_window"),
    seed: requiredToken(rawInput.seed, "invalid_mission_seed"),
  };
  if (!Number.isSafeInteger(input.now) || input.now < 0) throw new Error("invalid_mission_generation_time");
  if (!input.types.length || new Set(input.types).size !== input.types.length) throw new Error("invalid_mission_types");

  const enabledGames = new Set((input.enabledGameIds || []).map(gameId => requiredToken(gameId, "invalid_mission_game")));
  const difficulties = new Set(input.allowedDifficulties || ["easy", "medium", "hard", "expert"]);
  const history = input.history || [];
  const existingIds = new Set((input.existingMissions || []).map(item => item.missionId));
  const unavailablePools = new Set((input.existingMissions || []).map(item => item.pool));

  const eligible = catalog.filter(mission =>
    mission.type !== "event"
    && input.types.includes(mission.type)
    && difficulties.has(mission.difficulty)
    && supportsEnabledGame(mission, enabledGames)
    && (mission.season === null || mission.season === (input.activeSeason || null))
    && !existingIds.has(mission.missionId)
    && !unavailablePools.has(mission.pool)
    && !isMissionOnCooldown(mission, history, input.now));

  const byPool = new Map<string, PlatformMissionCatalogEntry[]>();
  for (const mission of eligible) byPool.set(mission.pool, [...(byPool.get(mission.pool) || []), mission]);

  const generated: GeneratedPlayerMission[] = [];
  for (const pool of [...byPool.keys()].sort()) {
    const selected = weightedPick(byPool.get(pool)!, `${input.seed}:${input.organizationId}:${input.userId}:${input.windowKey}:${pool}`);
    const gameId = selected.scope === "game" ? selected.gameFilter.find(id => enabledGames.has(id))! : null;
    generated.push(Object.freeze({
      generationKey: generationKey(input, selected),
      missionId: selected.missionId,
      catalogVersion: selected.catalogVersion,
      type: selected.type as Exclude<MissionType, "event">,
      scope: selected.scope,
      scopeKey: gameId ? `game:${gameId}` : "global",
      pool: selected.pool,
      difficulty: selected.difficulty,
      visibility: selected.visibility,
      state: "AVAILABLE",
      target: selected.target,
      reward: selected.reward,
      gameFilter: selected.gameFilter,
      season: selected.season,
    }));
  }
  return Object.freeze(generated);
}
