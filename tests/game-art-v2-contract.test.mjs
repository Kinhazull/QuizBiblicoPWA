import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const games = ["quiz", "wordle", "three-clues", "timeline", "memory", "association", "who-am-i"];

test("central game registry maps all seven official arts and preserves emoji fallback", async () => {
  const registry = await read("app/games/sdk/gameModules.ts");
  assert.equal((registry.match(/art: "\/games\//g) || []).length, 7);
  assert.equal((registry.match(/image: "/g) || []).length, 7);
  for (const game of games) assert.match(registry, new RegExp(`/games/${game}/runtime/cover-card\\.png`));
});

test("official game derivatives exist and are substantially lighter than masters", async () => {
  for (const game of games) {
    const [master, runtime] = await Promise.all([
      stat(new URL(`../public/games/${game}/cover-art.png`, import.meta.url)),
      stat(new URL(`../public/games/${game}/runtime/cover-card.png`, import.meta.url)),
    ]);
    assert.ok(runtime.size < master.size / 2, `${game} runtime derivative`);
  }
});

test("catalog, Home, Daily, Event and Profile consume shared GameArt", async () => {
  const sources = await Promise.all([
    "app/GameCard.tsx", "app/PlatformHome.tsx", "app/desafios-diarios/page.tsx", "app/eventos/detalhes/page.tsx", "app/perfil/PlatformProfileOverview.tsx",
  ].map(read));
  for (const source of sources) assert.match(source, /<GameArt/);
  const component = await read("app/GameArt.tsx");
  assert.match(component, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(component, /alt=""/);
  assert.match(component, /loading="lazy"/);
});

test("compact Event administration reuses registry metadata without forcing cover art", async () => {
  const source = await read("app/admin/eventos/EventWizard.tsx");
  assert.match(source, /gameModules\.map/);
  assert.match(source, /icon: game\.image/);
  assert.doesNotMatch(source, /const GAMES = \[/);
});
