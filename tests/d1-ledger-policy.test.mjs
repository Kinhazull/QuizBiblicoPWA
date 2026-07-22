import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildAtomicBaselineInsert } from "../scripts/lib/d1-ledger-policy.mjs";

const baseline = Array.from(
  { length: 21 },
  (_, index) => `${String(index).padStart(4, "0")}_migration_${index}.sql`,
);

test("builds one atomic multi-value INSERT accepted by D1 remote", () => {
  const sql = buildAtomicBaselineInsert(baseline);
  assert.match(sql, /^INSERT INTO d1_migrations\(name\) VALUES /);
  assert.equal((sql.match(/\('/g) || []).length, 21);
  assert.equal((sql.match(/\bINSERT\b/g) || []).length, 1);
  assert.doesNotMatch(sql, /\bBEGIN\b|\bCOMMIT\b|\bTRANSACTION\b|\bSAVEPOINT\b/);
  assert.doesNotMatch(sql, /DELETE|UPDATE|DROP|ALTER|REPLACE|TRUNCATE/);
});

test("rejects an empty baseline or an unexpected migration name", () => {
  assert.throws(() => buildAtomicBaselineInsert([]), /cannot be empty/);
  assert.throws(
    () => buildAtomicBaselineInsert(["0020_valid.sql", "'); DROP TABLE users; --"]),
    /Invalid migration name/,
  );
});

test("operational reconciler cannot emit explicit SQL transactions", async () => {
  const source = await readFile(
    new URL("../scripts/reconcile-d1-migrations.mjs", import.meta.url),
    "utf8",
  );
  assert.match(source, /runWrangler\(buildAtomicBaselineInsert\(baseline\)\)/);
  assert.doesNotMatch(source, /`BEGIN;|COMMIT;`|SAVEPOINT/);
  assert.match(source, /require\.resolve\("wrangler"\)/);
  assert.match(source, /spawnSync\(process\.execPath/);
});

test("ledger policy is pure and cannot call Wrangler or D1", async () => {
  const source = await readFile(
    new URL("../scripts/lib/d1-ledger-policy.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /child_process|wrangler|fetch\s*\(|CLOUDFLARE/i);
});
