import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const games = [
  ["quiz-biblico", "Quiz Bíblico", true], ["wordle-biblico", "Wordle Bíblico", true],
  ["linha-do-tempo-biblica", "Linha do Tempo Bíblica", true], ["memoria-biblica", "Memória Bíblica", true],
  ["associacao-de-temas", "Associação de Temas", true], ["quem-sou-eu", "Quem Sou Eu?", true],
  ["jogo-tres-pistas", "Jogo das 3 Pistas", true],
].map(([id, name, available]) => ({ id, name, available, criterion: ["memoria-biblica", "associacao-de-temas", "quem-sou-eu", "jogo-tres-pistas"].includes(String(id)) ? "Melhor desempenho normalizado" : "Melhor pontuação em uma partida" }));

function json(route: Route, body: unknown) { return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) }); }

async function mockRanking(page: Page) {
  await page.route("**/api/auth/me", route => json(route, { user: { id: "me", displayName: "Ana", role: "participant", mustChangePassword: false } }));
  await page.route("**/api/notifications", route => json(route, { unread: 0, notifications: [] }));
  await page.route("**/api/platform/rankings?**", route => {
    const url = new URL(route.request().url());
    const scope = url.searchParams.get("scope") || "overall";
    const gameId = url.searchParams.get("gameId");
    const normalized = scope === "game" && ["memoria-biblica", "associacao-de-temas", "quem-sou-eu", "jogo-tres-pistas"].includes(String(gameId));
    const entries = Array.from({ length: 10 }, (_, index) => ({ position: index + 1, displayName: `Pessoa ${index + 1}`, level: 5, totalXp: 2000 - index * 50, value: scope === "weekly" ? 100 - index : scope === "game" ? normalized ? 100 - index : 600 - index * 20 : 2000 - index * 50, sessionsCompleted: scope === "game" ? 4 : null, equipment: { avatar: index === 0 ? "avatar-lion" : null, frame: index === 0 ? "frame-gold" : null }, isCurrentUser: false }));
    return json(route, { scope, gameId, valueFormat: normalized ? "percentage" : scope === "game" ? "points" : undefined, criterion: scope === "game" ? normalized ? "Melhor desempenho normalizado" : "Melhor pontuação em uma partida" : scope === "weekly" ? "XP ganho na semana" : "XP total acumulado", entries, me: { position: 37, displayName: "Ana", level: 3, totalXp: 700, value: normalized ? 70 : 700, sessionsCompleted: null, equipment: { avatar: null, frame: null }, isCurrentUser: true }, games });
  });
}

test("Ranking Universal navega entre geral, semanal e jogos com posição própria", async ({ page }) => {
  await mockRanking(page);
  await page.goto("/rankings");
  await expect(page.getByRole("heading", { name: "Ranking Universal" })).toBeVisible();
  await expect(page.getByText("SUA POSIÇÃO")).toBeVisible();
  await expect(page.getByText("37º", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Semanal" }).click();
  await expect(page.getByText("XP ganho na semana")).toBeVisible();
  await page.getByRole("button", { name: "Por jogo" }).click();
  await expect(page.getByRole("combobox", { name: "Escolha o jogo" })).toBeVisible();
  await page.getByRole("combobox", { name: "Escolha o jogo" }).selectOption("memoria-biblica");
  await expect(page.getByText("Melhor desempenho normalizado")).toBeVisible();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
});

test("Ranking Universal é responsivo e sem violações Axe sérias", async ({ page }) => {
  await mockRanking(page);
  for (const viewport of [{ width: 320, height: 720 }, { width: 390, height: 844 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/rankings");
    await expect(page.getByRole("heading", { name: "Ranking Universal" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  }
  const audit = await new AxeBuilder({ page }).include("main").analyze();
  expect(audit.violations.filter(item => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});
