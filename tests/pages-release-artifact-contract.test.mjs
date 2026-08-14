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

async function fixture(excluded = []) {
  const excludedPaths = new Set(Array.isArray(excluded) ? excluded : [excluded]);
  const root = await mkdtemp(join(tmpdir(), "pages-release-"));
  for (const relativePath of required.filter((item) => !excludedPaths.has(item))) {
    const target = join(root, relativePath);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, "verified");
  }
  return root;
}

test("promotable Pages artifact contains every critical route and worker contract", async () => {
  const result = spawnSync(process.execPath, [script, "--", await fixture()], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /6 critical files present/);
});

for (const relativePath of required) {
  test(`promotable Pages artifact rejects missing ${relativePath}`, async () => {
    const result = spawnSync(process.execPath, [script, "--", await fixture(relativePath)], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(`pages_release_artifact_incomplete:${relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  });
}

test("critical files in incorrect paths do not satisfy the artifact contract", async () => {
  const root = await fixture(["index.html", "configurar-mfa/index.html"]);
  await mkdir(join(root, "home"), { recursive: true });
  await writeFile(join(root, "home", "index.html"), "wrong home path");
  await writeFile(join(root, "configurar-mfa.html"), "wrong MFA path");
  const result = spawnSync(process.execPath, [script, "--", root], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /pages_release_artifact_incomplete:index\.html/);
});

test("direct positional invocation remains supported", async () => {
  const result = spawnSync(process.execPath, [script, await fixture()], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
