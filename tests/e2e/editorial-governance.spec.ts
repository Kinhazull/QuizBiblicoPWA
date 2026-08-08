import { expect, test, type Page, type Route } from "@playwright/test";

const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
const now = Date.now();
const content = (status = "DRAFT", version = 1) => ({
  id: "content-e2e", organizationId: "org-e2e", gameType: "wordle-biblico", status,
  category: "Palavras bíblicas", difficulty: "EASY", biblicalReference: "João 1:1", tags: ["palavra"],
  payload: { word: "GRACA", hint: "Favor imerecido de Deus" }, reference: null,
  templateId: null, version, authorId: "admin", reviewerId: null, createdAt: now, updatedAt: now,
  internalNotes: null,
});

async function identity(page: Page) {
  await page.route("**/api/auth/me", route => json(route, { user: { id: "admin", displayName: "Admin", role: "admin", permissions: [] } }));
}

test("editor exibe governança, histórico, comentário e submissão para revisão", async ({ page }) => {
  await identity(page);
  let current = content();
  await page.route("**/api/admin/content/content-e2e/versions", route => json(route, { versions: [{ version: 1, metadataJson: JSON.stringify(current), payloadJson: JSON.stringify(current.payload), changedBy: "admin", changeSummary: "Conteúdo criado", createdAt: now }] }));
  await page.route("**/api/admin/content/content-e2e/comments", route => route.request().method() === "POST"
    ? json(route, { ok: true }, 201)
    : json(route, { comments: [{ id: "comment-1", contentVersion: 1, authorId: "reviewer", body: "Referência conferida.", createdAt: now }] }));
  await page.route("**/api/admin/content/content-e2e/submit-review", route => { current = content("IN_REVIEW", 2); return json(route, { content: current }); });
  await page.route("**/api/admin/content/content-e2e", route => json(route, { content: current }));

  await page.goto("/admin/conteudo/editor?id=content-e2e");
  await expect(page.getByRole("heading", { name: "Histórico comparável" })).toBeVisible();
  await expect(page.getByText("Referência conferida.")).toBeVisible();
  await page.getByLabel("Novo comentário").fill("Aprovado editorialmente.");
  await page.getByRole("button", { name: "Adicionar comentário" }).click();
  await expect(page.getByText("Comentário editorial registrado.")).toBeVisible();
  await page.getByRole("button", { name: /Enviar para revis/ }).click();
  await expect(page.getByRole("button", { name: "Aprovar e publicar" })).toBeVisible();
});

test("Asset Registry registra raster auditável e permanece responsivo", async ({ page }) => {
  await identity(page);
  const assets: unknown[] = [];
  await page.route("**/api/admin/assets", route => {
    if (route.request().method() === "POST") { assets.push({ id: "asset-e2e", ...route.request().postDataJSON(), source_url: "https://cdn.example.com/banner.webp", alt_text: "Céu azul sobre uma Bíblia", mime_type: "image/webp" }); return json(route, { asset: { id: "asset-e2e" } }, 201); }
    return json(route, { assets });
  });
  await page.goto("/admin/conteudo/assets");
  await page.getByLabel("Titulo").fill("Banner do Evento");
  await page.getByLabel("Texto alternativo").fill("Céu azul sobre uma Bíblia");
  await page.getByLabel("URL HTTPS").fill("https://cdn.example.com/banner.webp");
  await page.getByLabel("Largura").fill("1200");
  await page.getByLabel("Altura").fill("630");
  await page.getByLabel("Origem").fill("Equipe editorial");
  await page.getByLabel("Licenca").fill("Uso próprio");
  await page.getByLabel("Status").selectOption("ACTIVE");
  await page.getByRole("button", { name: "Registrar asset" }).click();
  await expect(page.getByRole("status")).toContainText("Asset registrado");
  expect(await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
});
