import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertResetPolicy, buildResetBatch, protectedTables, purgeTables } from "../scripts/lib/pilot-reset-policy.mjs";

test("pilot reset deletes only competitive tables and preserves accounts and question bank", () => {
  const statements = buildResetBatch();
  assert.equal(assertResetPolicy(statements), true);
  const sql = statements.join(";\n");
  for (const table of purgeTables) assert.match(sql, new RegExp(`DELETE FROM ${table}`));
  for (const table of protectedTables) assert.doesNotMatch(sql, new RegExp(`DELETE FROM ${table}(?:\\s|;|$)`));
  assert.match(sql, /UPDATE question_bank SET times_used=0/);
});

test("pilot reset policy rejects deletion of protected data", () => {
  assert.throws(() => assertResetPolicy([...buildResetBatch(), "DELETE FROM users"]), /Protected table/);
  assert.throws(() => assertResetPolicy([...buildResetBatch(), "DELETE FROM question_bank"]), /Protected table/);
  assert.throws(() => assertResetPolicy([...buildResetBatch(), "UPDATE users SET status='suspended'"]), /Only question_bank/);
});

test("production reset workflow is manual, guarded, backed up and does not deploy", () => {
  const workflow = readFileSync(new URL("../.github/workflows/reset-production-pilot-data.yml", import.meta.url), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /LIMPAR_DADOS_COMPETITIVOS_PRODUCAO/);
  assert.match(workflow, /Diagnose without writing[\s\S]*Export remote D1 backup[\s\S]*Apply one transactional reset batch[\s\S]*Verify final state independently/);
  assert.doesNotMatch(workflow, /wrangler\s+(?:pages\s+)?deploy|wrangler\s+d1\s+migrations\s+apply/i);
});
