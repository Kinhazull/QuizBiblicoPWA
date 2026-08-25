import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("registration requires separate, unchecked 18+ confirmation and legal documents", () => {
  const page = read("app/page.tsx"), endpoint = read("functions/api/auth/register.ts");
  assert.match(page, /name="adultConfirmed" type="checkbox" required/);
  assert.match(page, /Declaro que tenho 18 anos ou mais/);
  assert.doesNotMatch(page, /adultConfirmed[^>]*defaultChecked/);
  assert.match(page, /href="\/termos"/);
  assert.match(page, /href="\/privacidade"/);
  assert.match(endpoint, /body\.adultConfirmed !== true/);
  assert.match(endpoint, /adult_confirmation_required/);
});

test("public legal documents express 18+ policy and public deletion without obsolete minors rule", () => {
  const privacy = read("app/privacidade/page.tsx"), terms = read("app/termos/page.tsx"), deletion = read("app/privacidade/conta/page.tsx");
  const combined = `${privacy}\n${terms}`;
  assert.match(combined, /18 anos ou mais/);
  assert.doesNotMatch(combined, /Menores devem utilizar|Participantes menores devem utilizar/);
  assert.match(combined, /suporteconteosfeitos@gmail\.com/);
  assert.match(combined, /\/privacidade\/conta/);
  assert.match(privacy, /Cloudflare/);
  assert.match(privacy, /processar dados internacionalmente/);
  assert.match(combined, /REVISÃO HUMANA\/JURÍDICA NECESSÁRIA/);
  assert.doesNotMatch(deletion, /redirect\(/);
  assert.match(deletion, /Verificação de identidade/);
  assert.match(deletion, /Backups/);
  assert.match(deletion, /suporteconteosfeitos@gmail\.com/);
  assert.doesNotMatch(deletion, /30 dias|90 dias|12 meses|18 meses/);
});

test("reacceptance gate keeps public legal documents readable and exports acceptance evidence", () => {
  const gate = read("app/LegalAcceptanceGate.tsx"), exportData = read("functions/_lib/privacy-data.ts");
  assert.match(gate, /window\.location\.pathname === "\/termos"/);
  assert.match(gate, /window\.location\.pathname\.startsWith\("\/privacidade"\)/);
  assert.match(gate, /role="dialog"/);
  assert.match(gate, /role="alert"/);
  assert.match(exportData, /c\.document_type documentType/);
});
