import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const games = [
  ["wordle-biblico", "Wordle Diário"], ["quiz-biblico", "Quiz Diário"],
  ["linha-do-tempo-biblica", "Linha do Tempo Diária"], ["memoria-biblica", "Memória Diária"],
  ["associacao-de-temas", "Associação Diária"], ["quem-sou-eu", "Quem Sou Eu? Diário"],
  ["jogo-tres-pistas", "Três Pistas Diário"],
] as const;

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

function dailyState(wins = 3) {
  const objectives = games.map(([gameType, title], index) => ({
    gameType, title, selectionId: `selection-${index + 1}`, playHref: `/jogos/${gameType}?daily=selection-${index + 1}`,
    status: index < wins ? "FINISHED" : index === wins ? "FINISHED" : "CREATED",
    availability: "AVAILABLE", unavailableReason: null,
    state: index < wins ? "WON" : index === wins ? "LOST" : "AVAILABLE",
  }));
  return {
    dayKey: "2026-08-09", timeZone: "America/Sao_Paulo", wins, played: Math.min(7, wins + 1), unavailable: 0, total: 7,
    objectives,
    rewards: [
      { target: 3, state: wins >= 3 ? "READY" : "LOCKED", reward: { xp: 30, coins: 5, label: "+30 XP e +5 moedas" } },
      { target: 7, state: wins >= 7 ? "READY" : "LOCKED", reward: { xp: 70, coins: 12, label: "+70 XP e +12 moedas" } },
    ],
  };
}

async function mockDaily(page: Page, wins = 3) {
  let state = dailyState(wins);
  await page.route("**/api/auth/me", route => json(route, { user: { id: "daily-player", displayName: "Participante", role: "participant", mustChangePassword: false } }));
  await page.route("**/api/notifications", route => json(route, { unread: 0, notifications: [] }));
  await page.route("**/api/platform/daily-objectives/rewards", route => {
    const target = Number(route.request().postDataJSON().target);
    state = { ...state, rewards: state.rewards.map(item => item.target === target ? { ...item, state: "CLAIMED" } : item) };
    return json(route, { daily: state, progress: { level: 1, totalXp: 25, coins: 3 } });
  });
  await page.route("**/api/platform/daily-objectives", route => json(route, state));
}

test("Daily mostra vitória, derrota, claim 3/7 e nunca oferece Continuar ou replay", async ({ page }) => {
  await mockDaily(page, 3);
  await page.goto("/desafios-diarios");
  await expect(page.getByRole("heading", { name: /Desafios Diários/i })).toBeVisible();
  await expect(page.getByText("3 de 7 vitórias")).toBeVisible();
  await expect(page.getByText("Vitória registrada para hoje.").first()).toBeVisible();
  await expect(page.getByText("Sua tentativa de hoje foi encerrada.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resgatar" })).toBeVisible();
  await expect(page.getByText(/Continuar|Jogar novamente|Tentar novamente/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Resgatar" }).click();
  await expect(page.getByText("Recompensa de 3/7 resgatada!")).toBeVisible();
  await expect(page.getByText("Concluído ✓").first()).toBeVisible();
  const audit = await new AxeBuilder({ page }).include("main").analyze();
  expect(audit.violations.filter(item => ["critical", "serious"].includes(item.impact || ""))).toEqual([]);
});

test("Daily cabe no viewport e mantém ações acessíveis", async ({ page }) => {
  await mockDaily(page, 7);
  for (const width of [320, 360, 390, 412]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/desafios-diarios");
    await expect(page.getByText("7 de 7 vitórias")).toBeVisible();
    await expect(page.getByRole("button", { name: "Resgatar" })).toHaveCount(2);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, `overflow horizontal em ${width}px`).toBe(false);
    for (const button of await page.locator("main").getByRole("button").all()) {
      const box = await button.boundingBox();
      if (box) expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
});
