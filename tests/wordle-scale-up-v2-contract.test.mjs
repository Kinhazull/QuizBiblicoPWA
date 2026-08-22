import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const files = await Promise.all([
  "official-base-content-v1.json",
  "wordle-expansion-v2.json",
  "wordle-scale-up-v2-lot-01.json",
  "wordle-scale-up-v2-remaining.json",
].map(async name => JSON.parse(await readFile(new URL(`../content/${name}`, import.meta.url), "utf8"))));

test("acervo Wordle versionado projeta 1.200 soluções sem duplicatas", () => {
  const entries = files.flatMap(pack => pack.contents).filter(item => item.gameType === "wordle-biblico");
  const words = entries.map(item => item.payload.word);
  assert.equal(entries.length, 1200);
  assert.equal(new Set(words).size, 1200);
  assert.equal(words.filter(word => word.length === 5).length, 400);
  assert.equal(words.filter(word => word.length === 6).length, 400);
  assert.equal(words.filter(word => word.length === 7).length, 400);
});

test("somente o lote restante aguarda revisão humana", () => {
  assert.equal(files[2].reviewStatus, "APPROVED_BY_PROJECT_OWNER");
  assert.equal(files[3].reviewStatus, "PENDING_HUMAN_REVIEW");
  assert.equal(files[3].contents.length, 877);
});
