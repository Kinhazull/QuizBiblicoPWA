const MIGRATION_NAME = /^\d{4}_[a-z0-9_]+\.sql$/;

const quoteValue = (value) => `'${String(value).replaceAll("'", "''")}'`;

export function buildAtomicBaselineInsert(migrationNames) {
  if (!Array.isArray(migrationNames) || migrationNames.length === 0) {
    throw new Error("Migration baseline cannot be empty.");
  }
  const invalid = migrationNames.find((name) => !MIGRATION_NAME.test(name));
  if (invalid) throw new Error(`Invalid migration name in baseline: ${invalid}.`);
  const values = migrationNames.map((name) => `(${quoteValue(name)})`).join(",");
  return `INSERT INTO d1_migrations(name) VALUES ${values}`;
}
