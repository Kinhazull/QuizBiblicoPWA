import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("runtime brand signatures use the reusable official asset component", async () => {
  const [component, home, auth, admin, participant, game] = await Promise.all([
    "app/BrandLogo.tsx", "app/PlatformHome.tsx", "app/page.tsx", "app/AdminQuickNav.tsx", "app/ParticipantPageHeader.tsx", "app/jogar/page.tsx",
  ].map(read));
  assert.match(component, /logo-on-dark\.png/);
  assert.match(component, /logo-on-light\.png/);
  for (const source of [home, auth, admin, participant, game]) assert.match(source, /<BrandLogo/);
  for (const source of [home, auth, admin, participant]) {
    assert.doesNotMatch(source, /platform-brand-mark/);
    assert.doesNotMatch(source, /brand-dot[^\n]*CONTE OS FEITOS/);
  }
});

test("runtime derivatives are materially smaller than their masters", async () => {
  const files = path => stat(new URL(`../${path}`, import.meta.url));
  const [darkMaster, lightMaster, darkRuntime, lightRuntime] = await Promise.all([
    "public/brand/v2/logo-horizontal.png", "public/brand/v2/logo-horizontal-light.png", "public/brand/v2/runtime/logo-on-dark.png", "public/brand/v2/runtime/logo-on-light.png",
  ].map(files));
  assert.ok(darkRuntime.size < darkMaster.size / 4);
  assert.ok(lightRuntime.size < lightMaster.size / 4);
});

test("PWA metadata uses only Brand v2 derivatives", async () => {
  const [layout, worker, manifestText, generator] = await Promise.all([
    "app/layout.tsx", "public/sw.js", "public/manifest.webmanifest", "scripts/generate-pwa-icons.mjs",
  ].map(read));
  const manifest = JSON.parse(manifestText);
  assert.match(layout, /\/favicon\.png/);
  assert.match(layout, /\/icons\/icon-192\.png/);
  assert.doesNotMatch(layout, /app-icon/);
  assert.deepEqual(manifest.icons.map(icon => icon.src), ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png"]);
  assert.match(worker, /icon-maskable-512\.png/);
  assert.match(generator, /imageWidth: 320, imageHeight: 320, background: "#234e9a"/);
});
