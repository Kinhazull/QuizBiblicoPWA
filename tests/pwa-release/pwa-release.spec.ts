import { createServer, type Server } from "node:http";
import { expect, test } from "@playwright/test";

async function installPlatformWorker(page: import("@playwright/test").Page) {
  const result = await page.evaluate(async () => {
    try {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("service_worker_registration_timeout")), 5_000));
      const registration = await Promise.race([navigator.serviceWorker.register("/sw.js"), timeout]);
      await Promise.race([navigator.serviceWorker.ready, timeout]);
      return { ok: true, scope: registration.scope };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "service_worker_registration_failed" };
    }
  });
  expect(result, JSON.stringify(result)).toMatchObject({ ok: true });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
}

test("production-like artifact installs and controls the platform", async ({ page, request }) => {
  const workerResponse = await request.get("/sw.js");
  expect(workerResponse.status()).toBe(200);
  expect(workerResponse.headers()["content-type"]).toMatch(/javascript/);
  for (const shell of ["/manifest.webmanifest", "/app-icon.svg", "/offline"]) {
    const response = await request.get(shell);
    expect(response.status(), shell).toBe(200);
  }
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.status()).toBe(200);
  expect(manifestResponse.headers()["content-type"]).toContain("application/manifest+json");
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    name: expect.stringMatching(/^Conte os Feitos/), short_name: "Conte os Feitos",
    start_url: "/", scope: "/", display: "standalone",
    theme_color: "#234e9a", background_color: "#07172a",
  });
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: "192x192", purpose: "any" }),
    expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
  ]));
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok(), icon.src).toBeTruthy();
    expect(response.headers()["content-type"]).toContain(icon.type);
  }

  await page.goto("/");
  await installPlatformWorker(page);
  expect(await page.evaluate(async () => (await caches.keys()).includes("conte-os-feitos-v2-rc1"))).toBe(true);
});

test("real service worker never stores API or authenticated navigation responses", async ({ page }) => {
  await page.goto("/");
  await installPlatformWorker(page);
  await page.evaluate(async () => { await fetch("/api/auth/me", { cache: "no-store" }).catch(() => undefined); });
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const key of await caches.keys()) {
      for (const request of await (await caches.open(key)).keys()) urls.push(new URL(request.url).pathname);
    }
    return urls;
  });
  expect(cached.some(path => path.startsWith("/api/") || ["/", "/perfil", "/admin"].includes(path))).toBe(false);
  expect(cached).toEqual(expect.arrayContaining(["/manifest.webmanifest", "/app-icon.svg", "/offline"]));
});

test("offline contract serves only the public fallback and recovers online", async ({ page, context }) => {
  await page.goto("/");
  await installPlatformWorker(page);
  await context.setOffline(true);
  await page.goto("/jogos");
  await expect(page.getByRole("heading", { name: /Sem conexão/i })).toBeVisible();
  await context.setOffline(false);
  await page.goto("/");
  await expect(page.locator("body")).not.toContainText(/Sem conexão.*Tente novamente quando estiver online/i);
});

test("browser updates from service worker A to B without a stale loop", async ({ browser }) => {
  let version = "A";
  const server: Server = createServer((request, response) => {
    if (request.url === "/sw.js") {
      response.writeHead(200, { "content-type": "text/javascript", "cache-control": "no-store" });
      response.end(`const V=${JSON.stringify(version)};self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',()=>{});self.addEventListener('message',e=>e.source?.postMessage({version:V}));`);
      return;
    }
    response.writeHead(200, { "content-type": "text/html", "cache-control": "no-store" });
    response.end(`<script>navigator.serviceWorker.register('/sw.js');</script><main>fixture</main>`);
  });
  await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("fixture_server_unavailable");
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  try {
    await page.goto(`http://127.0.0.1:${address.port}/`);
    const initial = await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.scriptURL);
    expect(initial).toContain("/sw.js");
    const readVersion = () => page.evaluate(() => new Promise<string>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("service_worker_version_timeout")), 3_000);
      navigator.serviceWorker.addEventListener("message", event => {
        window.clearTimeout(timeout);
        resolve(event.data?.version);
      }, { once: true });
      navigator.serviceWorker.controller?.postMessage("VERSION");
    }));
    await page.reload();
    await expect.poll(readVersion).toBe("A");
    version = "B";
    await page.evaluate(async () => { const registration = await navigator.serviceWorker.ready; await registration.update(); });
    await expect.poll(readVersion).toBe("B");
    const registrations = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
    expect(registrations).toBe(1);
    await page.reload();
    await expect(page.locator("main")).toHaveText("fixture");
  } finally {
    await context.close();
    await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
  }
});
