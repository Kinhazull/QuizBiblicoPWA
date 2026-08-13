import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("editor visual de Eventos não expõe JSON nem IDs arbitrários", async () => {
  const source = await readFile(new URL("app/admin/eventos/EventWizard.tsx", root), "utf8");
  assert.equal(source.includes("JSON)"), false);
  assert.equal(source.includes("textarea name=\"games\""), false);
  assert.match(source, /import \{ gameModules \} from "\.\.\/\.\.\/games\/sdk\/gameModules"/);
  assert.match(source, /const GAMES = gameModules\.map/);
  assert.match(source, /Asset Registry/);
  assert.match(source, /Validar e agendar/);
});

test("catálogo do editor usa permissão de Eventos e consultas parametrizadas", async () => {
  const endpoint = await readFile(new URL("functions/api/admin/events/suggest-content.ts", root), "utf8");
  const service = await readFile(new URL("functions/_lib/platform-events.ts", root), "utf8");
  assert.match(endpoint, /requirePermission\(request, env, "events\.manage"\)/);
  assert.match(service, /listEventContentOptions/);
  assert.match(service, /\.bind\(organizationId, \.\.\.batch\)/);
  assert.doesNotMatch(service, /IN \(\$\{batch\.join/);
});
