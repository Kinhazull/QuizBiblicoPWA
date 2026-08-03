import assert from "node:assert/strict";
import test from "node:test";
import {
  assertMigrationLedgerPrefix,
  pendingMigrationNames,
  promotionPreflightMessage,
  schemaTablesForLedger,
} from "../scripts/lib/d1-migration-promotion-policy.mjs";

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
