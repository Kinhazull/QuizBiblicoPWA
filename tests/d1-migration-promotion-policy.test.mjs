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
