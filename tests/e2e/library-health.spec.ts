import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const now = Date.now();

async function mockLibrary(page: Page, insights: unknown[]) {
  await page.route("**/api/auth/me", route => json(route, { user: { id: "admin", displayName: "Admin", role: "admin", permissions: [] } }));
  await page.route("**/api/admin/content/library-health", route => json(route, {
    generatedAt: now, status: insights.length ? "attention" : "healthy", total: insights.length,
    counts: { critical: 0, attention: insights.length, info: 0 }, insights,
  }));
  await page.route("**/api/admin/content?*", route => json(route, {
    items: [], facets: { categories: [], books: [], tags: [], difficulties: ["EASY", "MEDIUM", "HARD"], statuses: ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"], sources: ["UNIVERSAL_CMS"] },
    pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1, hasMore: false },
    totals: { total: 0, archived: 0, needsReview: 0, byStatus: { DRAFT: 0, IN_REVIEW: 0, PUBLISHED: 0, ARCHIVED: 0 }, byGame: [] },
  }));
}

test("Biblioteca inteligente apresenta insights filtráveis sem overflow", async ({ page }) => {
  await mockLibrary(page, [{ id: "category:memory", rule: "category_concentration", severity: "attention", gameType: "memoria-biblica", title: "Memória Bíblica está concentrado em Personagens", description: "24/40 conteúdos (60%) pertencem à mesma categoria.", recommendation: "Considere ampliar outras categorias.", count: 24, percentage: 60 }]);
  await page.goto("/admin/conteudo/acervo");
  await expect(page.getByRole("heading", { name: "Biblioteca inteligente" })).toBeVisible();
  await expect(page.getByText("24/40 conteúdos (60%) pertencem à mesma categoria.")).toBeVisible();
  await page.getByLabel("Severidade").selectOption("critical");
  await expect(page.getByText("Nenhum insight corresponde aos filtros selecionados.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  const audit = await new AxeBuilder({ page }).include("main").analyze();
  expect(audit.violations.filter(item => ["critical", "serious"].includes(item.impact || ""))).toEqual([]);
});

test("Biblioteca inteligente apresenta estado sem alertas", async ({ page }) => {
  await mockLibrary(page, []);
  await page.goto("/admin/conteudo/acervo");
  await expect(page.getByText("Nenhum sinal editorial relevante")).toBeVisible();
});
