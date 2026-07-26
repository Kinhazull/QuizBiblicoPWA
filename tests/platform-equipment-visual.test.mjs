import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(path, "utf8");

test("Home and Profile render the same equipped avatar component", () => {
  const home = read("app/PlatformHome.tsx");
  const profile = read("app/perfil/PlatformProfileOverview.tsx");
  const page = read("app/page.tsx");
  assert.match(home, /EquippedAvatar/);
  assert.match(profile, /EquippedAvatar/);
  assert.match(page, /\/api\/platform\/inventory/);
  assert.match(page, /platform-equipment-changed/);
});

test("equipped avatar supports the three official frame styles", () => {
  const component = read("app/EquippedAvatar.tsx");
  const css = read("app/platform-home.css");
  assert.match(component, /data-frame/);
  for (const frame of ["frame-bronze", "frame-silver", "frame-gold"]) {
    assert.ok(css.includes(`[data-frame="${frame}"]`), `estilo ausente: ${frame}`);
  }
});

test("Shop and Inventory update equipped state immediately", () => {
  const shop = read("app/loja/page.tsx");
  const inventory = read("app/inventario/page.tsx");
  for (const source of [shop, inventory]) {
    assert.match(source, /\/api\/platform\/inventory/);
    assert.match(source, /platform-equipment-changed/);
    assert.match(source, /Equipado/);
  }
  assert.match(shop, /item\.owned\s*\?\s*equip\(item\)\s*:\s*buy\(item\)/);
});

test("Shop and Inventory expose clear loading success and ownership states", () => {
  const shop = read("app/loja/page.tsx");
  const inventory = read("app/inventario/page.tsx");
  const css = read("app/loja/shop.module.css");
  for (const source of [shop, inventory]) {
    assert.match(source, /aria-live="polite"/);
    assert.match(source, /skeletonGrid/);
  }
  for (const state of ["Comprar", "Adquirido", "Equipar", "Equipado"]) assert.ok(shop.includes(state), `estado ausente: ${state}`);
  assert.match(shop, /Molduras/);
  assert.match(shop, /Avatares/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible/);
});
