import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = async path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("seven games have an explicit identity, scoring, difficulty and repetition contract", async () => {
  const [identity, scoring, quality] = await Promise.all([
    read("docs/GAME_IDENTITY_MATRIX.md"),
    read("docs/GAME_SCORING_AND_DIFFICULTY.md"),
    read("docs/GAME_CONTENT_QUALITY_REVIEW.md"),
  ]);
  for (const name of ["Quiz", "Wordle", "Linha do Tempo", "Memória", "Associação", "Quem Sou Eu?", "Três Pistas"]) {
    assert.match(identity, new RegExp(name.replace(/[?]/g, "\\?"), "i"));
    assert.match(scoring, new RegExp(name.replace(/[?]/g, "\\?"), "i"));
  }
  assert.match(scoring, /últimos 20 conteúdos/);
  assert.match(quality, /Total: 380 conteúdos/);
});

test("Game SDK exposes semantic instruction and feedback patterns", async () => {
  const [instruction, feedback, css, exports] = await Promise.all([
    read("app/games/sdk/GameInstruction.tsx"),
    read("app/games/sdk/GameFeedback.tsx"),
    read("app/game-sdk.css"),
    read("app/games/sdk/index.ts"),
  ]);
  assert.match(instruction, /aria-label/);
  assert.match(feedback, /aria-live/);
  assert.match(feedback, /success.*error.*info.*warning/s);
  assert.match(css, /game-sdk-instruction/);
  assert.match(exports, /GameInstruction/);
  assert.match(exports, /GameFeedback/);
});

test("game-specific UX remains distinct and accessible", async () => {
  const [who, clues, wordle, timeline, memory, association, quiz] = await Promise.all([
    read("app/games/who-am-i/WhoAmIGame.tsx"),
    read("app/games/three-clues/ThreeCluesGame.tsx"),
    read("app/games/wordle/WordleGame.tsx"),
    read("app/games/timeline/TimelineGame.tsx"),
    read("app/games/memory/MemoryGame.tsx"),
    read("app/games/theme-association/ThemeAssociationGame.tsx"),
    read("app/jogar/page.tsx"),
  ]);
  assert.match(who, /Pontuação máxima desta identidade/);
  assert.match(who, /reduz a pontuação máxima/);
  assert.match(clues, /lugares, objetos, acontecimentos, livros, conceitos ou personagens/i);
  assert.match(wordle, /Cinza: não pertence à palavra/);
  assert.match(timeline, /ordem narrativa apresentada na Bíblia/);
  assert.match(memory, /assetUrl/);
  assert.match(memory, /claimMemoryCard/);
  assert.match(memory, /historyRef\.current = previousHistory/);
  assert.match(memory, /movesRef\.current = previousMoves/);
  assert.match(association, /Escolha um elemento de cada coluna/);
  assert.match(quiz, /Tempo encerrado — 0 pontos/);
  assert.doesNotMatch(quiz, /loadingRound \? [\s\S]{0,200}Nenhuma partida/);
});
