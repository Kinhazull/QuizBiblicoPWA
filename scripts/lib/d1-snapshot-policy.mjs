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
