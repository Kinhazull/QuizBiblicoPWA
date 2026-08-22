import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ContentStatus, validateContent } from "../../shared/content.ts";

const expansion = JSON.parse(await readFile(
  new URL("../../content/wordle-expansion-v2.json", import.meta.url),
  "utf8",
));
const official = JSON.parse(await readFile(
  new URL("../../content/official-base-content-v1.json", import.meta.url),
  "utf8",
));

const normalize = value => String(value).normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
const metadata = entry => ({
  id: entry.externalId,
  gameType: entry.gameType,
  category: entry.category,
  tags: entry.tags,
  difficulty: entry.difficulty,
  biblicalReference: entry.biblicalReference,
  status: ContentStatus.PUBLISHED,
  authorId: "wordle-expansion-editor",
  reviewerId: "wordle-expansion-reviewer",
  createdAt: 1,
  updatedAt: 1,
  version: 1,
  internalNotes: "Expansão Wordle v2",
});

test("Wordle expansion v2 has stable identities and the approved length distribution", () => {
  assert.equal(expansion.version, 2);
  assert.equal(expansion.reviewStatus, "APPROVED_BY_PROJECT_OWNER");
  assert.equal(expansion.contents.length, 153);
  assert.equal(new Set(expansion.contents.map(entry => entry.externalId)).size, 153);
  assert.deepEqual(Object.fromEntries([5, 6, 7].map(length => [
    length,
    expansion.contents.filter(entry => entry.payload.word.length === length).length,
  ])), { 5: 50, 6: 50, 7: 53 });
});

test("every Wordle expansion item passes the real editorial and game schema", () => {
  const failures = expansion.contents.flatMap(entry => {
    const result = validateContent(entry.gameType, metadata(entry), entry.payload);
    return result.valid ? [] : [{ id: entry.externalId, errors: result.errors }];
  });
  assert.deepEqual(failures, []);
});

test("Wordle expansion answers are playable, unique and do not duplicate the official base", () => {
  const answers = expansion.contents.map(entry => entry.payload.word);
  const officialAnswers = new Set(official.contents
    .filter(entry => entry.gameType === "wordle-biblico")
    .map(entry => entry.payload.word));

  assert.equal(new Set(answers).size, answers.length);
  assert.ok(answers.every(answer => /^[A-Z]{5,7}$/.test(answer)));
  assert.deepEqual(answers.filter(answer => officialAnswers.has(answer)), []);
});

test("Wordle expansion metadata is complete and clues do not reveal answers", () => {
  for (const entry of expansion.contents) {
    assert.equal(entry.gameType, "wordle-biblico");
    assert.ok(entry.category.trim(), entry.externalId);
    assert.ok(entry.biblicalReference.trim(), entry.externalId);
    assert.ok(entry.tags.includes("Expansão Wordle v2"), entry.externalId);
    assert.ok(["EASY", "MEDIUM", "HARD"].includes(entry.difficulty), entry.externalId);
    assert.ok(entry.payload.hint.length <= 240, entry.externalId);
    assert.ok(!normalize(entry.payload.hint).split(/[^A-Z]+/).includes(entry.payload.word), entry.externalId);
  }
});
