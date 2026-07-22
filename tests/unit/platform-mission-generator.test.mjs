import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { PLATFORM_MISSION_CATALOG } from "../../functions/_lib/platform-mission-catalog.ts";
import { generatePlayerMissions } from "../../functions/_lib/platform-mission-generator.ts";

const NOW = Date.UTC(2026, 6, 21, 12);

test("runtime catalog keeps the 20 official Mission Catalog identities and selection fields", async () => {
  const documentation = await readFile(new URL("../../docs/PRODUCT/MISSION_CATALOG.md", import.meta.url), "utf8");
  const blocks = [...documentation.matchAll(/```yaml\n([\s\S]*?)\n```/g)]
    .map(match => match[1])
    .filter(block => block.startsWith("missionId:"));
  const documented = blocks.map(block => Object.fromEntries(block.split(/\r?\n/).map(line => {
    const separator = line.indexOf(":");
    return [line.slice(0, separator), line.slice(separator + 1).trim()];
  })));
  assert.equal(documented.length, 20);
  assert.equal(PLATFORM_MISSION_CATALOG.length, documented.length);
  for (const mission of PLATFORM_MISSION_CATALOG) {
    const source = documented.find(item => item.missionId === mission.missionId);
    assert.ok(source, `${mission.missionId} must exist in MISSION_CATALOG.md`);
    assert.equal(source.type, mission.type);
    assert.equal(source.scope, mission.scope);
    assert.equal(source.pool, mission.pool);
    assert.equal(Number(source.weight), mission.weight);
    assert.equal(source.difficulty, mission.difficulty);
    assert.equal(source.visibility, mission.visibility);
    assert.equal(source.cooldown, mission.cooldown);
    assert.equal(source.season, mission.season === null ? "null" : mission.season);
  }
});

function input(overrides = {}) {
  return {
    organizationId: "org-test",
    userId: "user-test",
    windowKey: "2026-07-21",
    seed: "stable-seed",
    now: NOW,
    types: ["daily"],
    enabledGameIds: ["quiz-biblico"],
    ...overrides,
  };
}

test("selects deterministically at most one mission from each eligible pool", () => {
  const first = generatePlayerMissions(input());
  const second = generatePlayerMissions(input());
  assert.deepEqual(second, first);
  assert.deepEqual(first.map(item => item.pool), ["daily_global_core", "daily_quiz_core"]);
  assert.equal(new Set(first.map(item => item.pool)).size, first.length);
  assert.ok(first.every(item => item.state === "AVAILABLE"));
});

test("cooldown removes resolved missions and once removes permanent missions forever", () => {
  const dailyCatalog = PLATFORM_MISSION_CATALOG.filter(item => item.pool === "daily_global_core");
  const available = dailyCatalog.at(-1);
  const history = dailyCatalog.slice(0, -1).map(item => ({ missionId: item.missionId, resolvedAt: NOW - 1_000 }));
  const daily = generatePlayerMissions(input({ enabledGameIds: [], history }), dailyCatalog);
  assert.deepEqual(daily.map(item => item.missionId), [available.missionId]);

  const permanentCatalog = PLATFORM_MISSION_CATALOG.filter(item => item.type === "permanent");
  const permanentHistory = permanentCatalog.map(item => ({ missionId: item.missionId, resolvedAt: 0 }));
  assert.deepEqual(generatePlayerMissions(input({ types: ["permanent"], enabledGameIds: [], history: permanentHistory }), permanentCatalog), []);
});

test("game filters exclude Quiz pools until the official game is enabled", () => {
  const withoutQuiz = generatePlayerMissions(input({ enabledGameIds: [] }));
  assert.deepEqual(withoutQuiz.map(item => item.pool), ["daily_global_core"]);
  assert.ok(withoutQuiz.every(item => item.scopeKey === "global"));

  const withQuiz = generatePlayerMissions(input());
  assert.equal(withQuiz.find(item => item.pool === "daily_quiz_core")?.scopeKey, "game:quiz-biblico");
});

test("existing missions prevent duplicate identities and a second mission from the same pool", () => {
  const baseline = generatePlayerMissions(input());
  const existing = baseline.map(item => ({ missionId: item.missionId, pool: item.pool }));
  assert.deepEqual(generatePlayerMissions(input({ existingMissions: existing })), []);

  const ids = baseline.map(item => item.missionId);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(baseline.map(item => item.generationKey)).size, baseline.length);
});

test("difficulty filters are respected and weighted seeds distribute eligible tiers", () => {
  const hardOnly = generatePlayerMissions(input({ enabledGameIds: [], allowedDifficulties: ["hard"] }));
  assert.deepEqual(hardOnly.map(item => item.difficulty), ["hard"]);

  const counts = { easy: 0, medium: 0, hard: 0, expert: 0 };
  for (let seed = 0; seed < 400; seed += 1) {
    const generated = generatePlayerMissions(input({ enabledGameIds: [], seed: `distribution-${seed}` }));
    counts[generated[0].difficulty] += 1;
  }
  assert.ok(counts.easy > counts.medium);
  assert.ok(counts.medium > counts.hard);
  assert.equal(counts.expert, 0);
});
