import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("3 Pistas uses only the shared Game SDK shell", async () => {
  const [game, page] = await Promise.all([
    read("app/games/three-clues/ThreeCluesGame.tsx"),
    read("app/jogos/jogo-das-3-pistas/page.tsx"),
  ]);
  assert.match(game, /GameLayout/);
  assert.match(game, /scoreForCluesUsed/);
  assert.match(game, /revealNextClue/);
  assert.match(game, /submitAnswer/);
  assert.match(game, /\/api\/platform\/games\/three-clues/);
  assert.match(game, /contentId/);
  assert.match(game, /contentVersion/);
  assert.match(page, /ThreeCluesGame/);
  assert.doesNotMatch(game, /THREE_CLUES_QUESTIONS|questions/);
});

