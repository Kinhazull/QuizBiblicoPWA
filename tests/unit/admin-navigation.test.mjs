import test from "node:test";
import assert from "node:assert/strict";
import { visibleAdminNavigation } from "../../app/admin-navigation-access.ts";

const adminNavigation = [
  { label: "Visão geral", items: [
    { label: "Painel", permissions: ["reports.view"] },
  ] },
  { label: "Usuários", items: [
    { label: "Usuários e membros", permissions: ["members.manage"] },
    { label: "Aprovações", permissions: ["members.manage", "invitations.manage"], requireAllPermissions: true },
    { label: "Permissões", permissions: ["permissions.manage"] },
    { label: "Comunicados", permissions: ["notifications.manage"] },
  ] },
  { label: "Conteúdo do Quiz", items: [
    { label: "Banco de perguntas", permissions: ["questions.edit", "questions.review", "rounds.manage"] },
    { label: "Perguntas arquivadas", permissions: ["questions.edit", "questions.review"] },
    { label: "Revisão de perguntas", permissions: ["questions.review"] },
    { label: "Revisão colaborativa", permissions: ["questions.edit", "questions.review"] },
  ] },
  { label: "Jogos", items: [] },
  { label: "Progressão", items: [] },
  { label: "Economia", items: [] },
  { label: "Operações", items: [
    { label: "Relatórios", permissions: ["reports.view"] },
    { label: "Auditoria administrativa", permissions: ["audit.view"] },
  ] },
];
const visible = access => visibleAdminNavigation(adminNavigation, access);
const items = groups => groups.flatMap(group => group.items);
const labels = groups => items(groups).map(item => item.label);

test("admin sees every configured entry and the reserved platform groups", () => {
  const navigation = visible({ role: "admin" });
  assert.deepEqual(navigation, adminNavigation);
  assert.deepEqual(navigation.map(group => group.label), [
    "Visão geral", "Usuários", "Conteúdo do Quiz", "Jogos",
    "Progressão", "Economia", "Operações",
  ]);
  assert.equal(navigation.find(group => group.label === "Jogos")?.items.length, 0);
});

test("leader visibility mirrors the legacy permissions enforced by the server", () => {
  const visibleLabels = labels(visible({ role: "leader" }));
  assert.ok(visibleLabels.includes("Usuários e membros"));
  assert.ok(visibleLabels.includes("Banco de perguntas"));
  assert.ok(visibleLabels.includes("Relatórios"));
  assert.ok(visibleLabels.includes("Auditoria administrativa"));
  assert.ok(!visibleLabels.includes("Permissões"));
  assert.ok(!visibleLabels.includes("Comunicados"));
});

test("an explicitly permitted collaborator sees only matching administrative entries", () => {
  const navigation = visible({
    role: "participant",
    permissions: ["questions.review", "audit.view"],
  });
  assert.deepEqual(labels(navigation), [
    "Banco de perguntas",
    "Perguntas arquivadas",
    "Revisão de perguntas",
    "Revisão colaborativa",
    "Auditoria administrativa",
  ]);
});

test("combined access page requires both member and invitation permissions", () => {
  const membersOnly = labels(visible({
    role: "participant",
    permissions: ["members.manage"],
  }));
  const complete = labels(visible({
    role: "participant",
    permissions: ["members.manage", "invitations.manage"],
  }));
  assert.ok(!membersOnly.includes("Aprovações"));
  assert.ok(complete.includes("Aprovações"));
});
