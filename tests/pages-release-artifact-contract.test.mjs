import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = join(process.cwd(), "scripts", "verify-pages-release-artifact.mjs");
const required = [
  "index.html",
  "configurar-mfa/index.html",
  "recuperar-conta/index.html",
  "admin/index.html",
  "_routes.json",
  "_worker.js",
];

async function fixture(excluded) {
  const root = await mkdtemp(join(tmpdir(), "pages-release-"));
  for (const relativePath of required.filter((item) => item !== excluded)) {
    const target = join(root, relativePath);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, "verified");
  }
  return root;
}

test("promotable Pages artifact contains every critical route and worker contract", async () => {
  const result = spawnSync(process.execPath, [script, await fixture()], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /6 critical files present/);
});

test("promotable Pages artifact rejects a missing MFA enrollment route", async () => {
  const result = spawnSync(process.execPath, [script, await fixture("configurar-mfa/index.html")], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /pages_release_artifact_incomplete:configurar-mfa\/index\.html/);
});
