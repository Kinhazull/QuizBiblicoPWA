import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { validateMigration0021, validateMigration0022 } from "./lib/d1-migration-validator.mjs";
import {
  assertMigrationLedgerPrefix,
  missingRequiredColumns,
  pendingMigrationNames,
  promotionPreflightMessage,
  schemaColumnsForLedger,
  schemaTablesForLedger,
} from "./lib/d1-migration-promotion-policy.mjs";
import {
  assertSnapshotTableAllowlist,
  authorizedSchemaChanges,
  buildApplicationSchemaQuery,
  compareSchemaObjects,
  migrationsAppliedAfterSnapshot,
} from "./lib/d1-snapshot-policy.mjs";
import { buildAtomicBaselineInsert } from "./lib/d1-ledger-policy.mjs";
import {
  APPLICATION_TABLES,
  CRITICAL_INDEXES,
  INTRODUCED_COLUMNS_BY_MIGRATION,
  REQUIRED_COLUMNS,
} from "../shared/operational-schema-contract.mjs";

const config = "workers/journey-awards/wrangler.jsonc";
const database = "quiz-biblico-db";
const require = createRequire(import.meta.url);
const wranglerCli = require.resolve("wrangler");
const targetMigration = "0022_release_hardening.sql";
const baseline = [
  "0000_competition_foundation.sql", "0001_profile_preferences.sql", "0002_login_security.sql",
  "0003_persistent_badges.sql", "0004_notification_receipts.sql", "0005_attempt_continuity.sql",
  "0006_legal_consents.sql", "0007_question_bank.sql", "0008_permissions_collaboration.sql",
  "0009_calendar_seasons_events.sql", "0010_smart_review.sql", "0011_communication_profile_recovery.sql",
  "0012_security_privacy.sql", "0013_ai_question_suggestions.sql", "0014_batch_operations.sql",
  "0015_season_closure.sql", "0016_runtime_hardening.sql", "0017_approve_curated_base.sql",
  "0018_competitive_integrity.sql", "0019_round_award_processing.sql", "0020_attempt_question_clock.sql",
  "0021_award_job_checkpoints.sql",
];
const foundationMigrations = [
  "0023_platform_user_progress.sql",
  "0024_platform_achievements.sql",
  "0025_platform_missions.sql",
  "0026_platform_event_engine.sql",
  "0027_platform_statistics.sql",
  "0028_quiz_core_event_outbox.sql",
  "0029_quiz_core_event_outbox_leases.sql",
  "0030_achievement_statistics_projections.sql",
  "0031_universal_content_drafts.sql",
  "0032_universal_content_library.sql",
  "0033_universal_game_generator.sql",
  "0034_daily_objective_participations.sql",
  "0035_free_play_participations.sql",
  "0036_platform_events.sql",
  "0037_editorial_governance_assets.sql",
];
const expectedFinalLedger = [...baseline, targetMigration, ...foundationMigrations];
const introducedTablesByMigration = {
  "0031_universal_content_drafts.sql": ["content_items", "content_versions"],
  "0032_universal_content_library.sql": ["universal_content_library"],
  "0033_universal_game_generator.sql": [
    "generated_game_selections",
    "generated_game_selection_items",
  ],
  "0034_daily_objective_participations.sql": [
    "generated_game_participations",
    "generated_game_participation_usage",
  ],
  "0036_platform_events.sql": [
    "platform_events", "platform_event_games", "platform_event_content_items",
    "platform_event_content_reservations", "platform_event_participations", "platform_event_reward_ledger",
  ],
  "0037_editorial_governance_assets.sql": ["content_review_comments", "asset_registry", "content_assets"],
};
const introducedIndexesByMigration = {
  "0032_universal_content_library.sql": [
    "universal_content_library_eligible_idx",
    "universal_content_library_publication_idx",
  ],
  "0033_universal_game_generator.sql": [
    "generated_game_selections_org_created_idx",
    "generated_game_selections_mode_key_idx",
    "generated_game_selections_expiration_idx",
    "generated_game_selection_items_content_idx",
  ],
  "0034_daily_objective_participations.sql": [
    "generated_game_participations_user_status_idx",
  ],
  "0036_platform_events.sql": [
    "platform_events_org_window_idx", "platform_event_games_org_event_idx", "platform_event_content_lookup_idx",
    "platform_event_reservations_conflict_idx", "platform_event_participations_user_idx", "platform_event_rewards_user_idx",
  ],
  "0037_editorial_governance_assets.sql": [
    "content_items_org_editorial_status_idx", "content_review_comments_content_idx",
    "asset_registry_org_status_idx", "asset_registry_org_source_url_uq", "content_assets_asset_idx",
  ],
};
const modifiedSchemaObjectsByMigration = {
  "0035_free_play_participations.sql": [
    { type: "table", name: "generated_game_participations" },
    { type: "table", name: "generated_game_participation_usage" },
    { type: "index", name: "generated_game_participations_user_status_idx" },
  ],
  "0037_editorial_governance_assets.sql": [
    { type: "table", name: "content_items" },
    { type: "table", name: "platform_events" },
  ],
};

const reconcilerTables = [
  "organizations", "groups", "users", "invitations", "sessions", "rounds", "questions", "choices", "attempts",
  "attempt_answers", "audit_logs", "login_security", "user_badges", "notification_receipts", "legal_consents",
  "question_bank", "question_bank_choices", "user_permissions", "question_collaborators", "question_revisions",
  "round_collaborators", "seasons", "user_review_progress", "announcements", "account_recovery_codes",
  "abuse_counters", "privacy_requests", "ai_question_suggestions", "batch_operations", "season_snapshots",
  "season_awards", "round_award_processing", "round_badge_reconciliations", "round_award_participant_processing",
  "user_platform_progress", "platform_xp_ledger", "platform_coin_ledger", "platform_achievement_definitions",
  "user_platform_achievements", "platform_mission_definitions", "user_platform_missions",
  "user_platform_mission_progress_events", "core_platform_events", "core_platform_event_processing",
  "content_items", "content_versions", "universal_content_library",
  "generated_game_selections", "generated_game_selection_items",
  "generated_game_participations", "generated_game_participation_usage",
  "platform_events", "platform_event_games", "platform_event_content_items", "platform_event_content_reservations",
  "platform_event_participations", "platform_event_reward_ledger",
  "content_review_comments", "asset_registry", "content_assets",
  "user_platform_statistics", "user_platform_game_statistics", "user_platform_game_difficulty_statistics",
  "user_platform_statistics_active_days", "platform_statistics_event_checkpoints", "quiz_core_event_outbox",
  "user_platform_statistics_official_days_utc",
];
const requiredColumns = REQUIRED_COLUMNS;
const requiredTables = [...APPLICATION_TABLES];
const reconcilerIndexes = [
  "choices_question_position_uq", "attempt_answers_order_uq", "attempts_user_round_mode_number_uq",
  "questions_round_source_uq", "round_award_processing_time_idx", "round_award_participant_pending_idx",
  "user_platform_progress_org_user_idx", "platform_xp_ledger_user_time_idx", "platform_coin_ledger_user_time_idx",
  "platform_achievement_definitions_catalog_idx", "user_platform_achievements_org_user_idx",
  "platform_mission_definitions_catalog_idx", "user_platform_missions_current_idx",
  "core_platform_event_processing_retry_idx", "user_platform_statistics_org_activity_idx",
  "platform_statistics_event_checkpoints_user_idx", "quiz_core_event_outbox_delivery_idx",
  "quiz_core_event_outbox_claim_idx", "user_platform_statistics_official_days_utc_user_idx",
  "universal_content_library_eligible_idx", "universal_content_library_publication_idx",
  "generated_game_selections_org_created_idx", "generated_game_selections_mode_key_idx",
  "generated_game_selections_expiration_idx", "generated_game_selection_items_content_idx",
  "generated_game_participations_user_status_idx",
  "platform_events_org_window_idx", "platform_event_games_org_event_idx", "platform_event_content_lookup_idx",
  "platform_event_reservations_conflict_idx", "platform_event_participations_user_idx", "platform_event_rewards_user_idx",
  "content_items_org_editorial_status_idx", "content_review_comments_content_idx",
  "asset_registry_org_status_idx", "asset_registry_org_source_url_uq", "content_assets_asset_idx",
];
const requiredIndexes = [...CRITICAL_INDEXES];
if (reconcilerTables.some(table => !requiredTables.includes(table)) || reconcilerIndexes.some(index => !requiredIndexes.includes(index))) {
  throw new Error("Canonical operational schema contract is inconsistent with the reconciler.");
}

function runWrangler(command) {
  const result = spawnSync(process.execPath, [
    wranglerCli, "d1", "execute", database, "--remote", "--config", config,
    "--json", "--command", command,
  ], { encoding: "utf8", env: process.env });
  if (result.status !== 0) {
    throw new Error((result.error?.message || result.stderr || result.stdout || "Wrangler D1 failed").trim());
  }
  const parsed = JSON.parse(result.stdout);
  if (!Array.isArray(parsed) || !parsed.every((item) => item.success)) {
    throw new Error("D1 returned an unsuccessful result");
  }
  return parsed;
}

const quoteValue = (value) => `'${String(value).replaceAll("'", "''")}'`;
const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`;

function rows(command) {
  return runWrangler(command).flatMap((item) => item.results || []);
}

function scalar(command, key) {
  return Number(rows(command)[0]?.[key] ?? 0);
}

function ledgerNames() {
  return rows("SELECT name FROM d1_migrations ORDER BY id").map((row) => String(row.name));
}

function assertExactNames(actual, expected, label) {
  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
    throw new Error(`${label} mismatch. Expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}.`);
  }
}

function validateTargetMigration() {
  const migrationFiles = readdirSync(resolve("drizzle"))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  assertExactNames(migrationFiles, expectedFinalLedger, "Local migration files");
  validateMigration0021(readFileSync(resolve("drizzle", "0021_award_job_checkpoints.sql"), "utf8"));
  validateMigration0022(readFileSync(resolve("drizzle", targetMigration), "utf8"), targetMigration);
}

function validateLegacySchema(tables = requiredTables, indexes = requiredIndexes, columns = requiredColumns) {
  const tableList = tables.map(quoteValue).join(",");
  const indexList = indexes.map(quoteValue).join(",");
  const tableCount = scalar(
    `SELECT COUNT(*) AS value FROM sqlite_master WHERE type='table' AND name IN (${tableList})`,
    "value",
  );
  const indexCount = scalar(
    `SELECT COUNT(*) AS value FROM sqlite_master WHERE type='index' AND name IN (${indexList})`,
    "value",
  );
  const activeColumns = Object.fromEntries(Object.entries(columns)
    .filter(([table]) => tables.includes(table))
  );
  const actualColumns = Object.fromEntries(Object.entries(activeColumns)
    .map(([table]) => [
      table,
      rows(`SELECT name FROM pragma_table_info(${quoteValue(table)})`).map((row) => String(row.name)),
    ]));
  const missingColumns = missingRequiredColumns(actualColumns, activeColumns);
  if (tableCount !== tables.length || indexCount !== indexes.length || missingColumns.length) {
    throw new Error(
      `Legacy schema is incomplete: tables ${tableCount}/${tables.length}, ` +
      `indexes ${indexCount}/${indexes.length}, missing columns ${missingColumns.join(", ") || "none"}.`,
    );
  }
}

function promotableState() {
  validateTargetMigration();
  const ledger = ledgerNames();
  assertMigrationLedgerPrefix(ledger, expectedFinalLedger);
  const pending = pendingMigrationNames(ledger, expectedFinalLedger);
  if (ledger.length === 0) {
    throw new Error("Remote migration history is empty; use the historical reconciliation procedure first.");
  }
  const tables = schemaTablesForLedger(
    ledger,
    expectedFinalLedger,
    requiredTables,
    introducedTablesByMigration,
  );
  const applied = new Set(ledger);
  const pendingIndexes = new Set(Object.entries(introducedIndexesByMigration)
    .filter(([migration]) => !applied.has(migration))
    .flatMap(([, indexes]) => indexes));
  const columns = schemaColumnsForLedger(
    ledger,
    expectedFinalLedger,
    requiredColumns,
    INTRODUCED_COLUMNS_BY_MIGRATION,
  );
  validateLegacySchema(tables, requiredIndexes.filter(index => !pendingIndexes.has(index)), columns);
  return { ledger, pending, tables };
}

function verifyPromotable() {
  const { ledger, pending } = promotableState();
  console.log(promotionPreflightMessage(ledger.length, pending));
}

function dryRun() {
  validateTargetMigration();
  validateLegacySchema();
  const ledger = ledgerNames();
  if (ledger.length === 0) {
    console.log(`Legacy schema verified. Dry run: ${baseline.length} historical migrations can be recorded safely.`);
    return;
  }
  if (ledger.length === baseline.length) {
    assertExactNames(ledger, baseline, "Existing baseline ledger");
    console.log("Schema and migration history are consistent. Migration 0022 is ready for validation.");
    return;
  }
  if (ledger.length === expectedFinalLedger.length) {
    assertExactNames(ledger, expectedFinalLedger, "Final migration ledger");
    console.log(`Schema and migration history are consistent. All ${expectedFinalLedger.length} migrations are applied.`);
    return;
  }
  throw new Error(
    `Unsafe migration ledger state: expected 0, ${baseline.length}, or ${expectedFinalLedger.length} rows, ` +
    `found ${ledger.length}.`,
  );
}

function applyBaseline() {
  validateTargetMigration();
  validateLegacySchema();
  const current = ledgerNames();
  if (current.length === baseline.length) {
    assertExactNames(current, baseline, "Existing baseline ledger");
    console.log("Migration baseline was already reconciled; no write was necessary.");
    return;
  }
  if (current.length !== 0) {
    throw new Error(`Refusing to reconcile a non-empty, incomplete ledger containing ${current.length} rows.`);
  }
  runWrangler(buildAtomicBaselineInsert(baseline));
  assertExactNames(ledgerNames(), baseline, "Reconciled baseline ledger");
  console.log(`Migration baseline reconciled safely: ${baseline.length} historical migrations recorded.`);
}

function verifyPending() {
  validateTargetMigration();
  validateLegacySchema();
  assertExactNames(ledgerNames(), baseline, "Pending-migration baseline ledger");
  console.log(`Verified: only ${targetMigration} is eligible to remain pending.`);
}

function verifyFinal() {
  validateTargetMigration();
  validateLegacySchema();
  assertExactNames(ledgerNames(), expectedFinalLedger, "Final migration ledger");
  const table = scalar(
    "SELECT COUNT(*) AS value FROM sqlite_master WHERE type='table' AND name='round_award_participant_processing'",
    "value",
  );
  const index = scalar(
    "SELECT COUNT(*) AS value FROM sqlite_master WHERE type='index' AND name='round_award_participant_pending_idx'",
    "value",
  );
  if (table !== 1 || index !== 1) {
    throw new Error(`Migration 0021 objects are missing (table=${table}, index=${index}).`);
  }
  const auditIndex = scalar(
    "SELECT COUNT(*) AS value FROM sqlite_master WHERE type='index' AND name='audit_action_entity_time_idx'",
    "value",
  );
  if (auditIndex !== 1) throw new Error("Migration 0022 audit queue index is missing.");
  console.log(
    `Final state verified: ${expectedFinalLedger.length} migrations, no pending migration, ` +
    "legacy release objects and Foundation consumer dependencies present.",
  );
}

function createSnapshot(path) {
  const { ledger, tables } = promotableState();
  const schemaObjects = rows(buildApplicationSchemaQuery(tables));
  const rowCounts = Object.fromEntries(tables.map((table) => [
    table,
    scalar(`SELECT COUNT(*) AS value FROM ${quoteIdentifier(table)}`, "value"),
  ]));
  writeFileSync(
    path,
    JSON.stringify({ database, createdAt: new Date().toISOString(), ledger, schemaObjects, rowCounts }, null, 2),
  );
  console.log(`Pre-change integrity snapshot written to ${path}.`);
}

function compareSnapshot(path) {
  const snapshot = JSON.parse(readFileSync(path, "utf8"));
  assertMigrationLedgerPrefix(snapshot.ledger, expectedFinalLedger);
  const currentLedger = ledgerNames();
  assertMigrationLedgerPrefix(currentLedger, expectedFinalLedger);
  const appliedMigrations = migrationsAppliedAfterSnapshot(
    snapshot.ledger,
    currentLedger,
    expectedFinalLedger,
  );
  const authorizedChanges = authorizedSchemaChanges(
    appliedMigrations,
    modifiedSchemaObjectsByMigration,
  );
  const snapshotTables = schemaTablesForLedger(
    snapshot.ledger,
    expectedFinalLedger,
    requiredTables,
    introducedTablesByMigration,
  );
  assertSnapshotTableAllowlist(snapshot.rowCounts, snapshotTables);
  let rowRegressions = 0;
  for (const [table, before] of Object.entries(snapshot.rowCounts || {})) {
    const exists = scalar(
      `SELECT COUNT(*) AS value FROM sqlite_master WHERE type='table' AND name=${quoteValue(table)}`,
      "value",
    );
    if (exists !== 1) throw new Error(`Pre-existing table ${table} disappeared.`);
    const after = scalar(`SELECT COUNT(*) AS value FROM ${quoteIdentifier(table)}`, "value");
    if (after < Number(before)) {
      rowRegressions += 1;
      throw new Error(`Row count decreased in ${table}: before=${before}, after=${after}.`);
    }
  }
  const currentTables = schemaTablesForLedger(
    currentLedger,
    expectedFinalLedger,
    requiredTables,
    introducedTablesByMigration,
  );
  const currentSchema = rows(buildApplicationSchemaQuery(currentTables));
  const comparison = compareSchemaObjects(
    snapshot.schemaObjects || [],
    currentSchema,
    authorizedChanges,
  );
  for (const change of comparison.expectedModified) {
    console.log(
      `Allowed schema modification: ${change.object.type} ${change.object.name}; ` +
      `modified by: ${change.migrations.join(", ")}.`,
    );
  }
  console.log("Snapshot comparison");
  console.log(`Created objects: ${comparison.created.length}`);
  console.log(`Expected modified objects: ${comparison.expectedModified.length}`);
  console.log(`Unexpected modifications: ${comparison.unexpectedModified.length}`);
  console.log(`Removed objects: ${comparison.removed.length}`);
  console.log(`Row regressions: ${rowRegressions}`);
  console.log(
    `Integrity preserved: ${Object.keys(snapshot.rowCounts || {}).length} ` +
    "pre-existing tables remain without row loss.",
  );
}

const snapshotIndex = process.argv.indexOf("--snapshot");
const compareIndex = process.argv.indexOf("--compare-snapshot");

if (process.argv.includes("--apply")) applyBaseline();
else if (process.argv.includes("--verify-pending")) verifyPending();
else if (process.argv.includes("--verify-promotable")) verifyPromotable();
else if (process.argv.includes("--verify-final")) verifyFinal();
else if (snapshotIndex >= 0) createSnapshot(resolve(process.argv[snapshotIndex + 1] || "d1-before.json"));
else if (compareIndex >= 0) compareSnapshot(resolve(process.argv[compareIndex + 1] || "d1-before.json"));
else dryRun();
