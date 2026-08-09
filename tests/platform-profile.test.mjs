import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync("app/perfil/PlatformProfileOverview.tsx", "utf8");
const page = readFileSync("app/perfil/page.tsx", "utf8");
const css = readFileSync("app/profile.css", "utf8");

test("perfil da plataforma compõe identidade somente com APIs existentes", () => {
  for (const endpoint of ["/api/platform/progress", "/api/platform/statistics", "/api/platform/collections"]) {
    assert.ok(component.includes(endpoint), `endpoint ausente: ${endpoint}`);
  }
  for (const redundant of ["/api/platform/achievements", "/api/platform/missions/current", "/api/platform/inventory"]) {
    assert.ok(!component.includes(redundant), `leitura redundante: ${redundant}`);
  }
  assert.match(component, /cache:\s*"no-store"/);
  assert.doesNotMatch(component, /method:\s*"(?:POST|PUT|PATCH|DELETE)"/);
});

test("perfil possui estados de carregamento erro vazio e nova tentativa", () => {
  assert.match(component, /aria-busy="true"/);
  assert.match(component, /role="alert"/);
  assert.match(component, /Suas conquistas aparecerão aqui/);
  assert.match(component, /Tentar novamente/);
});

test("Perfil 2.0 expõe identidade progressão jogos conquistas e coleções", () => {
  for (const label of ["IDENTIDADE DO JOGADOR", "XP para o próximo", "moedas", "Partidas concluídas", "Dias ativos", "SEUS JOGOS", "Conquistas em destaque", "Suas coleções", "Ver todas as recompensas"]) {
    assert.ok(component.includes(label), `campo ausente: ${label}`);
  }
  assert.match(component, /role="progressbar"/);
  assert.match(component, /aria-valuenow/);
  assert.match(component, /gameModules\.map/);
  assert.match(component, /sessionsCompleted/);
  assert.match(component, /mostPlayed/);
  assert.match(component, /unlockedAt/);
  assert.doesNotMatch(component, /ranking|posição/i);
});

test("página integra a identidade sem remover edição recuperação e privacidade", () => {
  assert.match(page, /<PlatformProfileOverview\s+displayName=/);
  assert.match(page, /onSubmit=\{save\}/);
  assert.match(page, /recovery-codes/);
  assert.match(page, /<ProfilePrivacySections/);
});

test("layout do perfil adapta identidade jogos e coleções ao celular", () => {
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /@media\(max-width:340px\)/);
  assert.match(css, /minmax\(0,1fr\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
