import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ContentStatus, validateContent } from "../../shared/content.ts";

const lot = JSON.parse(await readFile(new URL("../../content/wordle-scale-up-v2-lot-01.json", import.meta.url), "utf8"));
const official = JSON.parse(await readFile(new URL("../../content/official-base-content-v1.json", import.meta.url), "utf8"));
const expansion = JSON.parse(await readFile(new URL("../../content/wordle-expansion-v2.json", import.meta.url), "utf8"));

const normalize = value => String(value).normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
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
  internalNotes: "Content Scale-Up v2 — lote 01 pendente de revisão humana",
});

test("Wordle scale-up lote 01 registra a aprovação explícita do proprietário", () => {
  assert.equal(lot.version, 1);
  assert.equal(lot.reviewStatus, "APPROVED_BY_PROJECT_OWNER");
  assert.equal(lot.contents.length, 50);
  assert.equal(new Set(lot.contents.map(item => item.externalId)).size, 50);
  assert.deepEqual(Object.fromEntries(Object.entries(Object.groupBy(lot.contents, item => item.difficulty)).map(([key, values]) => [key, values.length])), {
    EASY: 10,
    MEDIUM: 25,
    HARD: 15,
  });
  assert.deepEqual(Object.fromEntries(Object.entries(Object.groupBy(lot.contents, item => item.tags[0])).map(([key, values]) => [key, values.length])), {
    "Antigo Testamento": 21,
    "Novo Testamento": 29,
  });
});

test("Wordle scale-up lote 01 passa pelo schema real como DRAFT", () => {
  const failures = lot.contents.flatMap(entry => {
    const result = validateContent(entry.gameType, metadata(entry), entry.payload);
    return result.valid ? [] : [{ id: entry.externalId, errors: result.errors }];
  });
  assert.deepEqual(failures, []);
});

test("Wordle scale-up lote 01 não duplica soluções existentes nem revela respostas", () => {
  const previous = new Set([...official.contents, ...expansion.contents]
    .filter(item => item.gameType === "wordle-biblico")
    .map(item => normalize(item.payload.word)));
  const answers = lot.contents.map(item => normalize(item.payload.word));
  assert.equal(new Set(answers).size, 50);
  assert.deepEqual(answers.filter(answer => previous.has(answer)), []);
  assert.ok(answers.every(answer => /^[A-Z]{5}$/u.test(answer)));
  for (const entry of lot.contents) {
    assert.ok(entry.biblicalReference.trim());
    assert.ok(entry.category.trim());
    assert.ok(entry.tags.includes("Lote 01"));
    assert.ok(!normalize(entry.payload.hint).split(/[^A-Z]+/u).includes(normalize(entry.payload.word)), entry.externalId);
  }
});

test("gerador e lote Wordle 01 permanecem byte a byte sincronizados", async () => {
  const { spawnSync } = await import("node:child_process");
  const before = await readFile(new URL("../../content/wordle-scale-up-v2-lot-01.json", import.meta.url), "utf8");
  const reviewBefore = await readFile(new URL("../../docs/PRODUCT/WORDLE_SCALE_UP_V2_LOT_01_REVIEW.md", import.meta.url), "utf8");
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../../scripts/generate-wordle-scale-up-v2-lot-01.mjs", import.meta.url))], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const after = await readFile(new URL("../../content/wordle-scale-up-v2-lot-01.json", import.meta.url), "utf8");
  const reviewAfter = await readFile(new URL("../../docs/PRODUCT/WORDLE_SCALE_UP_V2_LOT_01_REVIEW.md", import.meta.url), "utf8");
  assert.equal(after, before);
  assert.equal(reviewAfter, reviewBefore);
  assert.match(reviewAfter, /APPROVED_BY_PROJECT_OWNER/u);
});
