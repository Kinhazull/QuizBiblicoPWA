import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ContentStatus, validateContent } from "../../shared/content.ts";

const remainingUrl = new URL("../../content/wordle-scale-up-v2-remaining.json", import.meta.url);
const reviewUrl = new URL("../../docs/PRODUCT/WORDLE_SCALE_UP_V2_REMAINING_REVIEW.md", import.meta.url);
const official = JSON.parse(await readFile(new URL("../../content/official-base-content-v1.json", import.meta.url), "utf8"));
const expansion = JSON.parse(await readFile(new URL("../../content/wordle-expansion-v2.json", import.meta.url), "utf8"));
const lot01 = JSON.parse(await readFile(new URL("../../content/wordle-scale-up-v2-lot-01.json", import.meta.url), "utf8"));
const remaining = JSON.parse(await readFile(remainingUrl, "utf8"));

const normalize = value => String(value).normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
const countBy = (items, key) => Object.fromEntries(
  Object.entries(Object.groupBy(items, key)).map(([name, values]) => [name, values.length]),
);
const metadata = entry => ({
  id: entry.externalId,
  gameType: entry.gameType,
  category: entry.category,
  tags: entry.tags,
  difficulty: entry.difficulty,
  biblicalReference: entry.biblicalReference,
  status: ContentStatus.DRAFT,
  authorId: "wordle-scale-up-editor",
  reviewerId: null,
  createdAt: 1,
  updatedAt: 1,
  version: 1,
  internalNotes: "Content Scale-Up v2 — lote único restante pendente de revisão humana",
});

test("lote único restante fecha exatamente as metas editoriais do Wordle", () => {
  assert.equal(remaining.reviewStatus, "PENDING_HUMAN_REVIEW");
  assert.equal(remaining.generationPolicy, "OWNER_AUTHORIZED_SINGLE_REVIEW_BATCH");
  assert.equal(remaining.contents.length, 877);
  assert.deepEqual(countBy(remaining.contents, item => String(item.payload.word.length)), {
    5: 180,
    6: 350,
    7: 347,
  });
  assert.deepEqual(countBy(remaining.contents, item => item.difficulty), {
    EASY: 240,
    MEDIUM: 406,
    HARD: 231,
  });
  assert.deepEqual(countBy(remaining.contents, item => item.tags[0]), {
    "Antigo Testamento": 438,
    "Novo Testamento": 439,
  });

  const all = [...official.contents, ...expansion.contents, ...lot01.contents, ...remaining.contents]
    .filter(item => item.gameType === "wordle-biblico");
  assert.equal(all.length, 1200);
  assert.deepEqual(countBy(all, item => String(item.payload.word.length)), { 5: 400, 6: 400, 7: 400 });
  assert.deepEqual(countBy(all, item => item.difficulty), { EASY: 360, MEDIUM: 540, HARD: 300 });
  assert.deepEqual(countBy(all, item => item.tags[0]), {
    "Antigo Testamento": 660,
    "Novo Testamento": 540,
  });
});

test("lote restante é único, rastreável e não revela respostas nas dicas", () => {
  const previous = new Set([...official.contents, ...expansion.contents, ...lot01.contents]
    .filter(item => item.gameType === "wordle-biblico")
    .map(item => normalize(item.payload.word)));
  const answers = remaining.contents.map(item => normalize(item.payload.word));
  assert.equal(new Set(answers).size, 877);
  assert.deepEqual(answers.filter(answer => previous.has(answer)), []);

  for (const entry of remaining.contents) {
    assert.match(entry.payload.word, /^[A-Z]{5,7}$/u, entry.externalId);
    assert.ok(entry.biblicalReference.trim(), entry.externalId);
    assert.ok(entry.category.trim(), entry.externalId);
    assert.ok(entry.tags.includes("Lote único restante"), entry.externalId);
    assert.equal(entry.editorialProvenance.corpus, "Quiz.csv", entry.externalId);
    assert.ok(entry.payload.hint.length <= 240, entry.externalId);
    assert.ok(
      !normalize(entry.payload.hint).split(/[^A-Z]+/u).includes(normalize(entry.payload.word)),
      entry.externalId,
    );
  }
});

test("todos os 877 candidatos passam pelo schema real somente como DRAFT", () => {
  const failures = remaining.contents.flatMap(entry => {
    const result = validateContent(entry.gameType, metadata(entry), entry.payload);
    return result.valid ? [] : [{ id: entry.externalId, errors: result.errors }];
  });
  assert.deepEqual(failures, []);
});

test("gerador do lote restante é determinístico", async () => {
  const before = await readFile(remainingUrl, "utf8");
  const reviewBefore = await readFile(reviewUrl, "utf8");
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(
    "../../scripts/generate-wordle-scale-up-v2-remaining.mjs",
    import.meta.url,
  ))], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(remainingUrl, "utf8"), before);
  assert.equal(await readFile(reviewUrl, "utf8"), reviewBefore);
  assert.match(reviewBefore, /877 candidatos/u);
  assert.match(reviewBefore, /HUMAN_APPROVED \/ IMPORTED \/ PUBLISHED/u);
});
