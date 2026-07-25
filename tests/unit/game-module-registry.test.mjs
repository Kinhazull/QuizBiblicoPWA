import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { gameCatalog, getGameBySlug } from "../../app/data/gameCatalog.ts";
import { gameModules } from "../../app/games/sdk/gameModules.ts";

test("catalog discovers every registered module automatically", () => {
  assert.equal(gameCatalog, gameModules);
  assert.deepEqual(gameCatalog.map(game => game.id), gameModules.map(game => game.id));
  assert.ok(gameCatalog.some(game => game.id === "linha-do-tempo-biblica" && game.status === "available"));
  assert.ok(gameCatalog.some(game => game.id === "memoria-biblica" && game.status === "available"));
});

test("registered modules expose complete, unique and coherent metadata", () => {
  assert.equal(new Set(gameModules.map(game => game.id)).size, gameModules.length);
  assert.equal(new Set(gameModules.map(game => game.slug)).size, gameModules.length);
  assert.equal(new Set(gameModules.map(game => game.route)).size, gameModules.length);

  for (const game of gameModules) {
    assert.ok(game.id && game.slug && game.name);
    assert.ok(game.shortDescription && game.description && game.objective);
    assert.ok(game.mechanics.length > 0);
    assert.ok(["available", "development"].includes(game.status));
    assert.equal(game.primaryButton, game.status === "available" ? "Jogar" : "Ver detalhes");
    assert.equal(getGameBySlug(game.slug), game);
  }
});

test("every available module points to a real application page", () => {
  const appRoot = fileURLToPath(new URL("../../app/", import.meta.url));
  for (const game of gameModules.filter(item => item.status === "available")) {
    const routePath = game.route.replace(/^\//, "");
    assert.equal(existsSync(`${appRoot}${routePath}/page.tsx`), true, `${game.id} must point to an existing page`);
  }
});
