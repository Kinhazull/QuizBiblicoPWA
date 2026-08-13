import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function mockProfile(page: Page) {
  await page.route("**/api/auth/me", route => json(route, { user: { id: "profile-player", displayName: "Ana", role: "participant", mustChangePassword: false } }));
  await page.route("**/api/notifications", route => json(route, { unread: 0, notifications: [] }));
  await page.route("**/api/profile/me", route => json(route, { user: { id: "profile-player", displayName: "Ana Souza", nickname: "Ana", role: "participant", bio: "", favoriteBook: "", favoriteVerse: "", useNicknameInRanking: false, profilePublic: false } }));
  await page.route("**/api/platform/progress", route => json(route, { progress: { level: 4, totalXp: 1260, coins: 84, levelProgress: { currentXp: 260, targetXp: 500, percent: 52 } } }));
  await page.route("**/api/platform/rankings?scope=overall&limit=10", route => json(route, { me: { position: 7, totalXp: 1260 } }));
  await page.route("**/api/platform/statistics", route => json(route, {
    global: { sessionsCompleted: 28, gamesUsed: 7, activeDays: 9, currentDailyStreak: 4, officialGamesCompleted: 20, questionsAnswered: 70, perfectGames: 6, distinctOfficialPlayDaysUtc: 8 },
    games: [
      { gameId: "quiz-biblico", sessionsStarted: 10, sessionsCompleted: 9, questionsAnswered: 45, correctAnswers: 36, accuracy: 80, bestScore: 500, lastActivityAt: Date.UTC(2026, 7, 9) },
      { gameId: "wordle-biblico", sessionsStarted: 7, sessionsCompleted: 7, questionsAnswered: 0, correctAnswers: 0, accuracy: null, bestScore: 450, lastActivityAt: Date.UTC(2026, 7, 8) },
      { gameId: "linha-do-tempo-biblica", sessionsStarted: 3, sessionsCompleted: 3, questionsAnswered: 0, correctAnswers: 0, accuracy: null, bestScore: 300, lastActivityAt: null },
      { gameId: "memoria-biblica", sessionsStarted: 3, sessionsCompleted: 3, questionsAnswered: 0, correctAnswers: 0, accuracy: null, bestScore: 250, lastActivityAt: null },
      { gameId: "associacao-de-temas", sessionsStarted: 2, sessionsCompleted: 2, questionsAnswered: 0, correctAnswers: 0, accuracy: null, bestScore: 200, lastActivityAt: null },
      { gameId: "quem-sou-eu", sessionsStarted: 2, sessionsCompleted: 2, questionsAnswered: 0, correctAnswers: 0, accuracy: null, bestScore: 180, lastActivityAt: null },
      { gameId: "jogo-tres-pistas", sessionsStarted: 2, sessionsCompleted: 2, questionsAnswered: 0, correctAnswers: 0, accuracy: null, bestScore: 170, lastActivityAt: null },
    ],
  }));
  await page.route("**/api/platform/collections", route => json(route, {
    summary: { collections: 2, completedCollections: 0, collectibles: 16, ownedCollectibles: 4, achievements: 14, unlockedAchievements: 3 },
    equipment: { avatar: "avatar-lion", frame: "frame-gold" },
    collections: [
      { id: "biblical-symbols", name: "Símbolos Bíblicos", coverIcon: "🕊️", progress: { acquired: 2, total: 8, percent: 25, status: "IN_PROGRESS" }, items: [{ id: "avatar-lion", category: "avatar", name: "Avatar Leão", icon: "🦁", owned: true, equipped: true }] },
      { id: "journey-frames", name: "Molduras da Jornada", coverIcon: "✨", progress: { acquired: 2, total: 8, percent: 25, status: "IN_PROGRESS" }, items: [{ id: "frame-gold", category: "frame", name: "Moldura Ouro", icon: "🥇", owned: true, equipped: true }] },
    ],
    achievements: [
      { code: "first_steps", name: "Primeiros Passos", description: "Conclua sua primeira partida.", icon: "⭐", secret: false, unlocked: true, unlockedAt: Date.UTC(2026, 7, 9), state: "UNLOCKED" },
      { code: "hidden_unlocked", name: "Feito secreto revelado", description: "Você descobriu este feito.", icon: null, secret: true, unlocked: true, unlockedAt: Date.UTC(2026, 7, 8), state: "UNLOCKED" },
      { code: "hidden_locked", name: "Conquista secreta", description: "Continue explorando a plataforma para descobrir.", icon: null, secret: true, unlocked: false, unlockedAt: null, state: "LOCKED" },
    ],
  }));
}

test("Perfil 2.0 apresenta identidade e os sete jogos sem expor conquista oculta", async ({ page }) => {
  await mockProfile(page);
  for (const width of [320, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });
    await page.goto("/perfil");
    await expect(page.getByRole("heading", { name: "Ana", exact: true })).toBeVisible();
    await expect(page.getByText("Avatar Leão · Moldura Ouro")).toBeVisible();
    await expect(page.locator(".equipped-avatar-base .collectible-art img")).toHaveCount(1);
    await expect(page.locator(".equipped-avatar-frame img")).toHaveCount(1);
    await expect(page.getByText("Mais jogado:").locator("..") ).toContainText("Quiz Bíblico");
    await expect(page.locator(".platform-profile-game-grid article")).toHaveCount(7);
    await expect(page.locator(".platform-profile-progress-card .reward-art img")).toHaveCount(2);
    await expect(page.getByRole("heading", { name: "7º lugar no ranking geral" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver ranking completo" })).toHaveAttribute("href", "/rankings");
    await expect(page.getByText("Feito secreto revelado")).toBeVisible();
    await expect(page.getByText("hidden_locked")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  }
  const audit = await new AxeBuilder({ page }).include("main").analyze();
  expect(audit.violations.filter(item => ["critical", "serious"].includes(item.impact || ""))).toEqual([]);
});
