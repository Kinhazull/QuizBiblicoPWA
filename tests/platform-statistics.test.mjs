import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("statistics has one read-only API and an official consumer registry", async () => {
  const [route, registry, runtime] = await Promise.all([
    read("functions/api/platform/statistics.ts"),
    read("functions/_lib/platform-event-consumers.ts"),
    read("functions/_lib/platform-event-runtime.ts"),
  ]);
  assert.match(route, /onRequestGet/);
  assert.doesNotMatch(route, /onRequest(?:Post|Patch|Put|Delete)/);
  assert.match(route, /requireUser/);
  assert.match(route, /no-store, private/);
  assert.match(registry, /platformStatisticsConsumer/);
  assert.match(runtime, /CORE_PLATFORM_EVENT_CONSUMERS/);
});

test("statistics projections are separate from legacy Quiz tables and progress balances", async () => {
  const [service, migration] = await Promise.all([
    read("functions/_lib/platform-statistics.ts"),
    read("drizzle/0027_platform_statistics.sql"),
  ]);
  assert.doesNotMatch(service, /\b(?:rounds|attempts|user_badges)\b/);
  assert.doesNotMatch(migration, /\b(?:xp|coins|achievement)\b/i);
  assert.match(migration, /PRIMARY KEY\(user_id, organization_id, game_id\)/);
  assert.match(migration, /event_id TEXT NOT NULL/);
  assert.match(migration, /PRIMARY KEY\(event_id, consumer_version\)/);
  assert.match(service, /DB\.batch/);
});

test("statistics tables participate in operations without changing protected catalogs", async () => {
  const [health, backup, privacy, reset, cleanup] = await Promise.all([
    read("functions/api/admin/health.ts"),
    read("functions/api/admin/backup.ts"),
    read("functions/api/privacy/me.ts"),
    read("scripts/lib/pilot-reset-policy.mjs"),
    read("scripts/cleanup-test-data.mjs"),
  ]);
  for (const source of [health, backup, privacy, reset, cleanup]) assert.match(source, /user_platform_statistics/);
  assert.match(health, /0027_platform_statistics/);
  assert.match(backup, /schemaVersion: 28/);
  assert.match(reset, /purgeTables[\s\S]*platform_statistics_event_checkpoints/);
});
