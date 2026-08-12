import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("remote write workflows encrypt backups with a dedicated secret and publish checksums", async () => {
  for (const path of [".github/workflows/reconcile-production-d1.yml", ".github/workflows/reset-production-pilot-data.yml"]) {
    const workflow = await read(path);
    assert.match(workflow, /D1_BACKUP_ENCRYPTION_KEY/);
    assert.match(workflow, /-pass env:D1_BACKUP_ENCRYPTION_KEY/);
    assert.doesNotMatch(workflow, /-pass env:CLOUDFLARE_API_TOKEN/);
    assert.match(workflow, /sha256sum .*\.sql\.enc > .*\.sql\.enc\.sha256/);
    assert.match(workflow, /\.sql\.enc\.sha256/);
    assert.match(workflow, /shred -u .*\.sql/);
  }
});

test("real backups and recovery artifacts are excluded from version control", async () => {
  const ignore = await read(".gitignore");
  assert.match(ignore, /\/\*backup\*\.sql/);
  assert.match(ignore, /\/\*backup\*\.sql\.enc/);
  assert.match(ignore, /\/\*backup\*\.sha256/);
});

test("recovery documentation distinguishes local SQLite checks from remote D1 checks", async () => {
  const documentation = await read("docs/BACKUP_AND_RESTORE.md");
  assert.match(documentation, /local: `PRAGMA integrity_check = ok`/i);
  assert.match(documentation, /D1 remoto: `PRAGMA quick_check = ok`/i);
  assert.match(documentation, /`PRAGMA foreign_key_check` sem linhas/);
  assert.match(documentation, /consulta direta e ordenada de `d1_migrations`/);
  assert.doesNotMatch(documentation, /restore remoto isolado ainda não foi executado/i);
});
