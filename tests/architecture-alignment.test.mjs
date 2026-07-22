import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");

function filesBelow(relative, suffix = ".ts") {
  const base = fileURLToPath(new URL(relative, root));
  const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : path.endsWith(suffix) ? [path] : [];
  });
  return walk(base);
}

test("GAME_FINISHED is the single canonical game completion event", () => {
  const catalog = read("functions/_lib/platform-event-catalog.ts");
  assert.match(catalog, /"GAME_FINISHED"/);
  assert.doesNotMatch(catalog, /QUIZ_FINISHED/);
  assert.match(read("docs/PRODUCT/GAME_INTEGRATION_CONTRACT.md"), /`GAME_FINISHED` é o único evento canônico/);
});

test("Statistics checkpoint identity includes the consumer version", () => {
  const migration = read("drizzle/0027_platform_statistics.sql");
  const service = read("functions/_lib/platform-statistics.ts");
  assert.match(migration, /PRIMARY KEY\(event_id, consumer_version\)/);
  assert.match(service, /ON CONFLICT\(event_id,consumer_version\) DO NOTHING/);
  assert.match(service, /event_id=\?\d+ AND consumer_version=\?\d+/);
});

test("Core migrations remain additive and operational retry is bounded", () => {
  for (let number = 23; number <= 29; number += 1) {
    const name = readdirSync(new URL("drizzle/", root)).find(file => file.startsWith(`00${number}_`));
    const sql = read(`drizzle/${name}`);
    assert.doesNotMatch(sql.replace(/--.*$/gm, ""), /^\s*(?:DROP|DELETE|TRUNCATE)\b/im, name);
  }
  const migration = read("drizzle/0026_platform_event_engine.sql");
  const engine = read("functions/_lib/platform-event-engine.ts");
  assert.match(migration, /next_attempt_at INTEGER/);
  assert.match(engine, /MAX_CONSUMER_ATTEMPTS = 5/);
  assert.match(engine, /retryCoreEventDeliveries/);
  assert.match(engine, /dead_letter/);
  const dispatcher = read("functions/_lib/game-integrations/quiz-outbox-dispatcher.ts");
  assert.match(dispatcher, /CORE_EVENT_DELIVERY_POLICY/);
  assert.match(dispatcher, /publishOfficialCoreEvent/);
  assert.doesNotMatch(dispatcher, /CORE_PLATFORM_EVENT_CONSUMERS|publishCoreEvent/);
  assert.match(read("functions/_lib/platform-event-consumers.ts"), /platformStatisticsConsumer/);
  assert.match(read("functions/_lib/platform-event-consumers.ts"), /platformRewardConsumer/);
});

test("production code reaches the low-level dispatcher only through the official runtime", () => {
  const directImports = filesBelow("functions/").filter(path => {
    if (path.endsWith("platform-event-runtime.ts") || path.endsWith("platform-event-engine.ts")) return false;
    return /import\s*\{[^}]*\bpublishCoreEvent\b[^}]*\}\s*from\s*["']\.\/platform-event-engine["']/.test(readFileSync(path, "utf8"));
  });
  assert.deepEqual(directImports, []);
  assert.match(read("functions/_lib/platform-event-runtime.ts"), /CORE_PLATFORM_EVENT_CONSUMERS/);
  assert.match(read("docs/DECISIONS/ADR/0001-core-event-production-boundary.md"), /outbox/i);
});

test("no arbitrary public Core mutation endpoint is introduced", () => {
  const apiFiles = filesBelow("functions/api/");
  const forbidden = /\b(?:grantXp|grantCoins|unlockAchievement|recordMissionProgress|claimMissionReward|publishCoreEvent|publishOfficialCoreEvent)\b/;
  const allowedClaim = "functions/api/platform/missions/[id]/claim.ts";
  const violations = apiFiles.filter(path => !path.replaceAll("\\", "/").endsWith(allowedClaim) && forbidden.test(readFileSync(path, "utf8")));
  assert.deepEqual(violations, []);
  const claim = read("functions/api/platform/missions/[id]/claim.ts");
  assert.match(claim, /requireUser/);
  assert.match(claim, /claimMissionReward/);
  assert.doesNotMatch(claim, /grantXp|grantCoins|recordMissionProgress|request\.json/);
});
