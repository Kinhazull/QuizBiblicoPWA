import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Wordle 2.0 supports variable length, accent normalization and position selection", async () => {
  const [engine, schema, game, css] = await Promise.all([
    read("app/games/wordle/engine.ts"),
    read("shared/content/schemas/wordle.ts"),
    read("app/games/wordle/WordleGame.tsx"),
    read("app/wordle.css"),
  ]);
  assert.match(engine, /WORDLE_MIN_LENGTH = 5/);
  assert.match(engine, /WORDLE_MAX_LENGTH = 7/);
  assert.match(engine, /normalize\("NFD"\)/);
  assert.match(schema, /minimum: 5, maximum: 7/);
  assert.match(game, /onClick=\{\(\) => setSelectedCell\(letterIndex\)\}/);
  assert.match(game, /ArrowLeft/);
  assert.match(game, /ArrowRight/);
  assert.match(css, /repeat\(var\(--word-length,5\)/);
  assert.match(css, /wordle-cell\.selected/);
});

test("Wordle validation combines a reviewed bundled lexicon with published CMS answers", async () => {
  const [lexicon, words, ptBr, notices] = await Promise.all([
    read("functions/_lib/wordle-lexicon.ts"),
    read("shared/wordle-accepted-guesses.ts"),
    read("shared/wordle-pt-br-lexicon.generated.ts"),
    read("docs/THIRD_PARTY_NOTICES.md"),
  ]);
  assert.match(lexicon, /isBundledWordleGuess/);
  assert.match(lexicon, /content_items/);
  assert.match(lexicon, /status='PUBLISHED'/);
  assert.match(words, /GENERAL_PORTUGUESE_WORDS/);
  assert.match(words, /BIBLICAL_WORDS/);
  assert.match(words, /WORDLE_PT_BR_WORDS/);
  assert.match(words, /\^\[A-Z\]\{5,7\}\$/);
  assert.match(ptBr, /WORDLE_PT_BR_WORD_COUNT/);
  assert.match(ptBr, /LibreOffice dictionaries pt_BR/);
  assert.match(notices, /LGPL versão 3/);
});
