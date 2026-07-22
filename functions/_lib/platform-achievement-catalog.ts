export const PLATFORM_ACHIEVEMENT_CATALOG_VERSION = 1;

export type AchievementMetric =
  | "officialGamesCompleted"
  | "questionsAnswered"
  | "perfectGames"
  | "distinctOfficialPlayDaysUtc"
  | "level";

export type PlatformAchievementCatalogEntry = {
  achievementId: string;
  catalogVersion: 1;
  name: string;
  description: string;
  category: "first_steps" | "progression" | "knowledge" | "precision" | "persistence" | "frequency";
  rarity: "bronze" | "silver" | "gold" | "legendary";
  visibility: "visible" | "hidden";
  scope: "global";
  criterion: { metric: AchievementMetric; operator: "greater_than_or_equal"; target: number };
  reward: { xp: number; coins: number };
};

const entry = (
  achievementId: string,
  name: string,
  description: string,
  category: PlatformAchievementCatalogEntry["category"],
  rarity: PlatformAchievementCatalogEntry["rarity"],
  visibility: PlatformAchievementCatalogEntry["visibility"],
  metric: AchievementMetric,
  target: number,
  xp: number,
  coins: number,
): PlatformAchievementCatalogEntry => Object.freeze({
  achievementId, catalogVersion: 1, name, description, category, rarity, visibility, scope: "global",
  criterion: Object.freeze({ metric, operator: "greater_than_or_equal", target }),
  reward: Object.freeze({ xp, coins }),
});

/** Structured runtime representation of docs/PRODUCT/CORE_PLATFORM_ACHIEVEMENTS_CATALOG.md. */
export const CORE_PLATFORM_ACHIEVEMENTS = Object.freeze([
  entry("first_steps", "Primeiros Passos", "Conclua sua primeira partida oficial.", "first_steps", "bronze", "visible", "officialGamesCompleted", 1, 50, 10),
  entry("level_5", "Bem-vindo à Jornada", "Alcance o nível 5 na plataforma.", "progression", "silver", "visible", "level", 5, 150, 30),
  entry("word_apprentice", "Aprendiz da Palavra", "Responda 100 perguntas em partidas oficiais.", "knowledge", "bronze", "visible", "questionsAnswered", 100, 50, 10),
  entry("word_scholar", "Estudioso", "Responda 1.000 perguntas em partidas oficiais.", "knowledge", "silver", "visible", "questionsAnswered", 1_000, 150, 30),
  entry("word_master", "Mestre das Escrituras", "Responda 10.000 perguntas em partidas oficiais.", "knowledge", "gold", "visible", "questionsAnswered", 10_000, 300, 60),
  entry("perfect_first", "Mira Perfeita", "Conclua uma partida oficial sem errar nenhuma pergunta.", "precision", "bronze", "hidden", "perfectGames", 1, 50, 10),
  entry("perfect_10", "Excelência", "Conclua 10 partidas oficiais perfeitas.", "precision", "silver", "visible", "perfectGames", 10, 150, 30),
  entry("perfect_100", "Impecável", "Conclua 100 partidas oficiais perfeitas.", "precision", "gold", "visible", "perfectGames", 100, 300, 60),
  entry("persistent_10", "Perseverante", "Conclua 10 partidas oficiais.", "persistence", "bronze", "visible", "officialGamesCompleted", 10, 50, 10),
  entry("persistent_100", "Veterano", "Conclua 100 partidas oficiais.", "persistence", "silver", "visible", "officialGamesCompleted", 100, 150, 30),
  entry("persistent_1000", "Lenda", "Conclua 1.000 partidas oficiais.", "persistence", "legendary", "visible", "officialGamesCompleted", 1_000, 600, 120),
  entry("active_7_days", "Fiel por 7 Dias", "Jogue oficialmente em 7 dias diferentes.", "frequency", "silver", "visible", "distinctOfficialPlayDaysUtc", 7, 150, 30),
  entry("active_30_days", "Constância", "Jogue oficialmente em 30 dias diferentes.", "frequency", "gold", "visible", "distinctOfficialPlayDaysUtc", 30, 300, 60),
  entry("active_100_days", "Incansável", "Jogue oficialmente em 100 dias diferentes.", "frequency", "legendary", "visible", "distinctOfficialPlayDaysUtc", 100, 600, 120),
] satisfies readonly PlatformAchievementCatalogEntry[]);

export function achievementMetricValue(
  item: PlatformAchievementCatalogEntry,
  statistics: Record<string, number>,
  progress: { level: number },
) {
  return item.criterion.metric === "level" ? progress.level : Number(statistics[item.criterion.metric] || 0);
}

export function achievementCriterionMet(item: PlatformAchievementCatalogEntry, value: number) {
  return Number.isFinite(value) && value >= item.criterion.target;
}
