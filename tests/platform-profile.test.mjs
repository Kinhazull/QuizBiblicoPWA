import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync("app/perfil/PlatformProfileOverview.tsx", "utf8");
const page = readFileSync("app/perfil/page.tsx", "utf8");
const css = readFileSync("app/profile.css", "utf8");

test("perfil da plataforma consulta somente as quatro APIs existentes", () => {
  for (const endpoint of ["/api/platform/progress", "/api/platform/statistics", "/api/platform/achievements", "/api/platform/missions/current"]) {
    assert.ok(component.includes(endpoint), `endpoint ausente: ${endpoint}`);
  }
  assert.match(component, /cache:\s*"no-store"/);
  assert.doesNotMatch(component, /method:\s*"(?:POST|PUT|PATCH|DELETE)"/);
});

test("perfil possui estados de carregamento erro vazio e nova tentativa", () => {
  assert.match(component, /aria-busy="true"/);
  assert.match(component, /role="alert"/);
  assert.match(component, /Nenhuma missão disponível/);
  assert.match(component, /histórico começará a aparecer/);
  assert.match(component, /Tentar novamente/);
});

test("resumo expõe progresso estatísticas conquistas e missões com acessibilidade", () => {
  for (const label of ["XP para o próximo nível", "moedas", "Partidas oficiais", "Perguntas", "Partidas perfeitas", "Dias ativos", "Conquistas", "MISSÕES ATUAIS"]) {
    assert.ok(component.includes(label), `campo ausente: ${label}`);
  }
  assert.match(component, /role="progressbar"/);
  assert.match(component, /aria-valuenow/);
});

test("página integra o resumo sem remover edição recuperação e privacidade", () => {
  assert.match(page, /<PlatformProfileOverview\s*\/>/);
  assert.match(page, /onSubmit=\{save\}/);
  assert.match(page, /recovery-codes/);
  assert.match(page, /<ProfilePrivacySections/);
});

test("layout do perfil adapta cartões e missões ao celular", () => {
  assert.match(css, /@media\(max-width:430px\)/);
  assert.match(css, /minmax\(0,1fr\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
