import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  assertSnapshotTableAllowlist,
  buildApplicationSchemaQuery,
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
