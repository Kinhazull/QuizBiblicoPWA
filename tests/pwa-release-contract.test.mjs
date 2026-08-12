import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = path => fs.readFileSync(path, "utf8");

test("PWA release gate uses a separate production-like Service Worker suite", () => {
  const pkg = JSON.parse(read("package.json"));
  const config = read("playwright.pwa.config.ts");
  const workflow = read(".github/workflows/pwa-release.yml");
  const prepare = read("scripts/prepare-pwa-release-artifact.mjs");
  assert.match(pkg.scripts["test:pwa-release"], /playwright\.pwa\.config\.ts/);
  assert.match(config, /serviceWorkers: "allow"/);
  assert.match(config, /wrangler pages dev out/);
  assert.match(workflow, /workflow_dispatch/);
  assert.doesNotMatch(workflow, /push:|pull_request:/);
  assert.match(workflow, /build:pages-functions/);
  assert.match(workflow, /pwa:release:prepare/);
  assert.match(prepare, /\.pages-functions\/index\.js/);
  assert.match(prepare, /out\/_worker\.js/);
});

test("PWA release browser contract covers install cache offline and update", () => {
  const source = read("tests/pwa-release/pwa-release.spec.ts");
  for (const contract of [
    "navigator.serviceWorker.ready", "navigator.serviceWorker.controller", "manifest.webmanifest",
    "startsWith(\"/api/\")", "setOffline(true)", "registration.update()", "maskable",
  ]) assert.ok(source.includes(contract), contract);
});
