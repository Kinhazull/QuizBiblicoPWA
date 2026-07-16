const CORE_RESTORE_ORDER = ["organizations", "groups", "users", "rounds", "questions", "choices"];

export function restoreCoreBackupForExercise(target, backup) {
  if (backup?.format !== "conte-os-feitos-backup" || !backup?.credentialsExcluded) {
    throw new Error("unsupported_backup");
  }
  target.exec("BEGIN IMMEDIATE");
  try {
    for (const table of CORE_RESTORE_ORDER) {
      const allowed = new Set(target.prepare(`PRAGMA table_info(${table})`).all().map(column => column.name));
      for (const source of backup.tables?.[table] || []) {
        const row = { ...source };
        if (table === "users") {
          row.password_hash = "RESTORE_REQUIRES_PASSWORD_RESET";
          row.password_salt = "RESTORE_LOCKED";
          row.status = "suspended";
          row.must_change_password = 1;
        }
        const entries = Object.entries(row).filter(([column]) => allowed.has(column));
        const columns = entries.map(([column]) => `"${column}"`).join(",");
        const placeholders = entries.map(() => "?").join(",");
        target.prepare(`INSERT INTO ${table}(${columns}) VALUES(${placeholders})`).run(...entries.map(([, value]) => value));
      }
    }
    target.exec("COMMIT");
  } catch (error) {
    target.exec("ROLLBACK");
    throw error;
  }
  return Object.fromEntries(CORE_RESTORE_ORDER.map(table => [table, target.prepare(`SELECT COUNT(*) total FROM ${table}`).get().total]));
}
