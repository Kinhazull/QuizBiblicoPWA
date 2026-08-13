import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import {
  assertSnapshotTableAllowlist,
  authorizedSchemaChanges,
  authorizedSchemaCreations,
  buildApplicationSchemaQuery,
  compareSchemaObjects,
  migrationsAppliedAfterSnapshot,
} from "../scripts/lib/d1-snapshot-policy.mjs";

const applicationTables = ["users", "rounds", "attempts"];

test("snapshot query includes only allowlisted application tables and their indexes", () => {
  const query = buildApplicationSchemaQuery(applicationTables);
  assert.match(query, /type='table' AND name IN \('users','rounds','attempts'\)/);
  assert.match(query, /type='index' AND tbl_name IN \('users','rounds','attempts'\)/);
  assert.doesNotMatch(query, /NOT LIKE|_cf_|sqlite_%|d1_migrations/);
});

test("snapshot comparison rejects internal, missing or injected tables", () => {
  assert.doesNotThrow(() => assertSnapshotTableAllowlist({ users: 1, rounds: 2, attempts: 3 }, applicationTables));
  assert.throws(
    () => assertSnapshotTableAllowlist({ users: 1, rounds: 2, attempts: 3, _cf_KV: 1 }, applicationTables),
    /Snapshot table allowlist mismatch/,
  );
  assert.throws(
    () => assertSnapshotTableAllowlist({ users: 1, rounds: 2 }, applicationTables),
    /Snapshot table allowlist mismatch/,
  );
});

test("snapshot policy is pure and cannot call Wrangler or D1", async () => {
  const source = await readFile(
    new URL("../scripts/lib/d1-snapshot-policy.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /child_process|wrangler|fetch\s*\(|CLOUDFLARE/i);
});

test("snapshot policy authorizes only objects declared by migrations applied after the snapshot", () => {
  const expected = ["0034_daily.sql", "0035_free_play.sql"];
  const applied = migrationsAppliedAfterSnapshot(
    ["0034_daily.sql"],
    expected,
    expected,
  );
  const authorized = authorizedSchemaChanges(applied, {
    "0035_free_play.sql": [
      { type: "table", name: "generated_game_participations" },
      { type: "index", name: "generated_game_participations_user_status_idx" },
    ],
  });
  assert.deepEqual(applied, ["0035_free_play.sql"]);
  assert.deepEqual(
    authorized.get("table:generated_game_participations"),
    [{ migration: "0035_free_play.sql", type: "table", name: "generated_game_participations" }],
  );
  assert.equal(authorized.has("table:users"), false);
});

const sessionsBefore0039 = "CREATE TABLE sessions (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), token_hash TEXT NOT NULL UNIQUE, persistent INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL, created_at INTEGER NOT NULL, user_agent TEXT, ip_hash TEXT)";
const sessionsAfter0039 = "CREATE TABLE sessions (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), token_hash TEXT NOT NULL UNIQUE, persistent INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL, created_at INTEGER NOT NULL, user_agent TEXT, ip_hash TEXT, mfa_verified INTEGER NOT NULL DEFAULT 0)";
const migration0039 = "0039_administrative_mfa.sql";
const changes0039 = {
  [migration0039]: [{
    type: "table", name: "sessions", beforeSql: sessionsBefore0039, afterSql: sessionsAfter0039,
  }],
};
const tables0039 = { [migration0039]: ["user_mfa", "mfa_recovery_codes", "mfa_login_challenges"] };
const indexes0039 = { [migration0039]: [
  "mfa_recovery_codes_user_idx", "mfa_login_challenges_expiry_idx", "users_one_active_owner_per_org_uq",
] };

function schemaObjects(db) {
  return db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%' ORDER BY type,name").all().map(row => ({ ...row }));
}

async function databaseAt0038() {
  const files = (await readdir(new URL("../drizzle/", import.meta.url))).filter(file => file.endsWith(".sql")).sort();
  const db = new DatabaseSync(":memory:");
  for (const file of files.slice(0, 39)) db.exec(await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  return db;
}

function compare0039(before, after) {
  return compareSchemaObjects(
    before,
    after,
    authorizedSchemaChanges([migration0039], changes0039),
    authorizedSchemaCreations([migration0039], tables0039, indexes0039),
  );
}

test("real SQLite transition 0038 to 0039 is accepted only with the exact sessions mutation", async () => {
  const db = await databaseAt0038();
  const before = schemaObjects(db);
  db.exec(await readFile(new URL("../drizzle/0039_administrative_mfa.sql", import.meta.url), "utf8"));
  const result = compare0039(before, schemaObjects(db));
  assert.deepEqual(result.expectedModified.map(change => change.object.name), ["sessions"]);
  assert.deepEqual(result.expectedModified[0].migrations, [migration0039]);
  assert.equal(result.created.length, 6);
  db.close();
});

test("0039 contract rejects extra, missing and structurally different session columns", async () => {
  const db = await databaseAt0038();
  const before = schemaObjects(db);
  db.exec(await readFile(new URL("../drizzle/0039_administrative_mfa.sql", import.meta.url), "utf8"));
  const after = schemaObjects(db);
  const mutateSessions = sql => after.map(object => object.name === "sessions" ? { ...object, sql } : object);
  assert.throws(() => compare0039(before, mutateSessions(`${sessionsAfter0039.slice(0, -1)}, fictitious TEXT)`)), /changed unexpectedly: table sessions/);
  assert.throws(() => compare0039(before, mutateSessions(sessionsAfter0039.replace(", user_agent TEXT", ""))), /changed unexpectedly: table sessions/);
  assert.throws(() => compare0039(before, mutateSessions(sessionsAfter0039.replace("user_agent TEXT", "user_agent INTEGER"))), /changed unexpectedly: table sessions/);
  assert.throws(() => compare0039(before, mutateSessions(sessionsAfter0039.replace("mfa_verified INTEGER NOT NULL DEFAULT 0", "mfa_verified TEXT DEFAULT '0'"))), /changed unexpectedly: table sessions/);
  db.close();
});

test("0039 contract rejects drift in another object, strange objects and missing MFA objects", async () => {
  const db = await databaseAt0038();
  const before = schemaObjects(db);
  db.exec(await readFile(new URL("../drizzle/0039_administrative_mfa.sql", import.meta.url), "utf8"));
  const after = schemaObjects(db);
  const usersDrift = after.map(object => object.name === "users" ? { ...object, sql: `${object.sql} /* drift */` } : object);
  assert.throws(() => compare0039(before, usersDrift), /changed unexpectedly: table users/);
  assert.throws(() => compare0039(before, [...after, { type: "table", name: "strange", tbl_name: "strange", sql: "CREATE TABLE strange(id)" }]), /Unexpected schema object was created: table strange/);
  assert.throws(() => compare0039(before, after.filter(object => object.name !== "user_mfa")), /Expected schema object.*missing: table user_mfa/);
  db.close();
});

test("0039 transition rejects an unexpected ledger", () => {
  assert.throws(
    () => migrationsAppliedAfterSnapshot(["0038.sql"], ["0038.sql", "0040.sql"], ["0038.sql", migration0039]),
    /not an exact prefix/,
  );
});

test("reconciler declares the exact 0039 sessions transition without a name-only bypass", async () => {
  const source = await readFile(new URL("../scripts/reconcile-d1-migrations.mjs", import.meta.url), "utf8");
  assert.match(source, /"0039_administrative_mfa\.sql"[\s\S]*?name: "sessions"[\s\S]*?beforeSql:[\s\S]*?afterSql:/);
  assert.doesNotMatch(source, /if\s*\(.*object\.name\s*===\s*["']sessions["']/);
});

test("snapshot comparison accepts an explicitly authorized structural modification", () => {
  const before = [{
    type: "table",
    name: "generated_game_participations",
    tbl_name: "generated_game_participations",
    sql: "CREATE TABLE generated_game_participations (mode CHECK (mode = 'DAILY'))",
  }];
  const after = [{
    ...before[0],
    sql: "CREATE TABLE generated_game_participations (mode CHECK (mode IN ('DAILY','FREE_PLAY')))",
  }];
  const authorized = new Map([[
    "table:generated_game_participations",
    ["0035_free_play_participations.sql"],
  ]]);
  const result = compareSchemaObjects(before, after, authorized);
  assert.equal(result.expectedModified.length, 1);
  assert.equal(result.unexpectedModified.length, 0);
});

test("snapshot comparison still blocks modifications outside the migration declaration", () => {
  const before = [{
    type: "table",
    name: "users",
    tbl_name: "users",
    sql: "CREATE TABLE users (id TEXT)",
  }];
  const after = [{ ...before[0], sql: "CREATE TABLE users (id TEXT, role TEXT)" }];
  assert.throws(
    () => compareSchemaObjects(before, after, new Map()),
    /Pre-existing schema object changed unexpectedly: table users/,
  );
});

test("snapshot comparison rejects removal and ledger divergence", () => {
  const users = {
    type: "table",
    name: "users",
    tbl_name: "users",
    sql: "CREATE TABLE users (id TEXT)",
  };
  assert.throws(
    () => compareSchemaObjects([users], [], new Map()),
    /Pre-existing schema object was removed unexpectedly: table users/,
  );
  assert.throws(
    () => migrationsAppliedAfterSnapshot(
      ["0034.sql", "0035.sql"],
      ["0034.sql"],
      ["0034.sql", "0035.sql"],
    ),
    /does not extend/,
  );
});
