export const PLATFORM_MISSION_CATALOG_VERSION = 1;

export type MissionType = "permanent" | "daily" | "weekly" | "event";
export type MissionScope = "global" | "game";
export type MissionDifficulty = "easy" | "medium" | "hard" | "expert";
export type MissionVisibility = "visible" | "hidden";

export type PlatformMissionCatalogEntry = Readonly<{
  missionId: string;
  catalogVersion: 1;
  type: MissionType;
  scope: MissionScope;
  pool: string;
  weight: number;
  difficulty: MissionDifficulty;
  visibility: MissionVisibility;
  cooldown: "once" | `P${number}D`;
  target: Readonly<{ metric: string; operator: "greater_than_or_equal"; value: number }>;
  reward: Readonly<{ xp: number; coins: number }>;
  gameFilter: readonly string[];
  season: string | null;
}>;

type EntryInput = Omit<PlatformMissionCatalogEntry, "catalogVersion" | "target" | "reward" | "gameFilter"> & {
  metric: string;
  target: number;
  xp: number;
  coins: number;
  gameFilter?: readonly string[];
};

function entry(input: EntryInput): PlatformMissionCatalogEntry {
  return Object.freeze({
    missionId: input.missionId,
    catalogVersion: 1,
    type: input.type,
    scope: input.scope,
    pool: input.pool,
    weight: input.weight,
    difficulty: input.difficulty,
    visibility: input.visibility,
    cooldown: input.cooldown,
    target: Object.freeze({ metric: input.metric, operator: "greater_than_or_equal", value: input.target }),
    reward: Object.freeze({ xp: input.xp, coins: input.coins }),
    gameFilter: Object.freeze([...(input.gameFilter || [])]),
    season: input.season,
  });
}

const permanent = (missionId: string, difficulty: MissionDifficulty, metric: string, target: number, xp: number, coins: number) => entry({
  missionId, type: "permanent", scope: "global", pool: "permanent_global_foundation", weight: 0,
  difficulty, visibility: "visible", cooldown: "once", metric, target, xp, coins, season: null,
});

const recurring = (input: Omit<EntryInput, "season">) => entry({ ...input, season: null });

/** Executable representation derived from docs/PRODUCT/MISSION_CATALOG.md. */
export const PLATFORM_MISSION_CATALOG = Object.freeze([
  permanent("permanent_global_level_3", "medium", "level", 3, 100, 20),
  permanent("permanent_global_level_5", "hard", "level", 5, 200, 40),
  permanent("permanent_global_active_days_7", "medium", "distinctOfficialPlayDaysUtc", 7, 100, 20),

  recurring({ missionId: "daily_global_games_1", type: "daily", scope: "global", pool: "daily_global_core", weight: 30, difficulty: "easy", visibility: "visible", cooldown: "P2D", metric: "officialGamesCompletedInWindow", target: 1, xp: 15, coins: 3 }),
  recurring({ missionId: "daily_global_questions_10", type: "daily", scope: "global", pool: "daily_global_core", weight: 30, difficulty: "easy", visibility: "visible", cooldown: "P2D", metric: "questionsAnsweredInWindow", target: 10, xp: 15, coins: 3 }),
  recurring({ missionId: "daily_global_gameplay_xp_30", type: "daily", scope: "global", pool: "daily_global_core", weight: 25, difficulty: "medium", visibility: "visible", cooldown: "P3D", metric: "gameplayXpEarnedInWindow", target: 30, xp: 25, coins: 5 }),
  recurring({ missionId: "daily_global_perfect_1", type: "daily", scope: "global", pool: "daily_global_core", weight: 15, difficulty: "hard", visibility: "hidden", cooldown: "P4D", metric: "perfectGamesInWindow", target: 1, xp: 40, coins: 8 }),

  recurring({ missionId: "weekly_global_games_5", type: "weekly", scope: "global", pool: "weekly_global_core", weight: 30, difficulty: "easy", visibility: "visible", cooldown: "P14D", metric: "officialGamesCompletedInWindow", target: 5, xp: 50, coins: 10 }),
  recurring({ missionId: "weekly_global_questions_50", type: "weekly", scope: "global", pool: "weekly_global_core", weight: 30, difficulty: "medium", visibility: "visible", cooldown: "P14D", metric: "questionsAnsweredInWindow", target: 50, xp: 80, coins: 16 }),
  recurring({ missionId: "weekly_global_gameplay_xp_200", type: "weekly", scope: "global", pool: "weekly_global_core", weight: 20, difficulty: "medium", visibility: "visible", cooldown: "P14D", metric: "gameplayXpEarnedInWindow", target: 200, xp: 80, coins: 16 }),
  recurring({ missionId: "weekly_global_perfect_2", type: "weekly", scope: "global", pool: "weekly_global_core", weight: 10, difficulty: "hard", visibility: "hidden", cooldown: "P21D", metric: "perfectGamesInWindow", target: 2, xp: 120, coins: 24 }),
  recurring({ missionId: "weekly_global_active_days_3", type: "weekly", scope: "global", pool: "weekly_global_core", weight: 10, difficulty: "medium", visibility: "visible", cooldown: "P14D", metric: "distinctOfficialPlayDaysUtcInWindow", target: 3, xp: 80, coins: 16 }),

  recurring({ missionId: "daily_quiz_correct_7", type: "daily", scope: "game", pool: "daily_quiz_core", weight: 35, difficulty: "easy", visibility: "visible", cooldown: "P2D", metric: "correctAnswersInWindow", target: 7, xp: 15, coins: 3, gameFilter: ["quiz-biblico"] }),
  recurring({ missionId: "daily_quiz_questions_10", type: "daily", scope: "game", pool: "daily_quiz_core", weight: 35, difficulty: "easy", visibility: "visible", cooldown: "P2D", metric: "questionsAnsweredInWindow", target: 10, xp: 15, coins: 3, gameFilter: ["quiz-biblico"] }),
  recurring({ missionId: "daily_quiz_official_games_1", type: "daily", scope: "game", pool: "daily_quiz_core", weight: 25, difficulty: "easy", visibility: "visible", cooldown: "P2D", metric: "officialGamesCompletedInWindow", target: 1, xp: 15, coins: 3, gameFilter: ["quiz-biblico"] }),
  recurring({ missionId: "daily_quiz_correct_9", type: "daily", scope: "game", pool: "daily_quiz_core", weight: 5, difficulty: "hard", visibility: "hidden", cooldown: "P4D", metric: "correctAnswersInSingleGame", target: 9, xp: 40, coins: 8, gameFilter: ["quiz-biblico"] }),

  recurring({ missionId: "weekly_quiz_correct_35", type: "weekly", scope: "game", pool: "weekly_quiz_core", weight: 30, difficulty: "medium", visibility: "visible", cooldown: "P14D", metric: "correctAnswersInWindow", target: 35, xp: 80, coins: 16, gameFilter: ["quiz-biblico"] }),
  recurring({ missionId: "weekly_quiz_questions_50", type: "weekly", scope: "game", pool: "weekly_quiz_core", weight: 30, difficulty: "medium", visibility: "visible", cooldown: "P14D", metric: "questionsAnsweredInWindow", target: 50, xp: 80, coins: 16, gameFilter: ["quiz-biblico"] }),
  recurring({ missionId: "weekly_quiz_official_games_5", type: "weekly", scope: "game", pool: "weekly_quiz_core", weight: 30, difficulty: "medium", visibility: "visible", cooldown: "P14D", metric: "officialGamesCompletedInWindow", target: 5, xp: 80, coins: 16, gameFilter: ["quiz-biblico"] }),
  recurring({ missionId: "weekly_quiz_perfect_3", type: "weekly", scope: "game", pool: "weekly_quiz_core", weight: 10, difficulty: "expert", visibility: "hidden", cooldown: "P21D", metric: "perfectGamesInWindow", target: 3, xp: 180, coins: 36, gameFilter: ["quiz-biblico"] }),
] satisfies readonly PlatformMissionCatalogEntry[]);
