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
  assert.match(source, /confirmation !== "IMPORTAR_CONTEUDO_UNIVERSAL"/);
  assert.match(source, /confirmation_required/);
});
