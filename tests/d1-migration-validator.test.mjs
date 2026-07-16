import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { validateMigration0021 } from "../scripts/lib/d1-migration-validator.mjs";

const validMigration = await readFile(
  new URL("../drizzle/0021_award_job_checkpoints.sql", import.meta.url),
  "utf8",
);

test("accepts the exact safe migration 0021 including ON DELETE CASCADE", () => {
  assert.deepEqual(validateMigration0021(validMigration), {
    table: "round_award_participant_processing",
    index: "round_award_participant_pending_idx",
    statements: 2,
  });
});

for (const [command, sql] of [
  ["DROP TABLE", `${validMigration}\nDROP TABLE users;`],
  ["DELETE", `${validMigration}\nDELETE FROM users;`],
  ["UPDATE", `${validMigration}\nUPDATE users SET active = 0;`],
]) {
  test(`rejects standalone ${command}`, () => {
    assert.throws(
      () => validateMigration0021(sql),
      (error) => error.message.includes(`command ${command}`) && /line \d+/.test(error.message),
    );
  });
}

test("rejects creation or alteration of a table outside the allowlist", () => {
  const sql = validMigration.replace(
    "CREATE TABLE round_award_participant_processing",
    "CREATE TABLE users",
  );
  assert.throws(
    () => validateMigration0021(sql),
    /command CREATE TABLE users detected at line 1: table is outside the allowlist/,
  );
  assert.throws(
    () => validateMigration0021(`${validMigration}\nALTER TABLE users ADD COLUMN unsafe TEXT;`),
    /command ALTER TABLE detected at line \d+: exactly two allowlisted DDL statements are required/,
  );
});

test("ignores forbidden words in line and block comments", () => {
  const commented = `-- DROP TABLE users; DELETE FROM users;\n${validMigration}\n/* UPDATE users SET active = 0; */`;
  assert.equal(validateMigration0021(commented).statements, 2);
});

test("validator is pure and cannot make a remote call", async () => {
  const source = await readFile(
    new URL("../scripts/lib/d1-migration-validator.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /child_process|wrangler|fetch\s*\(|D1|CLOUDFLARE/i);
});
