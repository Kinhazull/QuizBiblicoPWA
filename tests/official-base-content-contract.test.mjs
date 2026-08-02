import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("official base import remains an authenticated administrative operation with explicit confirmation", async () => {
  const route = await read("functions/api/admin/content/import-official-base.ts");
  assert.match(route, /requirePermission\(request, env, "questions\.edit"\)/);
  assert.match(route, /IMPORTAR_CONTEUDO_BASE_OFICIAL/);
  assert.match(route, /body\.commit === true/);
});

test("the Central de Conteúdo exposes dry-run before application", async () => {
  const ui = await read("app/admin/conteudo/OfficialBaseContentImport.tsx");
  assert.match(ui, /Executar dry-run/);
  assert.match(ui, /Aplicar importação/);
  assert.match(ui, /confirmation !== "IMPORTAR_CONTEUDO_BASE_OFICIAL"/);
});
