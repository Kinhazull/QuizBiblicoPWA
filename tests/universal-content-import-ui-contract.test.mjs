import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/admin/conteudo/UniversalContentImport.tsx", import.meta.url), "utf8");

test("universal import derives apply intent from the submitted button", () => {
  assert.match(source, /submitter\.value === "apply"/);
  assert.match(source, /name="intent" value="dry-run"/);
  assert.match(source, /name="intent" value="apply"/);
  assert.doesNotMatch(source, /setApplying/);
});

test("universal import never applies without the exact administrative confirmation", () => {
  assert.match(source, /const CONFIRMATION = "IMPORTAR_CONTEUDO_UNIVERSAL"/);
  assert.match(source, /confirmation !== CONFIRMATION/);
  assert.match(source, /disabled={!dryRunReady \|\| confirmation !== CONFIRMATION/);
});

test("universal import explains its safe three-step workflow", () => {
  assert.match(source, /1\. Prepare/);
  assert.match(source, /2\. Valide/);
  assert.match(source, /3\. Importe/);
  assert.match(source, /type="file"/);
  assert.match(source, /Carregar modelo/);
  assert.match(source, /O dry-run é seguro: nenhuma alteração é feita no CMS/);
});

test("universal import documents the accepted JSON and CSV contracts", () => {
  assert.match(source, /externalId,gameType,status,category,difficulty,biblicalReference,tags,payload/);
  assert.match(source, /metadata/);
  assert.match(source, /payload/);
  assert.match(source, /DRAFT/);
  assert.match(source, /PUBLISHED/);
});
