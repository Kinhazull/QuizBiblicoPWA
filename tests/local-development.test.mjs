import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const productionDatabaseId = "33fc35a0-46cf-4756-b6be-89b07371256c";

test("full local environment is pinned to local D1 and Pages Functions", async () => {
  const [pkgText, config, setup, docs] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("wrangler.local.jsonc", root), "utf8"),
    readFile(new URL("scripts/setup-local-preview.mjs", root), "utf8"),
    readFile(new URL("docs/LOCAL_DEVELOPMENT.md", root), "utf8"),
  ]);
  const pkg = JSON.parse(pkgText);

  assert.match(pkg.scripts["dev:full"], /wrangler pages dev out/);
  assert.match(pkg.scripts["dev:full"], /--d1 DB=00000000-0000-4000-8000-000000000002/);
  assert.match(pkg.scripts["db:local:setup"], /setup-local-preview\.mjs/);
  assert.doesNotMatch(pkg.scripts["dev:full"], /--remote/);
  assert.match(config, /"binding": "DB"/);
  assert.match(config, /"database_name": "quiz-biblico-local"/);
  assert.doesNotMatch(config, new RegExp(productionDatabaseId));
  assert.match(setup, /args\.includes\("--remote"\)/);
  assert.match(setup, /args\.includes\("--local"\)/);
  assert.match(docs, /http:\/\/localhost:8788/);
});
