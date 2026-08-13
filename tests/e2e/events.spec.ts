import { expect, test, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const participant = { id: "event-player", displayName: "Participante Evento", role: "participant", mustChangePassword: false };
const admin = { id: "event-admin", displayName: "Administrador Evento", role: "admin", mustChangePassword: false };
const startsAt = Date.now() - 60_000;
const endsAt = Date.now() + 3_600_000;

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function mockIdentity(page: Page, user: typeof participant | typeof admin) {
  await page.route("**/api/auth/me", route => json(route, { user }));
  await page.route("**/api/notifications", route => json(route, { unread: 0, notifications: [] }));
}

async function mockHomeDependencies(page: Page, eventVisible: () => boolean) {
  await page.route("**/api/platform/achievements", route => json(route, { achievements: [], summary: { total: 0, unlocked: 0, pending: 0 } }));
  await page.route("**/api/platform/daily-objectives", route => json(route, { objectives: [] }));
  await page.route("**/api/platform/inventory", route => json(route, { items: [], equipped: { avatar: null, frame: null } }));
  await page.route("**/api/platform/daily/check-in", route => json(route, {
    daily: {
      dayKey: "2026-08-02", streak: 1,
      login: { claimed: true, reward: { xp: 10, coins: 2, label: "+10 XP e +2 moedas" } },
      mission: null,
      chest: { unlocked: false, opened: false, reward: null, preview: { xp: 10, coins: 2, label: "+10 XP e +2 moedas" } },
      progress: { level: 1, totalXp: 10, coins: 2, curveVersion: "v1", levelProgress: { currentXp: 10, targetXp: 100, percent: 10 } },
    },
  }));
  await page.route("**/api/platform/events", route => json(route, {
    events: eventVisible() ? [{ id: "event-e2e", title: "Semana da Fé", description: "Jogos especiais da comunidade.", status: "ACTIVE", startsAt, endsAt }] : [],
  }));
}

test("administrador cria, valida, agenda e cancela um Evento", async ({ page }) => {
  await mockIdentity(page, admin);
  let status = "";
  await page.route("**/api/admin/events/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/validate")) return json(route, { valid: true, errors: [] });
    if (url.pathname.endsWith("/schedule")) { status = "SCHEDULED"; return json(route, { scheduled: true }); }
    if (url.pathname.endsWith("/cancel")) { status = "CANCELLED"; return json(route, { cancelled: true }); }
    return json(route, { error: "not_found" }, 404);
  });
  await page.route("**/api/admin/events", async route => {
    if (route.request().method() === "GET") {
      return json(route, { events: status ? [{ id: "event-e2e", title: "Semana da Fé", status, startsAt, endsAt, games: [] }] : [] });
    }
    const body = route.request().postDataJSON();
    expect(body.title).toBe("Semana da Fé");
    expect(body.timeZone).toBe("America/Sao_Paulo");
    expect(body.completionRule).toBe("MINIMUM");
    expect(body.games).toHaveLength(1);
    status = "DRAFT";
    return json(route, { event: { id: "event-e2e" } }, 201);
  });
  await page.route("**/api/admin/assets?status=ACTIVE", route => json(route, { assets: [{ id: "asset-event", title: "Capa oficial", type: "BANNER", status: "ACTIVE", source_url: "https://example.com/event.webp", alt_text: "Capa do evento" }] }));
  await page.route("**/api/admin/events/suggest-content?*", route => json(route, { options: [{ contentId: "wordle-event", contentVersion: 1, title: "Palavra da fé", category: "Fé", difficulty: "EASY", themes: ["Fé"], biblicalReference: "Hebreus 11:1" }], counts: { available: 40, reserved: 2, archived: 0 } }));

  await page.goto("/admin/eventos");
  await page.getByLabel("Título").fill("Semana da Fé");
  await page.getByLabel("Descrição").fill("Jogos especiais da comunidade.");
  await page.getByRole("button", { name: "Próximo" }).click();
  await page.getByText("Wordle Bíblico", { exact: true }).click();
  await page.getByRole("button", { name: "Próximo" }).click();
  await page.getByText("Palavra da fé", { exact: true }).click();
  await page.getByRole("button", { name: "Próximo" }).click();
  await page.getByLabel("Regra de conclusão").selectOption("MINIMUM");
  await page.getByLabel("Mínimo de jogos").fill("1");
  await page.getByRole("button", { name: "Próximo" }).click();
  await page.getByLabel("XP por participação").fill("20");
  await page.getByRole("button", { name: "Próximo" }).click();
  await page.getByLabel("Capa do Evento").selectOption("asset-event");
  await page.getByRole("button", { name: "Próximo" }).click();
  await expect(page.getByText(/1 selecionado/)).toBeVisible();
  await page.getByRole("button", { name: "Próximo" }).click();
  await page.getByLabel("Início").fill("2026-08-02T12:00");
  await page.getByLabel("Término").fill("2026-08-03T12:00");
  await page.getByLabel("Fuso horário").fill("America/Sao_Paulo");
  await page.getByRole("button", { name: "Validar e agendar" }).click();
  await expect(page.getByText("SCHEDULED", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByText("CANCELLED", { exact: false })).toBeVisible();
});

test("wizard preserva estado, funciona no mobile e não possui violações Axe sérias", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "validação específica do editor móvel");
  await mockIdentity(page, admin);
  await page.route("**/api/admin/events", route => json(route, { events: [] }));
  await page.route("**/api/admin/assets?status=ACTIVE", route => json(route, { assets: [] }));
  await page.route("**/api/admin/events/suggest-content?*", route => json(route, { options: [], counts: { available: 0, reserved: 0, archived: 0 } }));
  await page.goto("/admin/eventos");
  await page.getByLabel("Título").fill("Evento acessível");
  await page.getByRole("button", { name: "Próximo" }).click();
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByLabel("Título")).toHaveValue("Evento acessível");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const results = await new AxeBuilder({ page }).include(".event-wizard").analyze();
  expect(results.violations.filter(item => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
});

test("Home exibe Evento somente quando existe agendamento ativo", async ({ page }) => {
  await mockIdentity(page, participant);
  let visible = false;
  await mockHomeDependencies(page, () => visible);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Semana da Fé" })).toHaveCount(0);
  visible = true;
  await page.reload();
  await expect(page.getByRole("heading", { name: "Semana da Fé" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Participar do evento/ })).toHaveAttribute("href", "/eventos/detalhes?id=event-e2e");
  await expect(page.locator(".platform-event-card")).toHaveCount(0);
});

test("participante conclui Evento uma vez e recebe resultado fixo", async ({ page }) => {
  await mockIdentity(page, participant);
  let outcome: "won" | "lost" | null = null;
  await installParticipantEventApi(page, () => outcome, value => { outcome = value; });

  await page.goto("/eventos");
  await expect(page.locator('[data-illustration="default-event"]')).toBeVisible();
  await page.getByRole("link", { name: "Ver detalhes" }).click();
  await expect(page.locator('[data-illustration="default-event"]')).toBeVisible();
  await page.getByRole("button", { name: "Jogar" }).click();
  await expect(page).toHaveURL(/wordle-biblico\/?\?event=selection-event&eventId=event-e2e/);
  await expect(page.getByText(/Dica: O Salvador/)).toBeVisible();
  await expect(page.locator(".participant-bottom-nav")).toHaveCount(0);
  for (const letter of "JESUS") await page.getByRole("button", { name: `Letra ${letter}` }).click();
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page.getByRole("heading", { name: "Você venceu!" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Jogar novamente" })).toHaveCount(0);
  await page.getByRole("link", { name: "Voltar ao evento" }).click();
  await expect(page.getByText(/Finalizado · Vitória/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Concluído" })).toBeDisabled();
});

test("abandono registra derrota e impede segunda tentativa", async ({ page }) => {
  await mockIdentity(page, participant);
  let outcome: "won" | "lost" | null = null;
  await installParticipantEventApi(page, () => outcome, value => { outcome = value; });
  await page.goto("/eventos/detalhes?id=event-e2e");
  await page.getByRole("button", { name: "Jogar" }).click();
  await expect(page.getByText(/Dica: O Salvador/)).toBeVisible();
  await page.getByRole("button", { name: "Voltar para a tela anterior" }).click();
  await expect(page.getByRole("dialog", { name: "Sair da partida?" })).toBeVisible();
  await page.getByRole("button", { name: "Sair da partida" }).click();
  await expect(page).toHaveURL(/\/eventos\/detalhes\/?\?id=event-e2e/);
  await expect(page.getByText(/Finalizado · Derrota/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Concluído" })).toBeDisabled();
});

test("Eventos permanece acessível e sem overflow impeditivo", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "validação específica da viewport móvel");
  await mockIdentity(page, participant);
  await installParticipantEventApi(page, () => null, () => undefined);
  for (const path of ["/eventos", "/eventos/detalhes?id=event-e2e"]) {
    await page.goto(path);
    await expect(page.locator(".event-shell")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    for (const control of await page.locator(".event-shell a, .event-shell button").all()) {
      const box = await control.boundingBox();
      if (box) expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(40);
    }
  }
});

async function installParticipantEventApi(page: Page, outcome: () => "won" | "lost" | null, finish: (value: "won" | "lost") => void) {
  await page.route("**/api/platform/events/action", async route => {
    const body = route.request().postDataJSON();
    const guess = String(body.input?.guess || "");
    return json(route, { evaluation: guess.split("").map((letter: string, index: number) => ({ letter, state: "JESUS"[index] === letter ? "correct" : "absent" })), correct: guess === "JESUS" });
  });
  await page.route("**/api/platform/events/event-e2e/selection?*", route => json(route, { game: {
    selectionId: "selection-event", participationId: "participation-event", gameType: "wordle-biblico", title: "Wordle do Evento",
    content: { id: "wordle-event", version: 1, wordLength: 5, hint: "O Salvador", biblicalReference: "Mateus 1:21" },
  } }));
  await page.route("**/api/platform/events/event-e2e/start", route => {
    if (outcome()) return json(route, { error: "event_participation_finished" }, 409);
    return json(route, { participation: { participationId: "participation-event", status: "STARTED" }, playHref: "/jogos/wordle-biblico?event=selection-event&eventId=event-e2e" });
  });
  await page.route("**/api/platform/events/event-e2e", route => json(route, { event: eventDetail(outcome()) }));
  await page.route("**/api/platform/events", route => json(route, { events: [{ id: "event-e2e", title: "Semana da Fé", description: "Jogos especiais da comunidade.", status: "ACTIVE", startsAt, endsAt }] }));
  await page.route("**/api/platform/games/finish", route => { finish("won"); return json(route, { recorded: true }); });
  await page.route("**/api/platform/games/abandon", route => { finish("lost"); return json(route, { abandoned: true }); });
}

function eventDetail(outcome: "won" | "lost" | null) {
  return {
    id: "event-e2e", title: "Semana da Fé", description: "Jogos especiais da comunidade.", status: "ACTIVE", startsAt, endsAt,
    rewards: { participationXp: 20, victoryCoins: 2 },
    games: [{ gameType: "wordle-biblico", title: "Wordle do Evento", selectionId: "selection-event", status: outcome ? "FINISHED" : "CREATED", outcome, playHref: "/jogos/wordle-biblico?event=selection-event&eventId=event-e2e" }],
  };
}
