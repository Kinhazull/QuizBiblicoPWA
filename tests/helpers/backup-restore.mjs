export const ORGANIZATIONAL_RESTORE_ORDER = [
  "organizations", "groups", "users", "content_items", "content_versions", "universal_content_library",
  "generated_game_selections", "generated_game_selection_items", "generated_game_participations",
  "generated_game_participation_usage", "user_platform_progress", "platform_xp_ledger", "platform_coin_ledger",
  "platform_events", "platform_event_games", "platform_event_content_items", "platform_event_content_reservations",
  "platform_event_participations", "platform_event_reward_ledger", "rounds", "questions", "choices",
];

export function restoreCoreBackupForExercise(target, backup) {
  if (backup?.format !== "conte-os-feitos-backup" || !backup?.credentialsExcluded || Number(backup.schemaVersion) < 36) {
    throw new Error("unsupported_backup");
  }
  const organizations = backup.tables?.organizations || [];
  if (organizations.length !== 1 || String(organizations[0].id) !== String(backup.organizationId)) throw new Error("organization_mismatch");
  target.exec("BEGIN IMMEDIATE");
  try {
    for (const table of ORGANIZATIONAL_RESTORE_ORDER) {
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
        target.prepare(`INSERT OR IGNORE INTO ${table}(${columns}) VALUES(${placeholders})`).run(...entries.map(([, value]) => value));
      }
    }
    target.exec("COMMIT");
  } catch (error) {
    target.exec("ROLLBACK");
    throw error;
  }
  const foreignKeyViolations = target.prepare("PRAGMA foreign_key_check").all();
  if (foreignKeyViolations.length) throw new Error("restore_integrity_failed");
  return Object.fromEntries(ORGANIZATIONAL_RESTORE_ORDER.map(table => [table, target.prepare(`SELECT COUNT(*) total FROM ${table}`).get().total]));
}
