import assert from "node:assert/strict";
import test from "node:test";
import { deriveLibraryHealth, LIBRARY_HEALTH_THRESHOLDS } from "../../functions/_lib/library-health.ts";
import { registeredGameGenerationCapabilities } from "../../functions/_lib/universal-game-generation-capabilities.ts";

const row = (overrides = {}) => ({ gameType: "quiz-biblico", category: "Personagens", difficulty: "EASY", availabilityStatus: "AVAILABLE", total: 1, neverUsed: 0, lowUsed: 0, usageTotal: 2, ...overrides });

test("library health deterministically detects every approved high-value signal", () => {
  const health = deriveLibraryHealth({
    catalog: [
      row({ total: 18, neverUsed: 5, lowUsed: 8, usageTotal: 100 }),
      row({ category: "Lugares", difficulty: "MEDIUM", total: 12, usageTotal: 20 }),
    ],
    overused: [{ gameType: "quiz-biblico", total: 2, maximumUses: 18, averageUses: 4 }],
    reservations: [{ gameType: "quiz-biblico", eventTitle: "Semana Bíblica", total: 15 }],
    unprojected: [{ gameType: "quiz-biblico", total: 2 }],
  });
  const rules = new Set(health.insights.map(insight => insight.rule));
  for (const expected of ["category_concentration", "difficulty_missing", "low_usage", "unused_content", "overused_content", "reservation_impact", "published_without_projection"]) assert.ok(rules.has(expected), expected);
  assert.equal(health.insights.find(item => item.rule === "category_concentration").percentage, 60);
  assert.equal(health.insights.find(item => item.rule === "reservation_impact").severity, "critical");
  assert.equal(health.insights.find(item => item.rule === "published_without_projection").severity, "critical");
});

test("small catalog severity distinguishes an inoperable catalog from an operational warning", () => {
  const empty = deriveLibraryHealth({ catalog: [], overused: [], reservations: [], unprojected: [] });
  assert.equal(empty.insights.find(item => item.id === "small_catalog:quiz-biblico").severity, "critical");
  const warning = deriveLibraryHealth({ catalog: [row({ total: 8 })], overused: [], reservations: [], unprojected: [] });
  assert.equal(warning.insights.find(item => item.id === "small_catalog:quiz-biblico").severity, "attention");
});

test("low difficulty coverage is informational and thresholds stay explicit", () => {
  const health = deriveLibraryHealth({ catalog: [row({ total: 19 }), row({ difficulty: "MEDIUM", category: "Eventos", total: 19 }), row({ difficulty: "HARD", category: "Lugares", total: 2 })], overused: [], reservations: [], unprojected: [] });
  const hard = health.insights.find(item => item.id === "difficulty_low:quiz-biblico:HARD");
  assert.equal(hard.severity, "info");
  assert.equal(LIBRARY_HEALTH_THRESHOLDS.lowDifficultyPercent, 10);
});

test("a balanced and used catalog has a zero-alert state", () => {
  const catalog = registeredGameGenerationCapabilities().flatMap(capability => [
    row({ gameType: capability.gameType, category: "Personagens", difficulty: "EASY", total: 7, usageTotal: 14 }),
    row({ gameType: capability.gameType, category: "Eventos", difficulty: "MEDIUM", total: 7, usageTotal: 14 }),
    row({ gameType: capability.gameType, category: "Lugares", difficulty: "HARD", total: 7, usageTotal: 14 }),
  ]);
  const health = deriveLibraryHealth({ catalog, overused: [], reservations: [], unprojected: [] });
  assert.equal(health.status, "healthy");
  assert.equal(health.total, 0);
});
