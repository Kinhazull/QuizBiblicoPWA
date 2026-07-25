import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Tela Jogos usa um catálogo central sem jogos escritos diretamente no componente", async () => {
  const [catalog, page, card, navigation] = await Promise.all([
    read("app/data/gameCatalog.ts"),
    read("app/jogos/page.tsx"),
    read("app/GameCard.tsx"),
    read("app/navigation.tsx"),
  ]);

  assert.match(catalog, /gameModules as gameCatalog/);
  assert.match(catalog, /GameModuleStatus as GameStatus/);
  assert.doesNotMatch(page, /Quiz Bíblico|Wordle Bíblico|Jogo das 3 Pistas/);
  assert.match(page, /gameCatalog\.map/);
  assert.match(card, /Disponível/);
  assert.match(card, /Em desenvolvimento/);
  assert.match(card, /game\.primaryButton/);
  assert.match(navigation, /label: "Jogos", href: "\/jogos"/);
});
