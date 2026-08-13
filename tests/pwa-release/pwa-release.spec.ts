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
  for (const shell of ["/manifest.webmanifest", "/favicon.png", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png", "/offline"]) {
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
  expect(await page.evaluate(async () => (await caches.keys()).includes("conte-os-feitos-v2-brand-v2"))).toBe(true);
});

test("maskable Brand v2 icon has an opaque canvas and protected central artwork", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const image = new Image();
    image.src = "/icons/icon-maskable-512.png";
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("canvas_context_unavailable");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, 512, 512).data;
    const background = [...pixels.slice(0, 3)];
    let minX = 512, minY = 512, maxX = -1, maxY = -1, transparent = 0;
    for (let y = 0; y < 512; y += 1) for (let x = 0; x < 512; x += 1) {
      const offset = (y * 512 + x) * 4;
      if (pixels[offset + 3] !== 255) transparent += 1;
      if (Math.abs(pixels[offset] - background[0]) + Math.abs(pixels[offset + 1] - background[1]) + Math.abs(pixels[offset + 2] - background[2]) > 24) {
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
    return { transparent, minX, minY, maxX, maxY };
  });
  expect(result.transparent).toBe(0);
  expect(result.minX).toBeGreaterThanOrEqual(90);
  expect(result.minY).toBeGreaterThanOrEqual(90);
  expect(result.maxX).toBeLessThanOrEqual(421);
  expect(result.maxY).toBeLessThanOrEqual(421);
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
  expect(cached).toEqual(expect.arrayContaining(["/manifest.webmanifest", "/favicon.png", "/icons/icon-maskable-512.png", "/offline"]));
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
