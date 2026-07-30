export function assertMigrationLedgerPrefix(actual, expected) {
  if (!Array.isArray(actual) || !Array.isArray(expected)) {
    throw new Error("Migration ledgers must be arrays.");
  }
  if (actual.length > expected.length) {
    throw new Error(
      `Remote migration ledger has ${actual.length} entries, but only ${expected.length} local migrations are approved.`,
    );
  }
  const mismatch = actual.findIndex((name, index) => name !== expected[index]);
  if (mismatch >= 0) {
    throw new Error(
      `Remote migration ledger diverges at position ${mismatch + 1}: ` +
      `expected ${JSON.stringify(expected[mismatch])}, found ${JSON.stringify(actual[mismatch])}.`,
    );
  }
}

export function pendingMigrationNames(actual, expected) {
  assertMigrationLedgerPrefix(actual, expected);
  return expected.slice(actual.length);
}

export function schemaTablesForLedger(actual, expected, finalTables, introducedTablesByMigration) {
  const pending = pendingMigrationNames(actual, expected);
  const pendingTables = new Set(pending.flatMap((name) => introducedTablesByMigration[name] || []));
  return finalTables.filter((table) => !pendingTables.has(table));
}

export function promotionPreflightMessage(appliedCount, pending) {
  if (!Array.isArray(pending)) throw new Error("Pending migrations must be an array.");
  if (pending.length === 0) {
    return "Promotion preflight verified:\n" +
      "Production already matches the approved local ledger.\n" +
      "No migrations are pending.";
  }
  return `Promotion preflight verified: ${appliedCount} applied migration(s); ` +
    `${pending.length} exact pending migration(s): ${pending.join(", ")}.`;
}
