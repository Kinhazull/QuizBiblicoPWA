import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Home is a platform hub with compact daily progress and no legacy game spotlight", async () => {
  const home = await read("app/PlatformHome.tsx");

  assert.match(home, /Desafios diários/);
  assert.match(home, /Array\.from\(\{ length: 7 \}/);
  assert.match(home, /3 vitórias/);
  assert.match(home, /7 vitórias/);
  assert.match(home, /href="\/desafios-diarios"/);
  assert.match(home, /href="\/jogos"/);
  assert.doesNotMatch(home, /Gemas|Continuar jogando|JourneyCard|Jornada/);
});

test("game catalog starts free play directly and the legacy setup route redirects", async () => {
  const [card, catalog, legacyRoute, loader, backNavigation] = await Promise.all([
    read("app/GameCard.tsx"),
    read("app/jogos/page.tsx"),
    read("app/jogos/modo-livre/page.tsx"),
    read("app/games/loader/gameLoader.ts"),
    read("app/BackNavigation.tsx"),
  ]);

  assert.match(card, /generateFreePlayGame/);
  assert.match(catalog, /gameCatalog\.map/);
  assert.doesNotMatch(catalog, /games-home-link|href="\/"/);
  assert.doesNotMatch(catalog, /router\.back|history\.back/);
  assert.match(backNavigation, /pathname === "\/jogos"/);
  assert.match(backNavigation, /location\.assign\(destination\)/);
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

test("daily challenges never expose resume and Quiz timeout cannot become a choice", async () => {
  const [daily, quiz, validator] = await Promise.all([
    read("app/desafios-diarios/page.tsx"),
    read("app/jogar/page.tsx"),
    read("functions/_lib/platform-daily-objectives.ts"),
  ]);
  assert.doesNotMatch(daily, />Continuar</);
  assert.match(daily, /objective\.state === "AVAILABLE"/);
  assert.match(daily, /objective\.state === "LOST" \? "Encerrado"/);
  assert.doesNotMatch(daily, /Em andamento|Finalizando\.\.\./);
  assert.match(quiz, /choiceId: current\.choiceId \|\| null/);
  assert.match(quiz, /timedOut: current\.timedOut/);
  assert.match(validator, /input\.payload\.timedOut === true && !choiceId/);
});

test("participant surfaces use the platform chrome and Wordle validates its vocabulary", async () => {
  const [navigation, profile, notifications, wordle, lexicon] = await Promise.all([
    read("app/LearningQuickNav.tsx"),
    read("app/perfil/page.tsx"),
    read("app/notificacoes/page.tsx"),
    read("app/games/wordle/WordleGame.tsx"),
    read("functions/_lib/wordle-lexicon.ts"),
  ]);
  assert.match(navigation, /path === "\/perfil"/);
  assert.match(navigation, /path === "\/notificacoes"/);
  assert.doesNotMatch(profile, /profile-stats/);
  assert.doesNotMatch(notifications, /admin-shell/);
  assert.match(wordle, /invalid_wordle_word/);
  assert.match(lexicon, /status='PUBLISHED'/);
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
