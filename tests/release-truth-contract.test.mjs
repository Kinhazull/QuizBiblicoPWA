import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("fonte corrente distingue baseline remota comprovada dos gates finais da RC", async () => {
  const [state, roadmap, snapshot, issues, deprecations] = await Promise.all([
    read("docs/AI/CURRENT_STATE.md"),
    read("docs/PRODUCT/ROADMAP.md"),
    read("docs/PRODUCT/RELEASE_SNAPSHOT.md"),
    read("docs/AI/KNOWN_ISSUES.md"),
    read("docs/PRODUCT/DEPRECATIONS.md"),
  ]);
  assert.match(state, /Status:\*\* CURRENT/);
  assert.match(state, /0039_administrative_mfa\.sql/);
  assert.match(state, /ledger remoto verificado: 40 migrations/i);
  assert.match(state, /WORKER_CURRENT_VERIFIED/);
  assert.match(state, /27\.7\.1 Fechamento dos blockers internos: concluída localmente/);
  assert.doesNotMatch(state, /27\.7 não foi iniciada/);
  assert.match(roadmap, /25\.5 \| Ranking Universal \| DONE/);
  assert.match(roadmap, /27\.7\.0 \| Release Readiness Final \| DONE/);
  assert.match(roadmap, /27\.7\.2 \| Preparação de Produção \| DONE/);
  assert.match(roadmap, /27\.7\.3 \| RC Final \| DONE/);
  assert.match(roadmap, /27\.7\.4 \| Validação Manual do Usuário \| DONE/);
  assert.match(roadmap, /27\.7\.5 \| Correções e Revalidação \| TECHNICALLY FINAL/);
  assert.match(roadmap, /27\.7\.5E \| Android\/PWA\/Web Vitals \| DONE/);
  assert.match(snapshot, /0039: `0039_PRODUCTION_VERIFIED`/);
  assert.match(snapshot, /PAGES_RUNTIME_SMOKE_VERIFIED/);
  assert.match(snapshot, /WORKER_CURRENT_VERIFIED/);
  assert.match(snapshot, /RC_TECHNICAL_AND_PWA_VALIDATION_COMPLETE/);
  assert.match(snapshot, /32925202745/);
  assert.doesNotMatch(snapshot, /REMOTE_UNKNOWN \/ TO_VERIFY_IN_27_7_2/);
  assert.doesNotMatch(snapshot, /Analytics 2\.0 não faz parte|ainda não foi iniciado/);
  assert.doesNotMatch(issues, /runtime ainda usa a identidade anterior/);
  assert.doesNotMatch(issues, /integrar 16 arquivos/);
  assert.match(deprecations, /KEEP_HISTORICAL_COMPATIBILITY/);
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
