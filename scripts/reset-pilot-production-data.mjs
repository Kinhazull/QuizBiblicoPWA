#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { assertResetPolicy, buildResetBatch, protectedTables, purgeTables } from "./lib/pilot-reset-policy.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((value, index, all) =>
  value.startsWith("--") ? [value.slice(2), all[index + 1]?.startsWith("--") ? true : all[index + 1]] : null
).filter(Boolean));
const mode = args["dry-run"] ? "dry-run" : args.apply ? "apply" : args.verify ? "verify" : "";
if (!mode) throw new Error("Use exatamente um modo: --dry-run, --apply ou --verify.");
if ([args["dry-run"], args.apply, args.verify].filter(Boolean).length !== 1) throw new Error("Escolha somente um modo.");

const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "");
const databaseId = String(process.env.D1_DATABASE_ID || "");
const token = String(process.env.CLOUDFLARE_API_TOKEN || "");
const expectedUsers = Number(args["expected-users"]);
const expectedQuestions = Number(args["expected-questions"]);
if (!accountId || !databaseId || !token) throw new Error("Credenciais e identificadores do D1 não configurados.");
if (!Number.isInteger(expectedUsers) || expectedUsers < 1) throw new Error("--expected-users deve ser um inteiro positivo.");
if (!Number.isInteger(expectedQuestions) || expectedQuestions < 1) throw new Error("--expected-questions deve ser um inteiro positivo.");

const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
async function callD1(body) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success !== true || payload.result?.some?.(result => result.success === false)) {
    throw new Error(`D1 request failed (${response.status}): ${JSON.stringify(payload.errors || "unknown_error")}`);
  }
  return payload.result || [];
}
async function rows(sql, params = []) {
  const result = await callD1({ sql, params });
  return result[0]?.results || [];
}
async function count(table, where = "") {
  const result = await rows(`SELECT COUNT(*) total FROM ${table}${where}`);
  return Number(result[0]?.total || 0);
}
async function snapshot() {
  const tables = new Set((await rows("SELECT name FROM sqlite_master WHERE type='table'")).map(row => String(row.name)));
  const required = [...new Set([...protectedTables, ...purgeTables])];
  const missing = required.filter(table => !tables.has(table));
  if (missing.length) throw new Error(`Required tables missing: ${missing.join(", ")}`);
  const protectedCounts = Object.fromEntries(await Promise.all(protectedTables.map(async table => [table, await count(table)])));
  const purgeCounts = Object.fromEntries(await Promise.all(purgeTables.map(async table => [table, await count(table)])));
  return {
    capturedAt: new Date().toISOString(),
    protectedCounts,
    purgeCounts,
    users: protectedCounts.users,
    questions: protectedCounts.question_bank,
    usedQuestions: await count("question_bank", " WHERE times_used<>0"),
    pendingBadgeSync: Number((await rows(`SELECT COUNT(DISTINCT requested.entity_id) total FROM audit_logs requested
      WHERE requested.action='badge.sync_requested' AND NOT EXISTS(
        SELECT 1 FROM audit_logs completed WHERE completed.action='badge.sync_completed'
        AND completed.entity_id=requested.entity_id AND completed.created_at>=requested.created_at)`))[0]?.total || 0),
  };
}
function validateExpected(state) {
  if (state.users !== expectedUsers) throw new Error(`User count mismatch: expected ${expectedUsers}, found ${state.users}.`);
  if (state.questions !== expectedQuestions) throw new Error(`Question count mismatch: expected ${expectedQuestions}, found ${state.questions}.`);
  if (state.protectedCounts.d1_migrations !== 28) throw new Error(`Migration ledger mismatch: expected 28, found ${state.protectedCounts.d1_migrations}.`);
}
function resetWorkRemaining(state) {
  return Object.values(state.purgeCounts).reduce((total, value) => total + value, 0)
    + state.usedQuestions
    + state.pendingBadgeSync;
}
function writeSnapshot(state) {
  if (args.snapshot) writeFileSync(String(args.snapshot), `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}
function compareProtected(before, after) {
  for (const table of protectedTables) {
    if (table === "audit_logs") continue;
    if (before.protectedCounts[table] !== after.protectedCounts[table]) {
      throw new Error(`Protected table changed unexpectedly: ${table}.`);
    }
  }
  if (after.protectedCounts.audit_logs < before.protectedCounts.audit_logs) throw new Error("Audit log count decreased.");
}

assertResetPolicy();
const before = await snapshot();
validateExpected(before);
if (mode !== "verify" && resetWorkRemaining(before) === 0) {
  throw new Error("Nenhum dado competitivo foi encontrado. A limpeza já foi concluída ou não é necessária; nenhuma escrita foi executada.");
}
if (mode === "dry-run") {
  writeSnapshot(before);
  console.log(JSON.stringify({ status: "dry_run_valid", ...before }, null, 2));
} else if (mode === "apply") {
  if (!args.snapshot) throw new Error("--apply exige --snapshot com o estado anterior.");
  writeSnapshot(before);
  await callD1({ batch: buildResetBatch().map(sql => ({ sql })) });
  const after = await snapshot();
  validateExpected(after);
  compareProtected(before, after);
  if (Object.values(after.purgeCounts).some(value => value !== 0)) throw new Error("Competitive data remained after reset.");
  if (after.usedQuestions !== 0 || after.pendingBadgeSync !== 0) throw new Error("Derived question usage or badge queue remained after reset.");
  console.log(JSON.stringify({ status: "reset_completed", before, after }, null, 2));
} else {
  validateExpected(before);
  if (Object.values(before.purgeCounts).some(value => value !== 0)) throw new Error("Competitive data still exists.");
  if (before.usedQuestions !== 0 || before.pendingBadgeSync !== 0) throw new Error("Derived counters or badge queue still exist.");
  console.log(JSON.stringify({ status: "reset_verified", ...before }, null, 2));
}
