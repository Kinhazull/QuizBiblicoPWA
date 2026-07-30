const quoteValue = (value) => `'${String(value).replaceAll("'", "''")}'`;

export function buildApplicationSchemaQuery(tableNames) {
  if (!Array.isArray(tableNames) || tableNames.length === 0) {
    throw new Error("Snapshot allowlist must contain at least one application table.");
  }
  const allowed = tableNames.map(quoteValue).join(",");
  return "SELECT type, name, tbl_name, sql FROM sqlite_master " +
    `WHERE (type='table' AND name IN (${allowed})) ` +
    `OR (type='index' AND tbl_name IN (${allowed})) ` +
    "ORDER BY type, name";
}

export function assertSnapshotTableAllowlist(rowCounts, allowedTables) {
  const actual = Object.keys(rowCounts || {}).sort();
  const expected = [...allowedTables].sort();
  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
    throw new Error(
      `Snapshot table allowlist mismatch. Expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}.`,
    );
  }
}

export function migrationsAppliedAfterSnapshot(snapshotLedger, currentLedger, expectedLedger) {
  if (!Array.isArray(snapshotLedger) || !Array.isArray(currentLedger) || !Array.isArray(expectedLedger)) {
    throw new Error("Migration ledgers must be arrays.");
  }
  const assertPrefix = (ledger, label) => {
    if (
      ledger.length > expectedLedger.length ||
      ledger.some((name, index) => name !== expectedLedger[index])
    ) {
      throw new Error(`${label} is not an exact prefix of the approved migration ledger.`);
    }
  };
  assertPrefix(snapshotLedger, "Snapshot migration ledger");
  assertPrefix(currentLedger, "Current migration ledger");
  if (
    currentLedger.length < snapshotLedger.length ||
    snapshotLedger.some((name, index) => name !== currentLedger[index])
  ) {
    throw new Error("Current migration ledger does not extend the snapshot migration ledger.");
  }
  return currentLedger.slice(snapshotLedger.length);
}

export function authorizedSchemaChanges(appliedMigrations, declarations) {
  const authorized = new Map();
  for (const migration of appliedMigrations) {
    for (const object of declarations[migration] || []) {
      const key = `${object.type}:${object.name}`;
      const previous = authorized.get(key) || [];
      authorized.set(key, [...previous, migration]);
    }
  }
  return authorized;
}

export function compareSchemaObjects(beforeObjects, afterObjects, authorizedChanges) {
  const before = new Map((beforeObjects || []).map((object) => [
    `${object.type}:${object.name}`,
    object,
  ]));
  const after = new Map((afterObjects || []).map((object) => [
    `${object.type}:${object.name}`,
    object,
  ]));
  const created = [];
  const expectedModified = [];
  const unexpectedModified = [];
  const removed = [];

  for (const [key, previous] of before) {
    const current = after.get(key);
    if (!current) {
      removed.push(previous);
      continue;
    }
    if (current.tbl_name === previous.tbl_name && current.sql === previous.sql) continue;
    const migrations = authorizedChanges.get(key);
    if (migrations?.length) {
      expectedModified.push({ object: current, migrations });
    } else {
      unexpectedModified.push(current);
    }
  }
  for (const [key, object] of after) {
    if (!before.has(key)) created.push(object);
  }

  if (removed.length) {
    const object = removed[0];
    throw new Error(`Pre-existing schema object was removed unexpectedly: ${object.type} ${object.name}.`);
  }
  if (unexpectedModified.length) {
    const object = unexpectedModified[0];
    throw new Error(`Pre-existing schema object changed unexpectedly: ${object.type} ${object.name}.`);
  }
  return { created, expectedModified, unexpectedModified, removed };
}
