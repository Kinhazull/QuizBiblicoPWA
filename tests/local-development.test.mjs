import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const productionDatabaseId = "33fc35a0-46cf-4756-b6be-89b07371256c";

test("full local environment is pinned to local D1 and Pages Functions", async () => {
  const [pkgText, config, setup, lan, docs, auth, security, login, logout, middleware] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("wrangler.local.jsonc", root), "utf8"),
    readFile(new URL("scripts/setup-local-preview.mjs", root), "utf8"),
    readFile(new URL("scripts/print-local-lan-addresses.mjs", root), "utf8"),
    readFile(new URL("docs/LOCAL_DEVELOPMENT.md", root), "utf8"),
    readFile(new URL("functions/_lib/auth.ts", root), "utf8"),
    readFile(new URL("functions/_lib/security.ts", root), "utf8"),
    readFile(new URL("functions/api/auth/login.ts", root), "utf8"),
    readFile(new URL("functions/api/auth/logout.ts", root), "utf8"),
    readFile(new URL("functions/_middleware.ts", root), "utf8"),
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

  const lanCommand = pkg.scripts["dev:lan"];
  assert.match(lanCommand, /^pnpm run build && pnpm run db:local:setup/);
  assert.match(lanCommand, /print-local-lan-addresses\.mjs/);
  assert.match(lanCommand, /--ip 0\.0\.0\.0/);
  assert.match(lanCommand, /--port 8788/);
  assert.match(lanCommand, /--persist-to \.wrangler\/local-state/);
  assert.match(lanCommand, /--d1 DB=00000000-0000-4000-8000-000000000002/);
  assert.match(lanCommand, /--binding LOCAL_LAN_DEVELOPMENT=true/);
  assert.doesNotMatch(lanCommand, /--remote/);
  assert.doesNotMatch(lanCommand, new RegExp(productionDatabaseId));
  assert.match(lan, /networkInterfaces\(\)/);
  assert.match(lan, /isPrivateIpv4/);
  assert.match(lan, /octets\[0\] === 192 && octets\[1\] === 168/);
  assert.match(docs, /mesma rede Wi-Fi/);
  assert.match(docs, /-Profile Private/);

  assert.match(auth, /LOCAL_LAN_DEVELOPMENT\?: string/);
  assert.match(security, /secure = true/);
  assert.match(security, /secure \? "Secure; " : ""/);
  assert.match(login, /String\(env\.LOCAL_LAN_DEVELOPMENT\) !== "true"/);
  assert.match(logout, /String\(env\.LOCAL_LAN_DEVELOPMENT\) !== "true"/);
  assert.match(middleware, /String\(env\.LOCAL_LAN_DEVELOPMENT\)==='true'\?csp/);
  assert.match(middleware, /upgrade-insecure-requests/);
});
