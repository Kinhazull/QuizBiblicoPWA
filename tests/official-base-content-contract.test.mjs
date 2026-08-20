import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("official base import remains an authenticated administrative operation with explicit confirmation", async () => {
  const route = await read("functions/api/admin/content/import-official-base.ts");
  assert.match(route, /requirePermission\(request, env, "content\.manage"\)/);
  assert.match(route, /IMPORTAR_CONTEUDO_BASE_OFICIAL/);
  assert.match(route, /body\.commit === true/);
  assert.match(route, /response\.message\.replace/);
  assert.match(route, /slice\(0, 300\)/);
  assert.match(route, /official_base_import_failed/);
});

test("universal import paginates existing content for D1-sized catalogs", async () => {
  const importer = await read("functions/_lib/universal-content-importer.ts");
  assert.match(importer, /IMPORT_EXISTING_CONTENT_PAGE_SIZE\s*=\s*200/);
  assert.match(importer, /IMPORT_EXISTING_ID_BATCH_SIZE\s*=\s*80/);
  assert.match(importer, /listExistingCandidates\(env, candidates\)/);
  assert.match(importer, /missingCandidates\.length\s*\?\s*await listExistingContentForImport/);
  assert.match(importer, /game_type IN \(\$\{gameTypePlaceholders\}\)/);
  assert.match(importer, /ORDER BY id LIMIT \?\$\{limitIndex\} OFFSET \?\$\{offsetIndex\}/);
  assert.match(importer, /const gameTypes = \[\.\.\.new Set\(missingCandidates\.map\(candidate => candidate\.model\.gameType\)\)\]/);
  assert.doesNotMatch(importer, /SELECT \* FROM content_items WHERE organization_id IN/);
});

test("official base reconciliation avoids D1 LIKE pattern limits", async () => {
  const importer = await read("functions/_lib/official-base-content-importer.ts");
  assert.match(importer, /const prefixUpperBound = `\$\{prefix\}\\uffff`/);
  assert.match(importer, /id>=\?2 AND id<\?3/);
  assert.match(importer, /\.bind\(organizationId, prefix, prefixUpperBound\)/);
  assert.doesNotMatch(importer, /id LIKE \?2/);
});

test("the Central de Conteúdo exposes dry-run before application", async () => {
  const ui = await read("app/admin/conteudo/OfficialBaseContentImport.tsx");
  assert.match(ui, /Executar dry-run/);
  assert.match(ui, /Aplicar importação/);
  assert.match(ui, /confirmation !== "IMPORTAR_CONTEUDO_BASE_OFICIAL"/);
  assert.match(ui, /updatesRequired/);
  assert.match(ui, /reconciliados/);
  assert.match(ui, /payload\.supportId/);
  assert.match(ui, /Nenhum conteúdo foi importado/);
});
