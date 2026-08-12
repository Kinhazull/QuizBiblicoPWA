import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const viewport of [{ width: 1280, height: 800 }, { width: 360, height: 800 }]) {
  test(`enrollment MFA administrativo é acessível em ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/auth/me", route => route.fulfill({ json: { authenticated:true,user:{id:"admin",displayName:"Admin",role:"admin",mfaStatus:"disabled",mfaVerified:false,mfaEnrollmentRequired:true} } }));
    await page.route("**/api/notifications", route => route.fulfill({ json:{unread:0} }));
    await page.route("**/api/auth/mfa/setup", route => route.fulfill({ json:{secret:"JBSWY3DPEHPK3PXP",otpauthUri:"otpauth://totp/Conte"} }));
    await page.goto("/configurar-mfa");
    await expect(page.getByRole("heading",{name:"Verificação em duas etapas"})).toBeVisible();
    await page.getByRole("button",{name:"CONFIGURAR AUTENTICADOR"}).click();
    await expect(page.getByText("JBSWY3DPEHPK3PXP")).toBeVisible();
    await expect(page.getByLabel("Código de 6 dígitos")).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
    const audit=await new AxeBuilder({page}).include("main").analyze();
    expect(audit.violations.filter(item=>["critical","serious"].includes(item.impact||""))).toEqual([]);
  });
}
