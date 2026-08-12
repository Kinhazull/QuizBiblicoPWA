import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const now = Date.now();
const dashboard = {
  metrics: { pending: 1, members: 42, rounds: 18, review: 3, health: "attention" },
  health: { status: "DEGRADED", checkedAt: now },
  usage: { activeUsers: 12, started: 18, completed: 14, completionRate: 77.8 },
  events: {
    active: { id: "event-1", title: "Semana da Esperança", status: "ACTIVE", startsAt: now - 60_000, endsAt: now + 3_600_000 },
    next: { id: "event-2", title: "Desafio dos Evangelhos", status: "SCHEDULED", startsAt: now + 86_400_000, endsAt: now + 90_000_000 },
  },
  content: { needsReview: 3, published: 1364, available: 1320, unprojected: 0, libraryHealth: { total: 3, counts: { critical: 1, attention: 2, info: 0 } } },
  reservations: { active: 12, expired: 1 },
  recent: [{ action: "content.published", entityType: "content", createdAt: now }],
  recommendations: [{ id: "operations:health:events", severity: "ATTENTION", domain:"OPERATIONS", title: "EVENTS: verificar saúde operacional", reason: "Reservas expiradas ainda ativas.", entity:{type:"health_group",id:"EVENTS"}, suggestedAction:"Abrir o diagnóstico.", href: "/admin/diagnostico", calculatedAt:now }],
};

async function mock(page: Page, payload = dashboard) {
  await page.route("**/api/auth/me", route => json(route, { user: { id: "admin", displayName: "Admin", role: "admin", permissions: [] } }));
  await page.route("**/api/admin/dashboard", route => json(route, payload));
}

test("Central Administrativa resume operação com drill-down acessível", async ({ page }) => {
  await mock(page);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Central Administrativa" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ações recomendadas" })).toBeVisible();
  await expect(page.getByText("Por que:")).toBeVisible();
  await page.getByLabel("Severidade").selectOption("ATTENTION");
  await page.getByLabel("Domínio").selectOption("OPERATIONS");
  await expect(page.getByText("Semana da Esperança")).toBeVisible();
  await expect(page.getByText("Desafio dos Evangelhos")).toBeVisible();
  await expect(page.getByText("1.364", { exact: true })).toBeVisible();
  await expect(page.getByText(/Biblioteca:.*3 sinal/)).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Atalhos administrativos" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  const audit = await new AxeBuilder({ page }).include("main").analyze();
  expect(audit.violations.filter(item => ["critical", "serious"].includes(item.impact || ""))).toEqual([]);
});

test("Central apresenta estado saudável quando não há alertas", async ({ page }) => {
  await mock(page, { ...dashboard, health: { status: "HEALTHY", checkedAt: now }, metrics: { ...dashboard.metrics, health: "healthy" }, recommendations: [], reservations: { active: 0, expired: 0 } });
  await page.goto("/admin");
  await expect(page.getByText("Nenhuma ação recomendada neste momento")).toBeVisible();
});
