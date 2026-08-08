export const OPERATIONAL_THRESHOLDS = Object.freeze({
  staleParticipationMs: 2 * 60 * 60 * 1000,
  outbox: Object.freeze({ degradedCount: 10, criticalCount: 100, degradedAgeMs: 15 * 60 * 1000, criticalAgeMs: 60 * 60 * 1000 }),
  eventEngine: Object.freeze({ degradedCount: 5, criticalCount: 25 }),
  generator: Object.freeze({ repeatedFailuresDegraded: 3, repeatedFailuresCritical: 10 }),
  catalogMinimumByGame: Object.freeze({
    "quiz-biblico": 5,
    "wordle-biblico": 1,
    "linha-do-tempo-biblica": 1,
    "memoria-biblica": 1,
    "associacao-de-temas": 1,
    "quem-sou-eu": 1,
    "jogo-tres-pistas": 1,
  }),
  quizDailyDifficultyMinimum: Object.freeze({ EASY: 2, MEDIUM: 2, HARD: 1 }),
});

