import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Game SDK centralizes the module contract and registry", async () => {
  const [types, registry] = await Promise.all([
    read("app/games/sdk/types.ts"),
    read("app/games/sdk/gameModules.ts"),
  ]);
  assert.match(types, /GameModuleContract/);
  assert.match(types, /GamePlayStatus/);
  assert.match(registry, /gameCatalog\.map/);
  assert.match(registry, /getGameModule/);
});

test("Game SDK exposes shared layout, HUD and final states", async () => {
  const [layout, hud, result] = await Promise.all([
    read("app/games/sdk/GameLayout.tsx"),
    read("app/games/sdk/GameHud.tsx"),
    read("app/games/sdk/GameResult.tsx"),
  ]);
  assert.match(layout, /GameHud/);
  assert.match(layout, /GameResult/);
  assert.match(hud, /currentAttempt/);
  assert.match(result, /Jogar novamente/);
  assert.match(result, /Voltar para Home/);
});

test("Wordle consumes the shared Game SDK without changing its engine", async () => {
  const wordle = await read("app/games/wordle/WordleGame.tsx");
  assert.match(wordle, /GameLayout/);
  assert.match(wordle, /WORDLE_MAX_ATTEMPTS/);
  assert.doesNotMatch(wordle, /wordle-restart/);
});

