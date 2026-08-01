import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Home is a platform hub with compact daily progress and no legacy game spotlight", async () => {
  const home = await read("app/PlatformHome.tsx");

  assert.match(home, /Desafios diários/);
  assert.match(home, /Array\.from\(\{ length: 7 \}/);
  assert.match(home, /3 desafios/);
  assert.match(home, /7 desafios/);
  assert.match(home, /href="\/desafios-diarios"/);
  assert.match(home, /href="\/jogos"/);
  assert.doesNotMatch(home, /Gemas|Continuar jogando|JourneyCard|Jornada/);
});

test("game catalog starts free play directly and the legacy setup route redirects", async () => {
  const [card, catalog, legacyRoute, loader] = await Promise.all([
    read("app/GameCard.tsx"),
    read("app/jogos/page.tsx"),
    read("app/jogos/modo-livre/page.tsx"),
    read("app/games/loader/gameLoader.ts"),
  ]);

  assert.match(card, /generateFreePlayGame/);
  assert.match(catalog, /gameCatalog\.map/);
  assert.match(catalog, /href="\/"/);
  assert.doesNotMatch(catalog, /router\.back|history\.back/);
  assert.doesNotMatch(catalog, /Gerar Partida|Modo Livre/);
  assert.match(legacyRoute, /redirect\("\/jogos"\)/);
  assert.match(loader, /\/api\/platform\/free-play\/generate/);
});

test("results and navigation respect mode capabilities", async () => {
  const [result, navigation, routes, quiz] = await Promise.all([
    read("app/games/sdk/GameResult.tsx"),
    read("app/LearningQuickNav.tsx"),
    read("app/games/sdk/gameModules.ts"),
    read("app/jogar/page.tsx"),
  ]);

  assert.match(result, /replayable !== false/);
  assert.match(result, /Voltar aos desafios/);
  assert.doesNotMatch(result, /Nova partida livre/);
  assert.match(navigation, /isGamePlayRoute\(path\)/);
  assert.match(routes, /pathname\.replace\(\/\\\/\+\$\/, ""\)/);
  assert.match(routes, /normalizedPath === "\/jogar"/);
  assert.match(quiz, /generateFreePlayGame\(GameType\.QUIZ\)/);
});

test("player Quiz paths cannot invoke the administrative legacy importer", async () => {
  const sources = await Promise.all([
    read("functions/_lib/platform-free-play.ts"),
    read("functions/_lib/platform-daily-objectives.ts"),
    read("functions/api/platform/free-play/generate.ts"),
    read("app/games/loader/providers.ts"),
  ]);
  for (const source of sources) {
    assert.doesNotMatch(source, /migrateLegacyQuizArchive|universal-content-importer/);
  }
});
