import assert from "node:assert/strict";
import test from "node:test";
import {
  assertMigrationLedgerPrefix,
  pendingMigrationNames,
  promotionPreflightMessage,
  missingRequiredColumns,
  schemaColumnsForLedger,
  schemaTablesForLedger,
} from "../scripts/lib/d1-migration-promotion-policy.mjs";
import {
  INTRODUCED_COLUMNS_BY_MIGRATION,
  REQUIRED_COLUMNS,
} from "../shared/operational-schema-contract.mjs";

test("accepts an exact remote prefix and returns only the pending suffix", () => {
  const expected = ["0030.sql", "0031.sql"];
  assert.doesNotThrow(() => assertMigrationLedgerPrefix(["0030.sql"], expected));
  assert.deepEqual(pendingMigrationNames(["0030.sql"], expected), ["0031.sql"]);
  assert.match(
    promotionPreflightMessage(1, ["0031.sql"]),
    /1 exact pending migration\(s\): 0031\.sql/,
  );
});

test("accepts a fully synchronized ledger with no pending migrations", () => {
  const expected = ["0030.sql", "0031.sql"];
  assert.deepEqual(pendingMigrationNames(expected, expected), []);
  assert.equal(
    promotionPreflightMessage(expected.length, []),
    "Promotion preflight verified:\n" +
      "Production already matches the approved local ledger.\n" +
      "No migrations are pending.",
  );
});

test("rejects a divergent remote migration history", () => {
  assert.throws(
    () => assertMigrationLedgerPrefix(["0030.sql", "unexpected.sql"], ["0030.sql", "0031.sql"]),
    /diverges at position 2/,
  );
});

test("rejects an unexpected migration beyond the approved local ledger", () => {
  assert.throws(
    () => assertMigrationLedgerPrefix(["0030.sql", "0031.sql"], ["0030.sql"]),
    /only 1 local migrations are approved/,
  );
});

test("validates the pre-migration schema without requiring tables from the pending migration", () => {
  const tables = schemaTablesForLedger(
    ["0030.sql"],
    ["0030.sql", "0031.sql"],
    ["users", "content_items", "content_versions"],
    { "0031.sql": ["content_items", "content_versions"] },
  );
  assert.deepEqual(tables, ["users"]);
});

test("0036 preflight accepts the 0035 schema and final verification requires Event tables", () => {
  const expected = ["0035_free_play_participations.sql", "0036_platform_events.sql"];
  const eventTables = [
    "platform_events", "platform_event_games", "platform_event_content_items",
    "platform_event_content_reservations", "platform_event_participations", "platform_event_reward_ledger",
  ];
  const finalTables = ["users", ...eventTables];
  const introduced = { "0036_platform_events.sql": eventTables };
  assert.deepEqual(pendingMigrationNames([expected[0]], expected), [expected[1]]);
  assert.deepEqual(schemaTablesForLedger([expected[0]], expected, finalTables, introduced), ["users"]);
  assert.deepEqual(schemaTablesForLedger(expected, expected, finalTables, introduced), finalTables);
});

test("0037 preflight validates the 0036 baseline without requiring pending editorial columns", () => {
  const expected = ["0036_platform_events.sql", "0037_editorial_governance_assets.sql"];
  const applied = [expected[0]];
  const columns = schemaColumnsForLedger(
    applied,
    expected,
    REQUIRED_COLUMNS,
    INTRODUCED_COLUMNS_BY_MIGRATION,
  );

  assert.deepEqual(pendingMigrationNames(applied, expected), [expected[1]]);
  assert.equal(columns.content_items, undefined);
  assert.equal(columns.platform_events, undefined);
});

test("0037 preflight still rejects a schema incomplete relative to 0036", () => {
  const expected = ["0036_platform_events.sql", "0037_editorial_governance_assets.sql"];
  const columns = schemaColumnsForLedger(
    [expected[0]],
    expected,
    REQUIRED_COLUMNS,
    INTRODUCED_COLUMNS_BY_MIGRATION,
  );
  const actual = Object.fromEntries(Object.entries(columns).map(([table, names]) => [table, [...names]]));
  actual.users = actual.users.filter((column) => column !== "nickname");

  assert.deepEqual(missingRequiredColumns(actual, columns), ["users.nickname"]);
});

test("0037 final contract requires every editorial governance column", () => {
  const expected = ["0036_platform_events.sql", "0037_editorial_governance_assets.sql"];
  const columns = schemaColumnsForLedger(expected, expected, REQUIRED_COLUMNS, INTRODUCED_COLUMNS_BY_MIGRATION);

  assert.deepEqual(columns.content_items, [
    "editorial_status", "submitted_by", "submitted_at", "reviewed_by", "reviewed_at", "review_decision",
    "review_comment", "rollback_source_version",
  ]);
  assert.deepEqual(columns.platform_events, ["cover_asset_id"]);
  assert.deepEqual(missingRequiredColumns(columns, columns), []);
});

test("0037 final verification rejects any missing final column", () => {
  const expected = ["0036_platform_events.sql", "0037_editorial_governance_assets.sql"];
  const columns = schemaColumnsForLedger(expected, expected, REQUIRED_COLUMNS, INTRODUCED_COLUMNS_BY_MIGRATION);
  const incomplete = { ...columns, content_items: columns.content_items.filter((name) => name !== "review_comment") };

  assert.deepEqual(missingRequiredColumns(incomplete, columns), ["content_items.review_comment"]);
});
