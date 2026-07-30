import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Game SDK centralizes the module contract and registry", async () => {
  const [types, registry, catalog] = await Promise.all([
    read("app/games/sdk/types.ts"),
    read("app/games/sdk/gameModules.ts"),
    read("app/data/gameCatalog.ts"),
  ]);
  assert.match(types, /GameModuleContract/);
  assert.match(types, /GamePlayStatus/);
  assert.match(registry, /gameModules: readonly GameModuleContract\[\]/);
  assert.match(registry, /getGameModule/);
  assert.match(catalog, /gameModules as gameCatalog/);
});

test("Game SDK exposes shared layout, HUD and final states", async () => {
  const [layout, hud, result, memory] = await Promise.all([
    read("app/games/sdk/GameLayout.tsx"),
    read("app/games/sdk/GameHud.tsx"),
    read("app/games/sdk/GameResult.tsx"),
    read("app/games/memory/MemoryGame.tsx"),
  ]);
  assert.match(layout, /GameHud/);
  assert.match(layout, /GameResult/);
  assert.match(hud, /currentAttempt/);
  assert.match(hud, /progressLabel = "Tentativa"/);
  assert.match(layout, /progressLabel=\{progressLabel\}/);
  assert.match(memory, /progressLabel="Pares encontrados"/);
  assert.match(result, /Jogar novamente/);
  assert.match(result, /Voltar aos Jogos/);
  assert.doesNotMatch(result, /Nova partida livre/);
});

test("Wordle consumes the shared Game SDK without changing its engine", async () => {
  const wordle = await read("app/games/wordle/WordleGame.tsx");
  assert.match(wordle, /GameLayout/);
  assert.match(wordle, /WORDLE_MAX_ATTEMPTS/);
  assert.doesNotMatch(wordle, /wordle-restart/);
});

test("all seven games inherit the centralized safe-exit contract", async () => {
  const sdkGames = [
    "wordle/WordleGame.tsx",
    "three-clues/ThreeCluesGame.tsx",
    "timeline/TimelineGame.tsx",
    "memory/MemoryGame.tsx",
    "theme-association/ThemeAssociationGame.tsx",
    "who-am-i/WhoAmIGame.tsx",
  ];
  for (const file of sdkGames) {
    assert.match(await read(`app/games/${file}`), /GameLayout/);
  }
  const [layout, quiz, navigation] = await Promise.all([
    read("app/games/sdk/GameLayout.tsx"),
    read("app/jogar/page.tsx"),
    read("app/BackNavigation.tsx"),
  ]);
  assert.match(layout, /useRegisterActiveGame/);
  assert.match(quiz, /useRegisterActiveGame/);
  assert.match(navigation, /exitActiveGame/);
  assert.doesNotMatch(navigation, /router\.back|history\.back/);
});
