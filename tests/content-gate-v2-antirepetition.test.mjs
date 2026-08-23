import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContentGateSimulation,
  CONTENT_GATE_CATALOGS,
} from "../scripts/audit-content-antirepetition.mjs";

const result = buildContentGateSimulation();

test("content gate simulation covers every v2 game and required horizon", () => {
  assert.deepEqual(Object.keys(result), Object.keys(CONTENT_GATE_CATALOGS));
  for (const [gameType, snapshots] of Object.entries(result)) {
    assert.ok(snapshots[30], gameType);
    assert.ok(snapshots[100], gameType);
    assert.ok(snapshots[365], gameType);
    if (gameType !== "wordle-biblico") assert.ok(snapshots[730], gameType);
  }
  assert.ok(result["wordle-biblico"][1200]);
});

test("least-used ordering exhausts eligible catalogs before reuse", () => {
  assert.equal(result["wordle-biblico"][1200].uniqueContents, 1200);
  assert.equal(result["wordle-biblico"][1200].firstRepeatSelection, null);
  for (const gameType of ["linha-do-tempo-biblica", "associacao-de-temas", "quem-sou-eu", "jogo-tres-pistas"]) {
    assert.equal(result[gameType][730].uniqueContents, 730, gameType);
    assert.equal(result[gameType][730].firstRepeatSelection, null, gameType);
  }
});

test("Quiz difficulty quotas and Memory fixed sets expose their real reuse horizons", () => {
  assert.equal(result["quiz-biblico"][365].uniqueContents, 984);
  assert.equal(result["quiz-biblico"][365].firstRepeatSelection, 197);
  assert.equal(result["memoria-biblica"][365].uniqueContents, 100);
  assert.equal(result["memoria-biblica"][365].firstRepeatSelection, 101);
  assert.equal(result["memoria-biblica"][730].usageDistribution[7], 70);
  assert.equal(result["memoria-biblica"][730].usageDistribution[8], 30);
});

test("balanced usage keeps the top decile concentration proportional", () => {
  for (const [gameType, snapshots] of Object.entries(result)) {
    const last = snapshots[Math.max(...Object.keys(snapshots).map(Number))];
    // The Quiz keeps its frozen 40/40/20 difficulty quotas. Its smallest HARD
    // pool therefore makes the top decile slightly exceed an ideal 10% share.
    assert.ok(last.top10PercentShare <= 0.11, `${gameType}: ${last.top10PercentShare}`);
  }
});
