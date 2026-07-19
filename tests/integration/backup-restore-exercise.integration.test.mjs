import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase, createValidRound, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { restoreCoreBackupForExercise } from "../helpers/backup-restore.mjs";

test("confidential backup core restores into an isolated migrated database with relationships intact", t => {
  const source = createTestDatabase(), target = createTestDatabase();
  t.after(source.close); t.after(target.close);
  seedOrganization(source); seedUser(source, { id: "admin", role: "admin" });
  createValidRound(source, { createdBy: "admin" });
  const tables = {};
  for (const table of ["organizations", "groups", "users", "rounds", "questions", "choices"]) {
    tables[table] = source.raw.prepare(`SELECT * FROM ${table}`).all().map(row => {
      if (table !== "users") return row;
      const safe = Object.fromEntries(Object.entries(row).filter(([key]) => !["password_hash", "password_salt"].includes(key)));
      return safe;
    });
  }
  const counts = restoreCoreBackupForExercise(target.raw, {
    format: "conte-os-feitos-backup",
    schemaVersion: 27,
    credentialsExcluded: true,
    tables,
  });
  assert.deepEqual(counts, { organizations: 1, groups: 1, users: 1, rounds: 1, questions: 10, choices: 40 });
  assert.equal(target.raw.prepare("PRAGMA foreign_key_check").all().length, 0);
  const restored = target.raw.prepare("SELECT status,must_change_password,password_hash FROM users WHERE id='admin'").get();
  assert.deepEqual({ ...restored }, { status: "suspended", must_change_password: 1, password_hash: "RESTORE_REQUIRES_PASSWORD_RESET" });
});
