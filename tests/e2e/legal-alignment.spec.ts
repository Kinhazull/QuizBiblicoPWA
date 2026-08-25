import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("registration exposes an unchecked required 18+ confirmation on desktop and mobile", async ({ page }) => {
  await page.route("**/api/auth/me", route => route.fulfill({ status: 401, json: { error: "unauthorized" } }));
  for (const viewport of [{ width: 1280, height: 800 }, { width: 360, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "Ainda não tenho conta" }).click();
    const adult = page.getByRole("checkbox", { name: "Declaro que tenho 18 anos ou mais." });
    await expect(adult).toBeVisible();
    await expect(adult).not.toBeChecked();
    await expect(page.getByRole("link", { name: "Termos de Uso" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Política de Privacidade" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => document.documentElement.clientWidth));
  }
});

test("existing account accepts the current legal version once", async ({ page }) => {
  let required = true;
  await page.route("**/api/auth/me", route => route.fulfill({ json: { user: { id: "existing", displayName: "Pessoa", role: "participant", legalAcceptanceRequired: required } } }));
  await page.route("**/api/auth/legal-acceptance", async route => { required = false; await route.fulfill({ json: { ok: true } }); });
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Confirme para continuar" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "CONFIRMAR E CONTINUAR" }).click();
  await expect(dialog.getByRole("alert")).toContainText("18 anos");
  await dialog.getByRole("checkbox", { name: "Declaro que tenho 18 anos ou mais." }).check();
  await dialog.getByRole("checkbox", { name: /Li e aceito/ }).check();
  await dialog.getByRole("button", { name: "CONFIRMAR E CONTINUAR" }).click();
  await expect(dialog).toBeHidden();
});

test("public account deletion instructions are accessible without authentication", async ({ page }) => {
  await page.route("**/api/auth/me", route => route.fulfill({ status: 401, json: { error: "unauthorized" } }));
  await page.goto("/privacidade/conta");
  await expect(page).toHaveURL(/\/privacidade\/conta\/?$/);
  await expect(page.getByRole("heading", { name: /Exclusão de conta/ })).toBeVisible();
  await expect(page.getByText("suporteconteosfeitos@gmail.com")).toBeVisible();
  const audit = await new AxeBuilder({ page }).include("main").analyze();
  expect(audit.violations.filter(item => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});
