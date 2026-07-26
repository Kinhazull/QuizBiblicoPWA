import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("participant navigation has exactly five named destinations and keeps admin contextual", () => {
  const config = read("app/navigation.tsx"), chrome = read("app/ParticipantChrome.tsx");
  for (const label of ["Início", "Jornada", "Ranking", "Medalhas", "Perfil"]) assert.match(config, new RegExp(`label: "${label}"`));
  assert.doesNotMatch(config.match(/participantNavigation[\s\S]*?\];/)?.[0] || "", /Painel|Rankings/);
  assert.match(chrome, /Abrir painel administrativo/);
});

test("participant controls expose notices settings active state and safe areas", () => {
  const chrome = read("app/ParticipantChrome.tsx"), nav = read("app/LearningQuickNav.tsx"), css = read("app/brand-system.css");
  assert.match(chrome, /avisos não lidos/); assert.match(chrome, /aria-label="Abrir painel administrativo"/); assert.match(chrome, /\["admin", "leader"\]/);
  assert.match(nav, /aria-current=.*page/); assert.match(nav, /aria-label="Navegação principal"/);
  assert.match(css, /safe-area-inset-bottom/); assert.match(css, /min-height:44px/); assert.match(css, /prefers-reduced-motion/); assert.match(css, /overflow:hidden/);
});

test("profile owns explicit secure logout and privileged admin entry", () => {
  const profile = read("app/ProfilePrivacySections.tsx"), logout = read("app/LogoutButton.tsx");
  assert.doesNotMatch(profile, /Abrir painel administrativo|Administração|Sessão/); assert.match(profile, /LogoutButton/);
  assert.match(logout, /Sair da conta/); assert.match(logout, /\/api\/auth\/logout/); assert.match(logout, /CLEAR_PRIVATE_STATE/); assert.match(logout, /location\.replace/);
});

test("admin navigation is one-column collapsible accessible and centrally named", () => {
  const menu = read("app/AdminQuickNav.tsx"), config = read("app/navigation.tsx"), css = read("app/brand-system.css");
  assert.match(menu, /adminNavigation/); assert.match(menu, /aria-expanded/); assert.match(menu, /event\.key === "Escape"/); assert.match(menu, /toggleRef\.current\?\.focus/); assert.match(menu, /aria-current/);
  for (const label of ["Visão geral", "Usuários", "Conteúdo do Quiz", "Jogos", "Progressão", "Economia", "Operações"]) assert.match(config, new RegExp(label));
  for (const label of ["Usuários e membros", "Aprovações", "Comunicados", "Revisão colaborativa", "Auditoria administrativa"]) assert.match(config, new RegExp(label));
  assert.match(menu, /admin-nav-empty/);
  assert.doesNotMatch(config, /Sugestões com IA/);
  assert.match(css, /\.admin-nav-group nav\{display:flex!important;flex-direction:column/);
});

test("admin menu applies existing role and permission visibility without replacing server authorization", () => {
  const menu = read("app/AdminQuickNav.tsx"), config = read("app/navigation.tsx"), access = read("app/admin-navigation-access.ts"), permissions = read("functions/_lib/permissions.ts");
  assert.match(menu, /visibleAdminNavigation\(adminNavigation, user\)/);
  assert.match(access, /access\.role === "admin"/);
  assert.match(access, /access\.role === "leader"/);
  assert.match(config, /requireAllPermissions/);
  assert.match(config, /permissions: \["permissions\.manage"\]/);
  assert.match(config, /permissions: \["notifications\.manage"\]/);
  assert.match(permissions, /requirePermission/);
  assert.match(permissions, /legacyLeader/);
});

test("admin dashboard renders real attention states metrics and actionable links", () => {
  const page = read("app/admin/page.tsx"), endpoint = read("functions/api/admin/dashboard.ts");
  assert.match(page, /Precisa de atenção/); assert.match(page, /Nenhuma pendência crítica no momento/); assert.match(page, /Carregando pendências/); assert.match(page, /Não foi possível carregar/);
  assert.match(endpoint, /requirePermission/); assert.match(endpoint, /organization_id=\?1/); assert.match(endpoint, /Cache-Control/); assert.match(endpoint, /rounds a JOIN rounds b/);
});
