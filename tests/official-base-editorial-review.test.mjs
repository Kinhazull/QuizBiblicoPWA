import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { automatedChecks, renderEditorialReview, selectEditorialSample } from "../scripts/generate-official-base-editorial-review.mjs";

const pack = JSON.parse(await readFile(new URL("../content/official-base-content-v1.json", import.meta.url), "utf8"));

test("editorial review selection contains three official items per game and difficulty", () => {
  const sample = selectEditorialSample(pack);
  assert.equal(sample.length, 54);
  const officialIds = new Set(pack.contents.map(entry => entry.externalId));
  assert.ok(sample.every(entry => officialIds.has(entry.externalId)));
  for (const gameType of new Set(pack.contents.map(entry => entry.gameType))) {
    for (const difficulty of ["EASY", "MEDIUM", "HARD"]) {
      assert.equal(sample.filter(entry => entry.gameType === gameType && entry.difficulty === difficulty).length, 3);
    }
  }
});

test("editorial review generation is byte-for-byte deterministic", () => {
  assert.equal(renderEditorialReview(pack), renderEditorialReview(pack));
});

test("corrected editorial package has no blocking automatic alert", () => {
  const checks = automatedChecks(pack);
  assert.deepEqual(checks.answerReveals, []);
  assert.deepEqual(checks.unnaturalWordle, []);
  assert.deepEqual(checks.translationDependent, []);
  assert.deepEqual(checks.disputedTimelines, []);
  assert.deepEqual(checks.nearIdenticalClues, []);
  assert.deepEqual(checks.ambiguousRelations, []);
  assert.deepEqual(checks.spellingAttention, []);
});

test("editorial review records previous, corrected and residual alert counts", () => {
  const report = renderEditorialReview(pack);
  assert.match(report, /\| Resposta revelada \| 68 \| 68 \| 0 \|/);
  assert.match(report, /\| Wordle dependente da redação ACF \| 120 \| 120 \| 0 \|/);
  assert.match(report, /\| Cronologia sem qualificação narrativa \| 8 \| 8 \| 0 \|/);
});
