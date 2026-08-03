import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

test("all migrations are sequential and apply to an empty SQLite database", async () => {
  const files = (await readdir(new URL("../drizzle/", import.meta.url))).filter(file => file.endsWith(".sql")).sort();
  assert.equal(files.length, 37);
  files.forEach((file, index) => assert.equal(file.slice(0, 4), String(index).padStart(4, "0")));
  const db = new DatabaseSync(":memory:");
  for (const file of files) db.exec(await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name);
  for (const required of ["users", "rounds", "question_bank", "seasons", "announcements", "privacy_requests", "ai_question_suggestions", "batch_operations", "season_snapshots", "season_awards", "round_award_processing", "round_award_participant_processing", "user_platform_progress", "platform_xp_ledger", "platform_coin_ledger", "platform_achievement_definitions", "user_platform_achievements", "platform_mission_definitions", "user_platform_missions", "user_platform_mission_progress_events", "core_platform_events", "core_platform_event_processing", "user_platform_statistics", "user_platform_game_statistics", "user_platform_statistics_active_days", "user_platform_statistics_official_days_utc", "user_platform_game_difficulty_statistics", "platform_statistics_event_checkpoints", "quiz_core_event_outbox", "content_items", "content_versions", "universal_content_library", "generated_game_selections", "generated_game_selection_items", "generated_game_participations", "generated_game_participation_usage", "platform_events", "platform_event_games", "platform_event_content_items", "platform_event_content_reservations", "platform_event_participations", "platform_event_reward_ledger"]) assert.ok(tables.includes(required), `missing ${required}`);
  assert.ok(db.prepare("PRAGMA index_list('content_items')").all().some(row => row.name === "content_items_org_updated_idx"));
  assert.ok(db.prepare("PRAGMA index_list('content_versions')").all().some(row => row.name === "content_versions_content_version_idx"));
  assert.ok(db.prepare("PRAGMA index_list('universal_content_library')").all().some(row => row.name === "universal_content_library_eligible_idx"));
  const librarySql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='universal_content_library'").get().sql;
  assert.match(librarySql, /RESERVED_DAILY/);
  assert.match(librarySql, /RESERVED_EVENT/);
  assert.doesNotMatch(librarySql, /game_type IN/);
  const selectionIndexes = db.prepare("PRAGMA index_list('generated_game_selections')").all().map(row => row.name);
  assert.ok(selectionIndexes.includes("generated_game_selections_mode_key_idx"));
  assert.ok(selectionIndexes.includes("generated_game_selections_expiration_idx"));
  const selectionItemsIndexes = db.prepare("PRAGMA index_list('generated_game_selection_items')").all().map(row => row.name);
  assert.ok(selectionItemsIndexes.includes("generated_game_selection_items_content_idx"));
  const participationIndexes = db.prepare("PRAGMA index_list('generated_game_participations')").all().map(row => row.name);
  assert.ok(participationIndexes.includes("generated_game_participations_user_status_idx"));
  const participationSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='generated_game_participations'").get().sql;
  assert.match(participationSql, /'DAILY', 'FREE_PLAY'/);
  const contentItemsSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='content_items'").get().sql;
  assert.match(contentItemsSql, /status IN \('DRAFT', 'PUBLISHED'\)/);
  const sessionColumns = db.prepare("PRAGMA table_info(sessions)").all().map(row => row.name);
  assert.ok(sessionColumns.includes("ip_hash"));
  assert.ok(sessionColumns.includes("user_agent"));
  const attemptColumns = db.prepare("PRAGMA table_info(attempts)").all().map(row => row.name);
  assert.ok(attemptColumns.includes("question_order_json"));
  const attemptIndexes = db.prepare("PRAGMA index_list('attempts')").all().map(row => row.name);
  assert.ok(attemptIndexes.includes("attempts_user_round_mode_number_uq"));
  assert.ok(db.prepare("PRAGMA table_info(choices)").all().some(row => row.name === "position"));
  assert.ok(db.prepare("PRAGMA index_list('attempt_answers')").all().some(row => row.name === "attempt_answers_order_uq"));
  const outboxColumns = db.prepare("PRAGMA table_info(quiz_core_event_outbox)").all().map(row => row.name);
  assert.ok(outboxColumns.includes("lease_token"));
  assert.ok(outboxColumns.includes("lease_until"));
  assert.ok(db.prepare("PRAGMA index_list('quiz_core_event_outbox')").all().some(row => row.name === "quiz_core_event_outbox_claim_idx"));
  const outboxSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='quiz_core_event_outbox'").get().sql;
  assert.match(outboxSql, /event_version IN \(1, 2\)/);
  db.close();
});

test("migration 0036 applies once over 0035 without removing prior schema", async () => {
  const files = (await readdir(new URL("../drizzle/", import.meta.url))).filter(file => file.endsWith(".sql")).sort();
  const db = new DatabaseSync(":memory:");
  for (const file of files.slice(0, 36)) {
    db.exec(await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  }
  const before = new Set(db.prepare("SELECT type || ':' || name identity FROM sqlite_master WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%'").all().map(row => row.identity));
  const eventSql = await readFile(new URL("../drizzle/0036_platform_events.sql", import.meta.url), "utf8");
  db.exec(eventSql);
  const after = new Set(db.prepare("SELECT type || ':' || name identity FROM sqlite_master WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%'").all().map(row => row.identity));
  for (const identity of before) assert.ok(after.has(identity), `0036 removed ${identity}`);

  const eventTables = [...after].filter(identity => identity.startsWith("table:platform_event"));
  const eventIndexes = [...after].filter(identity => identity.startsWith("index:platform_event"));
  const eventTriggers = [...after].filter(identity => identity.startsWith("trigger:platform_event"));
  assert.equal(eventTables.length, 6);
  assert.equal(eventIndexes.length, 6);
  assert.deepEqual(eventTriggers, ["trigger:platform_event_reservation_no_overlap"]);
  assert.throws(() => db.exec(eventSql), /already exists/);
  assert.equal(db.prepare("SELECT COUNT(*) total FROM sqlite_master WHERE name='platform_events'").get().total, 1);
  db.close();
});

test("migration 0036 is recognized by the promotion and final-schema contracts", async () => {
  const reconciler = await readFile(new URL("../scripts/reconcile-d1-migrations.mjs", import.meta.url), "utf8");
  assert.match(reconciler, /"0036_platform_events\.sql"/);
  for (const table of [
    "platform_events", "platform_event_games", "platform_event_content_items",
    "platform_event_content_reservations", "platform_event_participations", "platform_event_reward_ledger",
  ]) assert.match(reconciler, new RegExp(`"${table}"`));
  for (const index of [
    "platform_events_org_window_idx", "platform_event_games_org_event_idx", "platform_event_content_lookup_idx",
    "platform_event_reservations_conflict_idx", "platform_event_participations_user_idx", "platform_event_rewards_user_idx",
  ]) assert.match(reconciler, new RegExp(`"${index}"`));
});
