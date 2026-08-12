import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("modern participant surfaces do not expose historical Journey or Medals navigation", async () => {
  const [navigation, quickNav, header, home] = await Promise.all([
    read("app/navigation.tsx"),
    read("app/LearningQuickNav.tsx"),
    read("app/ParticipantPageHeader.tsx"),
    read("app/PlatformHome.tsx"),
  ]);
  assert.doesNotMatch(navigation, /href:\s*["']\/(?:jornada|medalhas)["']/);
  assert.doesNotMatch(quickNav, /["']\/(?:jornada|medalhas)["']/);
  assert.doesNotMatch(header, /["']\/(?:jornada|medalhas)["']/);
  assert.match(home, /href="\/rankings"/);
  assert.doesNotMatch(home, /href="\/ranking"/);
});

test("historical participant and analytics routes redirect to current products", async () => {
  const [journey, medals, analytics] = await Promise.all([
    read("app/jornada/page.tsx"),
    read("app/medalhas/page.tsx"),
    read("app/admin/analises/page.tsx"),
  ]);
  assert.match(journey, /redirect\("\/jogos"\)/);
  assert.match(medals, /redirect\("\/recompensas"\)/);
  assert.match(analytics, /redirect\("\/admin\/analytics"\)/);
});

test("modern admin navigation has no historical CMS links or empty placeholders", async () => {
  const navigation = await read("app/navigation.tsx");
  for (const route of ["/admin/analises", "/admin/perguntas/revisao", "/admin/perguntas/importar", "/admin/perguntas/colaboracao"]) {
    assert.doesNotMatch(navigation, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.doesNotMatch(navigation, /emptyLabel:/);
});

test("legacy route CSS is not loaded globally and active copy uses platform language", async () => {
  const [layout, profile, overview, recovery, invitations] = await Promise.all([
    read("app/layout.tsx"),
    read("app/perfil/page.tsx"),
    read("app/perfil/PlatformProfileOverview.tsx"),
    read("app/recuperar-conta/page.tsx"),
    read("app/admin/acessos/page.tsx"),
  ]);
  assert.doesNotMatch(layout, /(?:journey|medals)\.css/);
  for (const surface of [profile, overview, recovery, invitations]) {
    assert.doesNotMatch(surface, /Jornada Bíblica|SUA JORNADA|sua jornada|Resumo da jornada|Volte para sua/);
  }
  assert.match(invitations, /entrar no Conte os Feitos/);
});
