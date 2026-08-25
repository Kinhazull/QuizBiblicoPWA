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

test("editor de Eventos mantém contraste e distribuição responsiva nos seletores", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("app/admin/eventos/EventWizard.tsx", root), "utf8"),
    readFile(new URL("app/events.css", root), "utf8"),
  ]);
  assert.match(source, /className="available"/);
  assert.match(source, /className="reserved"/);
  assert.match(source, /aria-label="Resumo do catálogo"/);
  assert.match(styles, /\.event-game-picker label\.selected\{[^}]*background:#123d35[^}]*color:#f7fffb/);
  assert.match(styles, /\.event-catalog-summary \.available\{[^}]*color:#bdf3d4/);
  assert.match(styles, /\.event-catalog-summary \.reserved\{[^}]*color:#ffe39a/);
  assert.match(styles, /\.event-content-list\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /@media\(max-width:760px\)\{\.event-content-list\{grid-template-columns:1fr/);
  assert.match(styles, /\.event-content-list label\{box-sizing:border-box;display:grid;[^}]*min-height:104px;height:auto;overflow:hidden/);
  assert.match(styles, /\.event-content-list \.event-content-meta\{display:flex;[^}]*flex-wrap:wrap/);
  assert.match(styles, /\.event-content-list small\.reference\{flex-basis:100%/);
  assert.match(styles, /@media\(max-width:760px\)[^{]*\{\.event-content-list\{grid-template-columns:1fr;[^}]*max-height:520px/);
  assert.match(styles, /\.event-content-list label\{min-height:116px;height:auto;align-items:start/);
});
