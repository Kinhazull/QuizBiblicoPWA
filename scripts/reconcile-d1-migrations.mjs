import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateMigration0021 } from "./lib/d1-migration-validator.mjs";
import { assertSnapshotTableAllowlist, buildApplicationSchemaQuery } from "./lib/d1-snapshot-policy.mjs";

const config = "workers/journey-awards/wrangler.jsonc";
const database = "quiz-biblico-db";
const targetMigration = "0021_award_job_checkpoints.sql";
const baseline = [
  "0000_competition_foundation.sql", "0001_profile_preferences.sql", "0002_login_security.sql",
  "0003_persistent_badges.sql", "0004_notification_receipts.sql", "0005_attempt_continuity.sql",
  "0006_legal_consents.sql", "0007_question_bank.sql", "0008_permissions_collaboration.sql",
  "0009_calendar_seasons_events.sql", "0010_smart_review.sql", "0011_communication_profile_recovery.sql",
  "0012_security_privacy.sql", "0013_ai_question_suggestions.sql", "0014_batch_operations.sql",
  "0015_season_closure.sql", "0016_runtime_hardening.sql", "0017_approve_curated_base.sql",
  "0018_competitive_integrity.sql", "0019_round_award_processing.sql", "0020_attempt_question_clock.sql",
];
const expectedFinalLedger = [...baseline, targetMigration];

const requiredTables = [
  "organizations", "groups", "users", "invitations", "sessions", "rounds", "questions", "choices", "attempts",
  "attempt_answers", "audit_logs", "login_security", "user_badges", "notification_receipts", "legal_consents",
  "question_bank", "question_bank_choices", "user_permissions", "question_collaborators", "question_revisions",
  "round_collaborators", "seasons", "user_review_progress", "announcements", "account_recovery_codes",
  "abuse_counters", "privacy_requests", "ai_question_suggestions", "batch_operations", "season_snapshots",
  "season_awards", "round_award_processing", "round_badge_reconciliations",
];
const requiredColumns = {
  users: ["nickname", "use_nickname_in_ranking", "profile_public", "bio", "favorite_book", "favorite_verse"],
  attempts: ["resumed_count", "last_resumed_at", "question_order_json", "current_question_started_at"],
  sessions: ["user_agent", "ip_hash"],
  questions: ["source_question_id"],
  choices: ["position"],
  question_bank: ["review_status", "version", "updated_by"],
  rounds: ["season_id", "round_type", "featured", "advanced_rules_json"],
  seasons: ["closed_at", "snapshot_created_at"],
  legal_consents: ["organization_id", "document_type", "ip_hash", "user_agent"],
};
const requiredIndexes = [
  "choices_question_position_uq", "attempt_answers_order_uq", "attempts_user_round_mode_number_uq",
  "questions_round_source_uq", "round_award_processing_time_idx",
];

function runWrangler(command) {
  const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(executable, [
    "exec", "wrangler", "d1", "execute", database, "--remote", "--config", config,
    "--json", "--command", command,
  ], { encoding: "utf8", env: process.env });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "Wrangler D1 failed").trim());
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
  const path = resolve("drizzle", targetMigration);
  const sql = readFileSync(path, "utf8");
  validateMigration0021(sql, targetMigration);
}

function validateLegacySchema() {
  const tableList = requiredTables.map(quoteValue).join(",");
  const indexList = requiredIndexes.map(quoteValue).join(",");
  const tableCount = scalar(
    `SELECT COUNT(*) AS value FROM sqlite_master WHERE type='table' AND name IN (${tableList})`,
    "value",
  );
  const indexCount = scalar(
    `SELECT COUNT(*) AS value FROM sqlite_master WHERE type='index' AND name IN (${indexList})`,
    "value",
  );
  const missingColumns = Object.entries(requiredColumns).flatMap(([table, columns]) => {
    const found = new Set(rows(`SELECT name FROM pragma_table_info(${quoteValue(table)})`).map((row) => String(row.name)));
    return columns.filter((column) => !found.has(column)).map((column) => `${table}.${column}`);
  });
  if (tableCount !== requiredTables.length || indexCount !== requiredIndexes.length || missingColumns.length) {
    throw new Error(
      `Legacy schema is incomplete: tables ${tableCount}/${requiredTables.length}, ` +
      `indexes ${indexCount}/${requiredIndexes.length}, missing columns ${missingColumns.join(", ") || "none"}.`,
    );
  }
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
    console.log("Legacy schema and migration baseline are already consistent. Migration 0021 is ready for validation.");
    return;
  }
  throw new Error(`Unsafe migration ledger state: expected 0 or ${baseline.length} rows before reconciliation, found ${ledger.length}.`);
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
  const insert = `BEGIN;${baseline.map((name) =>
    `INSERT INTO d1_migrations(name) VALUES(${quoteValue(name)})`).join(";")};COMMIT;`;
  runWrangler(insert);
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
  console.log("Final state verified: 22 migrations, no pending migration, checkpoint table and index present.");
}

function createSnapshot(path) {
  validateLegacySchema();
  const schemaObjects = rows(buildApplicationSchemaQuery(requiredTables));
  const rowCounts = Object.fromEntries(requiredTables.map((table) => [
    table,
    scalar(`SELECT COUNT(*) AS value FROM ${quoteIdentifier(table)}`, "value"),
  ]));
  writeFileSync(path, JSON.stringify({ database, createdAt: new Date().toISOString(), schemaObjects, rowCounts }, null, 2));
  console.log(`Pre-change integrity snapshot written to ${path}.`);
}

function compareSnapshot(path) {
  const snapshot = JSON.parse(readFileSync(path, "utf8"));
  assertSnapshotTableAllowlist(snapshot.rowCounts, requiredTables);
  for (const [table, before] of Object.entries(snapshot.rowCounts || {})) {
    const exists = scalar(
      `SELECT COUNT(*) AS value FROM sqlite_master WHERE type='table' AND name=${quoteValue(table)}`,
      "value",
    );
    if (exists !== 1) throw new Error(`Pre-existing table ${table} disappeared.`);
    const after = scalar(`SELECT COUNT(*) AS value FROM ${quoteIdentifier(table)}`, "value");
    if (after < Number(before)) {
      throw new Error(`Row count decreased in ${table}: before=${before}, after=${after}.`);
    }
  }
  const currentSchema = new Map(rows(buildApplicationSchemaQuery(requiredTables))
    .map((item) => [`${item.type}:${item.name}`, item]));
  for (const object of snapshot.schemaObjects || []) {
    const current = currentSchema.get(`${object.type}:${object.name}`);
    if (!current || current.tbl_name !== object.tbl_name || current.sql !== object.sql) {
      throw new Error(`Pre-existing schema object changed unexpectedly: ${object.type} ${object.name}.`);
    }
  }
  console.log(`Integrity preserved: ${Object.keys(snapshot.rowCounts || {}).length} pre-existing tables remain without row loss.`);
}

const snapshotIndex = process.argv.indexOf("--snapshot");
const compareIndex = process.argv.indexOf("--compare-snapshot");

if (process.argv.includes("--apply")) applyBaseline();
else if (process.argv.includes("--verify-pending")) verifyPending();
else if (process.argv.includes("--verify-final")) verifyFinal();
else if (snapshotIndex >= 0) createSnapshot(resolve(process.argv[snapshotIndex + 1] || "d1-before.json"));
else if (compareIndex >= 0) compareSnapshot(resolve(process.argv[compareIndex + 1] || "d1-before.json"));
else dryRun();
