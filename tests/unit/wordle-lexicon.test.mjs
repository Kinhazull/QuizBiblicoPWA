import assert from "node:assert/strict";
import test from "node:test";
import { WORDLE_ACCEPTED_GUESSES } from "../../shared/wordle-accepted-guesses.ts";
import { WORDLE_PT_BR_WORD_COUNT, WORDLE_PT_BR_WORDS } from "../../shared/wordle-pt-br-lexicon.generated.ts";
import { isPublishedWordleGuess } from "../../functions/_lib/wordle-lexicon.ts";

test("Wordle PT-BR lexicon accepts normalized dictionary words and common flexions", () => {
  assert.ok(WORDLE_PT_BR_WORD_COUNT > 50_000);
  for (const word of ["CASAS", "AMORES", "JANELA", "JOSUE", "GRACA"]) {
    assert.equal(WORDLE_ACCEPTED_GUESSES.has(word), true, word);
  }
  assert.equal(WORDLE_PT_BR_WORDS.has("AEIOU"), false);
});

test("Wordle PT-BR generated entries obey the playable length and alphabet contract", () => {
  for (const word of WORDLE_PT_BR_WORDS) assert.match(word, /^[A-Z]{5,7}$/);
});

test("server accepts an open PT-BR guess without consulting CMS content", async () => {
  const env = { DB: { prepare() { throw new Error("unexpected_database_lookup"); } } };
  assert.equal(await isPublishedWordleGuess(env, "org-1", "janela"), true);
});
