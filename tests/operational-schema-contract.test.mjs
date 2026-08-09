import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import {
  APPLICATION_TABLES, BACKUP_TABLE_CLASSIFICATION, CRITICAL_INDEXES, CRITICAL_TRIGGERS,
  EXPECTED_MIGRATION_COUNT, OPERATIONAL_SCHEMA_VERSION, RESET_TABLE_CLASSIFICATION, PRIVACY_TABLE_CLASSIFICATION,
} from "../shared/operational-schema-contract.mjs";

const migrations = readdirSync(new URL("../drizzle", import.meta.url)).filter(file => /^\d{4}_.+\.sql$/.test(file)).sort();
const sql = migrations.map(file => readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8")).join("\n");

test("operational schema contract covers every migration table", () => {
  assert.equal(OPERATIONAL_SCHEMA_VERSION, 38);
  assert.equal(migrations.length, EXPECTED_MIGRATION_COUNT);
  const created = [...sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+([a-z0-9_]+)/gi)].map(match => match[1]);
  for (const table of new Set(created)) {
    assert.ok(APPLICATION_TABLES.includes(table), `missing table classification: ${table}`);
    assert.ok(BACKUP_TABLE_CLASSIFICATION[table], `backup contract missing: ${table}`);
    assert.ok(RESET_TABLE_CLASSIFICATION[table], `reset contract missing: ${table}`);
    assert.ok(PRIVACY_TABLE_CLASSIFICATION[table], `privacy contract missing: ${table}`);
  }
});

test("critical indexes and triggers are present in the migration history", () => {
  for (const index of CRITICAL_INDEXES) assert.match(sql, new RegExp(`CREATE (?:UNIQUE )?INDEX(?: IF NOT EXISTS)?\\s+${index}\\b`, "i"), `missing critical index: ${index}`);
  for (const trigger of CRITICAL_TRIGGERS) assert.match(sql, new RegExp(`CREATE TRIGGER(?: IF NOT EXISTS)?\\s+${trigger}\\b`, "i"), `missing critical trigger: ${trigger}`);
});

test("backup and reset contracts reject unknown future tables", () => {
  assert.equal(BACKUP_TABLE_CLASSIFICATION.future_table, undefined);
  assert.equal(RESET_TABLE_CLASSIFICATION.future_table, undefined);
  assert.equal(Object.keys(BACKUP_TABLE_CLASSIFICATION).length, APPLICATION_TABLES.length);
  assert.equal(Object.keys(RESET_TABLE_CLASSIFICATION).length, APPLICATION_TABLES.length);
  assert.equal(Object.keys(PRIVACY_TABLE_CLASSIFICATION).length, APPLICATION_TABLES.length);
});

test("every INCLUDED table is present in the administrative backup implementation", () => {
  const backupSource = readFileSync(new URL("../functions/api/admin/backup.ts", import.meta.url), "utf8");
  for (const [table, classification] of Object.entries(BACKUP_TABLE_CLASSIFICATION)) {
    if (classification === "INCLUDED") assert.match(backupSource, new RegExp(`\\b${table}:`), `INCLUDED table not exported: ${table}`);
  }
});
