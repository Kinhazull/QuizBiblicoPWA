import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

test("all migrations are sequential and apply to an empty SQLite database", async () => {
  const files = (await readdir(new URL("../drizzle/", import.meta.url))).filter(file => file.endsWith(".sql")).sort();
  assert.equal(files.length, 19);
  files.forEach((file, index) => assert.equal(file.slice(0, 4), String(index).padStart(4, "0")));
  const db = new DatabaseSync(":memory:");
  for (const file of files) db.exec(await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name);
  for (const required of ["users", "rounds", "question_bank", "seasons", "announcements", "privacy_requests", "ai_question_suggestions", "batch_operations", "season_snapshots", "season_awards"]) assert.ok(tables.includes(required), `missing ${required}`);
  const sessionColumns = db.prepare("PRAGMA table_info(sessions)").all().map(row => row.name);
  assert.ok(sessionColumns.includes("ip_hash"));
  assert.ok(sessionColumns.includes("user_agent"));
  const attemptColumns = db.prepare("PRAGMA table_info(attempts)").all().map(row => row.name);
  assert.ok(attemptColumns.includes("question_order_json"));
  const attemptIndexes = db.prepare("PRAGMA index_list('attempts')").all().map(row => row.name);
  assert.ok(attemptIndexes.includes("attempts_user_round_mode_number_uq"));
  assert.ok(db.prepare("PRAGMA table_info(choices)").all().some(row => row.name === "position"));
  assert.ok(db.prepare("PRAGMA index_list('attempt_answers')").all().some(row => row.name === "attempt_answers_order_uq"));
  db.close();
});
