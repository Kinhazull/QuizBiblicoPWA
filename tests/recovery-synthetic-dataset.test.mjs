import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { buildRecoverySyntheticSql, RECOVERY_SYNTHETIC_MANIFEST as m } from "../scripts/lib/recovery-synthetic-dataset.mjs";

const migrationsDirectory = fileURLToPath(new URL("../drizzle/", import.meta.url));

test("synthetic recovery SQL is deterministic, complete through 0039 and locally restorable", () => {
  const first = buildRecoverySyntheticSql({ migrationsDirectory });
  const second = buildRecoverySyntheticSql({ migrationsDirectory });
  assert.equal(first, second);
  assert.match(first, /SYNTHETIC RECOVERY DATA ONLY/);
  assert.match(first, /MIGRATION 0039_administrative_mfa\.sql/);
  assert.doesNotMatch(first, /quiz-biblico-db|33fc35a0-46cf-4756-b6be-89b07371256c|MFA_ENCRYPTION_KEY|D1_BACKUP_ENCRYPTION_KEY/);

  const db = new DatabaseSync(":memory:");
  db.exec(first);
  assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  assert.equal(db.prepare("SELECT COUNT(*) total FROM d1_migrations").get().total, 40);
  assert.equal(db.prepare("SELECT name FROM d1_migrations ORDER BY id DESC LIMIT 1").get().name, "0039_administrative_mfa.sql");
  assert.deepEqual({ ...db.prepare("SELECT total_xp totalXp,coins FROM user_platform_progress WHERE user_id=?").get(m.participantId) }, { totalXp: m.totalXp, coins: m.coins });
  assert.equal(db.prepare("SELECT COUNT(*) total FROM content_items WHERE organization_id=?").get(m.organizationId).total, m.cmsItems);
  assert.equal(db.prepare("SELECT COUNT(*) total FROM universal_content_library WHERE organization_id=?").get(m.organizationId).total, m.libraryItems);
  assert.equal(db.prepare("SELECT COUNT(*) total FROM platform_events WHERE id=?").get(m.eventId).total, 1);
  assert.equal(db.prepare("SELECT COUNT(*) total FROM platform_event_content_reservations WHERE id=?").get(m.reservationId).total, 1);
  assert.equal(db.prepare("SELECT delivery_state FROM quiz_core_event_outbox WHERE event_id=?").get(m.outboxEventId).delivery_state, m.outboxState);
  assert.deepEqual({ ...db.prepare("SELECT status,key_version keyVersion FROM user_mfa WHERE user_id=?").get(m.ownerId) }, { status: m.mfaStatus, keyVersion: m.mfaKeyVersion });
  db.close();
});
