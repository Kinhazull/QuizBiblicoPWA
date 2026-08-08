import assert from "node:assert/strict";
import test from "node:test";
import { createTestDatabase, createValidRound, seedOrganization, seedUser } from "../helpers/integration.mjs";
import { restoreCoreBackupForExercise } from "../helpers/backup-restore.mjs";
import { ORGANIZATIONAL_RESTORE_ORDER } from "../helpers/backup-restore.mjs";
import { createUniversalDraft, transitionUniversalContentStatus } from "../../functions/_lib/universal-content-store.ts";
import { ContentStatus, GameType } from "../../shared/content.ts";
import { createPlatformEvent, schedulePlatformEvent, startEventSelection } from "../../functions/_lib/platform-events.ts";

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
    schemaVersion: 36,
    organizationId: "org-1",
    credentialsExcluded: true,
    tables,
  });
  assert.equal(counts.organizations, 1);
  assert.equal(counts.users, 1);
  assert.equal(counts.rounds, 1);
  assert.equal(counts.questions, 10);
  assert.equal(counts.choices, 40);
  assert.equal(target.raw.prepare("PRAGMA foreign_key_check").all().length, 0);
  const restored = target.raw.prepare("SELECT status,must_change_password,password_hash FROM users WHERE id='admin'").get();
  assert.deepEqual({ ...restored }, { status: "suspended", must_change_password: 1, password_hash: "RESTORE_REQUIRES_PASSWORD_RESET" });
});

test("phase 4 organizational backup restores CMS, library, selection, progress and Event integrity", async t => {
  const source = createTestDatabase(), target = createTestDatabase();
  t.after(source.close); t.after(target.close);
  seedOrganization(source); seedUser(source, { id: "admin", role: "admin" }); seedUser(source, { id: "player" });
  const draft = await createUniversalDraft(source.env, "org-1", "admin", {
    gameType: GameType.WORDLE, status: ContentStatus.DRAFT,
    metadata: { category: "Palavras", tags: ["graça"], difficulty: "MEDIUM", biblicalReference: "Efésios 2:8", status: ContentStatus.DRAFT, internalNotes: null },
    payload: { word: "GRACA", hint: "Favor imerecido" },
  });
  const published = await transitionUniversalContentStatus(source.env, "org-1", "admin", draft.content.id, ContentStatus.PUBLISHED, draft.content.version);
  const event = await createPlatformEvent(source.env, { organizationId: "org-1", userId: "admin" }, {
    title: "Evento restaurável", startsAt: 1000, endsAt: 10000, timeZone: "America/Sao_Paulo",
    games: [{ gameType: GameType.WORDLE, contentItems: [{ contentId: draft.content.id, contentVersion: published.content.version }] }],
  }, 100);
  const scheduled = await schedulePlatformEvent(source.env, { organizationId: "org-1", userId: "admin" }, event.id, 200);
  await startEventSelection(source.env, { organizationId: "org-1", userId: "player" }, event.id, scheduled.event.games[0].selectionId, 2000);
  source.raw.prepare("INSERT INTO user_platform_progress(user_id,organization_id,total_xp,coins,created_at,updated_at) VALUES('player','org-1',120,8,0,1)").run();
  source.raw.prepare("INSERT INTO platform_event_reward_ledger(id,event_id,organization_id,user_id,reward_type,xp_amount,coin_amount,created_at) VALUES('reward',?,'org-1','player','participation',20,0,2)").run(event.id);

  const tables = {};
  for (const table of ORGANIZATIONAL_RESTORE_ORDER) tables[table] = source.raw.prepare(`SELECT * FROM ${table}`).all().map(row => {
    if (table !== "users") return { ...row };
    return Object.fromEntries(Object.entries(row).filter(([key]) => !["password_hash", "password_salt"].includes(key)));
  });
  const counts = restoreCoreBackupForExercise(target.raw, { format: "conte-os-feitos-backup", schemaVersion: 36,
    credentialsExcluded: true, organizationId: "org-1", tables });
  assert.equal(counts.content_items, 1);
  assert.equal(counts.universal_content_library, 1);
  assert.equal(counts.generated_game_selections, 1);
  assert.equal(counts.platform_event_participations, 1);
  assert.equal(counts.user_platform_progress, 1);
  assert.equal(counts.platform_event_content_reservations, 1);
  assert.equal(counts.platform_event_reward_ledger, 1);
  assert.equal(target.raw.prepare("PRAGMA foreign_key_check").all().length, 0);
});
