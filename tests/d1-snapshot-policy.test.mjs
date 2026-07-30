import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  assertSnapshotTableAllowlist,
  authorizedSchemaChanges,
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
    ["0035_free_play.sql"],
  );
  assert.equal(authorized.has("table:users"), false);
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
