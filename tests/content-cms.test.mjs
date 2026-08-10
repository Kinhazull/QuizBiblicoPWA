import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const navigation = readFileSync(new URL("../app/navigation.tsx", import.meta.url), "utf8");
const quickNav = readFileSync(new URL("../app/AdminQuickNav.tsx", import.meta.url), "utf8");
const components = readFileSync(new URL("../app/admin/conteudo/ContentCms.tsx", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../app/admin/conteudo/page.tsx", import.meta.url), "utf8");
const archive = readFileSync(new URL("../app/admin/conteudo/acervo/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/content-cms.css", import.meta.url), "utf8");

test("admin navigation promotes universal content while legacy operational routes remain direct-only", () => {
  assert.match(navigation, /label: "Conteúdo"/);
  assert.match(navigation, /href: "\/admin\/conteudo"/);
  assert.match(navigation, /href: "\/admin\/conteudo\/acervo"/);
  for (const route of ["/admin/perguntas/revisao", "/admin/perguntas/importar", "/admin/perguntas/colaboracao"]) {
    assert.ok(navigation.includes(route), route);
  }
  assert.doesNotMatch(navigation, /\/admin\/rodadas|\/admin\/temporadas/);
  assert.match(navigation, /\/admin\/calendario/);
  assert.equal(readFileSync(new URL("../app/admin/rodadas/lista/page.tsx", import.meta.url), "utf8").length > 0, true);
  assert.match(navigation, /label: "Criar conteúdo"[\s\S]*?href: "\/admin\/conteudo\/editor"/);
  assert.doesNotMatch(navigation, /label: "Criar conteúdo"[\s\S]*?disabled: true/);
  assert.match(quickNav, /admin-nav-disabled/);
});

test("content dashboard and archive expose loading, error and empty accessible states", () => {
  assert.match(dashboard, /ContentDashboard/);
  assert.match(dashboard, /QuizCatalogDiagnostics/);
  assert.match(archive, /UniversalContentArchive/);
  assert.match(components, /CmsLoadingState/);
  assert.match(components, /CmsErrorState/);
  assert.match(components, /CmsEmptyState/);
  assert.match(components, /isDashboardData/);
  assert.match(components, /isContentResponse/);
  assert.match(components, /role="status"/);
  assert.match(components, /role="alert"/);
  assert.match(components, /aria-label="Filtros do Acervo"/);
});

test("content dashboard exposes the read-only Quiz catalog diagnostic", () => {
  assert.match(components, /Diagnosticar catálogo do Quiz/);
  assert.match(components, /\/api\/admin\/content\/quiz-catalog-diagnostics/);
  assert.match(components, /method: "GET"/);
  assert.match(components, /Conclusão automática/);
  assert.match(components, /Geração de partidas/);
  assert.match(components, /FREE PLAY/);
  assert.match(components, /Fingerprint conflitante/);
  assert.match(components, /Diagnóstico parcial disponível/);
  assert.match(components, /Código seguro/);
  assert.doesNotMatch(components, /MIGRAR_ACERVO_QUIZ_PARA_CMS/);
});

test("universal archive is responsive and contains no universal mutation controls", () => {
  assert.match(css, /@media\(max-width:650px\)/);
  assert.match(css, /minmax\(0,1fr\)/);
  assert.doesNotMatch(components, /method:\s*"(POST|PATCH|DELETE)"/);
  assert.doesNotMatch(components, /Salvar conteúdo|Publicar conteúdo|Arquivar conteúdo/);
});
