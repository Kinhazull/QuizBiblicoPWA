import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { APPLICATION_TABLES, PRIVACY_TABLE_CLASSIFICATION } from "../shared/operational-schema-contract.mjs";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("privacy inventory tracks the full operational schema through 0039", async () => {
  assert.equal(APPLICATION_TABLES.length, 70);
  assert.equal(Object.keys(PRIVACY_TABLE_CLASSIFICATION).length, APPLICATION_TABLES.length);
  const inventory = await read("docs/PRIVACY_DATA_INVENTORY.md");
  assert.match(inventory, /70 tabelas/);
  for (const table of ["user_mfa", "mfa_recovery_codes", "mfa_login_challenges"]) assert.ok(PRIVACY_TABLE_CLASSIFICATION[table]);
});

test("legal and Play documents keep human decisions explicit", async () => {
  const files = await Promise.all([
    read("docs/LEGAL_DOCUMENTS_V2_DRAFT.md"),
    read("docs/GOOGLE_PLAY_PREPARATION.md"),
    read("docs/APP_DATA_SAFETY_CHECKLIST.md"),
    read("docs/PRODUCT/LEGAL_PLAY_RELEASE_READINESS.md"),
  ]);
  assert.ok(files.every(text => /HUMAN_(?:DECISION|REVIEW)_REQUIRED/.test(text)));
  assert.match(files[1], /Trusted Web Activity/);
  assert.match(files[1], /package\/application ID.*HUMAN_DECISION_REQUIRED/);
  assert.doesNotMatch(files[1], /applicationId\s+["']/);
});

test("public legal surfaces use only the approved institutional contact", async () => {
  const publicPages = await Promise.all([
    read("app/privacidade/page.tsx"),
    read("app/termos/page.tsx"),
  ]);
  for (const page of publicPages) {
    assert.match(page, /suporteconteosfeitos@gmail\.com/);
    assert.doesNotMatch(page, /lucas\.o\.silva0105@gmail\.com/);
    assert.match(page, /pessoa física responsável pelo projeto/);
    assert.match(page, /endereço residencial não (?:é|são) publicado/);
  }
});

test("v2 target audience policy is explicit without inventing child controls", async () => {
  const docs = await Promise.all([
    read("docs/LEGAL_DOCUMENTS_V2_DRAFT.md"),
    read("docs/GOOGLE_PLAY_PREPARATION.md"),
    read("docs/PRIVACY_DATA_INVENTORY.md"),
    read("docs/PRODUCT/LEGAL_PLAY_RELEASE_READINESS.md"),
  ]);
  assert.ok(docs.every(text => /18 anos|ADULTS_ONLY_18_PLUS/.test(text)));
  assert.ok(docs.every(text => /crianças|ADULTS_ONLY_18_PLUS/.test(text)));
  assert.match(docs[0], /HUMAN_LEGAL_REVIEW_REQUIRED/);
  assert.match(docs[1], /Families/);
  assert.match(docs[2], /não há coleta de data de nascimento/);
  assert.doesNotMatch(docs.join("\n"), /idade mínima (?:é|de) \d+/i);
});

test("retention policy stays preliminary and does not claim automated deletion", async () => {
  const inventory = await read("docs/PRIVACY_DATA_INVENTORY.md");
  for (const classification of ["MUST_KEEP", "RETENTION_CANDIDATE", "AGGREGATE_THEN_RETIRE", "EPHEMERAL"]) {
    assert.match(inventory, new RegExp(classification));
  }
  assert.match(inventory, /30–90 dias/);
  assert.match(inventory, /12–18 meses/);
  assert.match(inventory, /não excluirá contas automaticamente por inatividade/);
  assert.match(inventory, /Nenhum job, TTL, `DELETE` automático/);
});

test("international processing roles remain distinct and legally unasserted", async () => {
  const inventory = await read("docs/PRIVACY_DATA_INVENTORY.md");
  const publicPrivacy = await read("app/privacidade/page.tsx");
  assert.match(inventory, /Cloudflare: runtime, Pages\/Workers, D1 e observabilidade/);
  assert.match(inventory, /GitHub: código-fonte, CI, artifacts de build/);
  assert.match(inventory, /não significam que todos os fornecedores recebem os mesmos dados/);
  assert.match(publicPrivacy, /podem processar dados internacionalmente/);
  assert.doesNotMatch(publicPrivacy, /fora do Brasil/);
});

test("Data Safety does not invent advertising payments or sensitive device access", async () => {
  const matrix = await read("docs/APP_DATA_SAFETY_CHECKLIST.md");
  assert.match(matrix, /nenhum SDK de anúncios, pagamento, crash analytics ou tracking/);
  assert.match(matrix, /Localização, contatos, fotos, áudio, câmera/);
  assert.match(matrix, /não encontrado/);
});
