import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v2 RC manifest is installable and platform branded", async () => {
  const manifest = JSON.parse(await read("public/manifest.webmanifest"));
  assert.match(manifest.name, /^Conte os Feitos/);
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.id, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "portrait-primary");
  assert.equal(manifest.lang, "pt-BR");
  assert.ok(manifest.categories.includes("education"));
  assert.ok(manifest.icons.some(icon => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some(icon => icon.sizes === "512x512" && icon.purpose === "maskable"));
});

test("service worker update and offline contracts stay safe", async () => {
  const [worker, status, offline] = await Promise.all([read("public/sw.js"), read("app/PwaStatus.tsx"), read("public/offline.html")]);
  assert.match(worker, /conte-os-feitos-v2-rc1/);
  assert.match(worker, /startsWith\('\/api\/'\)/);
  assert.match(worker, /request\.mode==='navigate'/);
  assert.match(status, /controllerchange/);
  assert.match(status, /SKIP_WAITING/);
  assert.match(offline, /Nenhuma recompensa é concedida sem confirmação do servidor/);
});

test("package metadata is the single visible RC version source", async () => {
  const packageMetadata = JSON.parse(await read("package.json"));
  const [source, profile] = await Promise.all([read("app/app-version.ts"), read("app/perfil/page.tsx")]);
  assert.equal(packageMetadata.version, "2.0.0-rc.1");
  assert.match(source, /packageMetadata\.version/);
  assert.match(profile, /APP_VERSION/);
});
