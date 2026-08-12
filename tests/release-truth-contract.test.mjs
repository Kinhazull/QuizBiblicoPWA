import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("fonte corrente não reconstrói entregas nem inventa ledger remoto", async () => {
  const [state, roadmap, snapshot] = await Promise.all([
    read("docs/AI/CURRENT_STATE.md"),
    read("docs/PRODUCT/ROADMAP.md"),
    read("docs/PRODUCT/RELEASE_SNAPSHOT.md"),
  ]);
  assert.match(state, /Status:\*\* CURRENT/);
  assert.match(state, /0038_platform_rankings_indexes\.sql/);
  assert.match(state, /requer verificação operacional/i);
  assert.match(state, /26\.5 Analytics 2\.0: concluída localmente, ainda não commitada/);
  assert.match(roadmap, /25\.5 \| Ranking Universal \| DONE/);
  assert.match(roadmap, /26\.5 \| Analytics 2\.0 \| DONE localmente/);
  assert.match(roadmap, /Fase 9 — Evolução dos Jogos e Base de Conhecimento/);
  assert.match(snapshot, /\*\*NO-GO para release pública final\.\*\*/);
});

test("regras permitem main apenas com autorização e separam operações remotas", async () => {
  const [agents, rules, feature, domains] = await Promise.all([
    read("docs/AI/AGENTS.md"),
    read("docs/AI/AI_RULES.md"),
    read("docs/AI/CODEX/FEATURE.md"),
    read("docs/AI/DOMAIN_RULES.md"),
  ]);
  for (const source of [agents, rules, feature]) {
    assert.match(source, /main.*autoriza/i);
    assert.match(source, /remot/i);
  }
  assert.doesNotMatch(rules, /não toque na `main`/i);
  assert.doesNotMatch(feature, /não trabalhar na `main`/i);
  assert.match(domains, /Ranking Universal pertence à plataforma/);
});

test("deprecações distinguem ranking universal do legado do Quiz", async () => {
  const deprecations = await read("docs/PRODUCT/DEPRECATIONS.md");
  assert.match(deprecations, /`\/rankings` \| \*\*CURRENT\*\*/);
  assert.match(deprecations, /ranking histórico do Quiz \| LEGACY/);
});
