/** Canonical editorial difficulty values persisted by the Universal CMS. */
export const Difficulty = {
  VERY_EASY: "VERY_EASY",
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
  SPECIAL: "SPECIAL",
} as const;
export type Difficulty = typeof Difficulty[keyof typeof Difficulty];

export const EDITORIAL_DIFFICULTIES = Object.freeze(Object.values(Difficulty));

export const BiblicalArea = {
  PENTATEUCH: "Pentateuco",
  HISTORICAL_BOOKS: "Livros Históricos",
  POETRY_AND_WISDOM: "Poesia e Sabedoria",
  MAJOR_PROPHETS: "Profetas Maiores",
  MINOR_PROPHETS: "Profetas Menores",
  GOSPELS: "Evangelhos",
  ACTS: "Atos dos Apóstolos",
  PAULINE_EPISTLES: "Cartas Paulinas",
  GENERAL_EPISTLES: "Cartas Gerais",
  REVELATION: "Apocalipse",
} as const;
export const BIBLICAL_AREAS = Object.freeze(Object.values(BiblicalArea));

export const EditorialCategory = {
  CHARACTERS: "Personagens",
  PLACES: "Lugares",
  EVENTS: "Eventos",
  BOOKS: "Livros",
  VERSES: "Versículos",
  MIRACLES: "Milagres",
  PARABLES: "Parábolas",
  TEACHINGS: "Ensinamentos",
  PROPHECIES: "Profecias",
  SYMBOLS: "Símbolos",
  CONCEPTS: "Conceitos",
  KINGS: "Reis",
  PROPHETS: "Profetas",
  ACTS: "Atos",
  OLD_TESTAMENT: "Antigo Testamento",
  NEW_TESTAMENT: "Novo Testamento",
} as const;
export const EDITORIAL_CATEGORIES = Object.freeze(Object.values(EditorialCategory));

export const EditorialTheme = {
  CREATION: "Criação",
  COVENANT: "Aliança",
  FAITH: "Fé",
  GRACE: "Graça",
  SALVATION: "Salvação",
  OBEDIENCE: "Obediência",
  PRAYER: "Oração",
  WISDOM: "Sabedoria",
  JUSTICE: "Justiça",
  LOVE: "Amor",
  HOPE: "Esperança",
  KINGDOM_OF_GOD: "Reino de Deus",
  HOLY_SPIRIT: "Espírito Santo",
  MISSION: "Missão",
} as const;
export const EDITORIAL_THEMES = Object.freeze(Object.values(EditorialTheme));

export const EDITORIAL_TAXONOMY_POLICY = "OPEN_COMPATIBLE" as const;

const normalized = (value: string) => value.normalize("NFKC").trim().toLocaleLowerCase("pt-BR");

export const isOfficialEditorialCategory = (value: string): boolean =>
  EDITORIAL_CATEGORIES.some(category => normalized(category) === normalized(value));

export const isOfficialEditorialTheme = (value: string): boolean =>
  EDITORIAL_THEMES.some(theme => normalized(theme) === normalized(value));

export const isOfficialBiblicalArea = (value: string): boolean =>
  BIBLICAL_AREAS.some(area => normalized(area) === normalized(value));
