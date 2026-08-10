import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ContentStatus, validateContent } from "../../shared/content.ts";

const pack = JSON.parse(await readFile(new URL("../../content/official-base-content-v1.json", import.meta.url), "utf8"));
const expected = {
  "wordle-biblico": 120,
  "linha-do-tempo-biblica": 40,
  "memoria-biblica": 40,
  "associacao-de-temas": 60,
  "quem-sou-eu": 60,
  "jogo-tres-pistas": 60,
};

const metadata = entry => ({
  id: entry.externalId,
  gameType: entry.gameType,
  category: entry.category,
  tags: entry.tags,
  difficulty: entry.difficulty,
  biblicalReference: entry.biblicalReference,
  status: ContentStatus.PUBLISHED,
  authorId: "official-editor",
  reviewerId: "official-reviewer",
  createdAt: 1,
  updatedAt: 1,
  version: 1,
  internalNotes: "Acervo Oficial v1",
});

test("official base v1 has the approved volume and globally stable identities", () => {
  assert.equal(pack.contents.length, 380);
  assert.equal(new Set(pack.contents.map(entry => entry.externalId)).size, 380);
  for (const [gameType, count] of Object.entries(expected)) {
    assert.equal(pack.contents.filter(entry => entry.gameType === gameType).length, count, gameType);
  }
});

test("every official content item passes the real editorial and game schema", () => {
  const failures = pack.contents.flatMap(entry => {
    const result = validateContent(entry.gameType, metadata(entry), entry.payload);
    return result.valid ? [] : [{ id: entry.externalId, errors: result.errors }];
  });
  assert.deepEqual(failures, []);
});

test("official base has references, three difficulties and no internal duplicate payload", () => {
  assert.ok(pack.contents.every(entry => typeof entry.biblicalReference === "string" && entry.biblicalReference.trim()));
  assert.deepEqual(new Set(pack.contents.map(entry => entry.difficulty)), new Set(["EASY", "MEDIUM", "HARD"]));
  for (const gameType of Object.keys(expected)) {
    const entries = pack.contents.filter(entry => entry.gameType === gameType);
    const identities = entries.map(entry => JSON.stringify(entry.payload));
    assert.equal(new Set(identities).size, entries.length, gameType);
  }
});

test("all Wordle answers are unique five-letter words without accents, spaces or punctuation", () => {
  const entries = pack.contents.filter(entry => entry.gameType === "wordle-biblico");
  const words = entries.map(entry => entry.payload.word);
  assert.equal(new Set(words).size, 120);
  assert.ok(words.every(word => /^[A-Z]{5}$/.test(word)));
  const normalized = value => value.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  assert.ok(entries.every(entry => !normalized(entry.payload.hint).split(/[^A-Z]+/).includes(entry.payload.word)));
  assert.ok(entries.every(entry => !/complete a palavra omitida|tradução acf|[“”]/i.test(entry.payload.hint)));
});

test("Wordle keeps the approved difficulty distribution after editorial replacements", () => {
  const entries = pack.contents.filter(entry => entry.gameType === "wordle-biblico");
  assert.deepEqual(Object.fromEntries(["EASY", "MEDIUM", "HARD"].map(difficulty => [
    difficulty,
    entries.filter(entry => entry.difficulty === difficulty).length,
  ])), { EASY: 48, MEDIUM: 48, HARD: 24 });
});

test("identity clues never contain their normalized answer", () => {
  const normalized = value => String(value).normalize("NFD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  for (const entry of pack.contents.filter(entry => ["quem-sou-eu", "jogo-tres-pistas"].includes(entry.gameType))) {
    for (const challenge of entry.payload.challenges) {
      const clues = challenge.hints ?? challenge.clues;
      const answer = normalized(challenge.answer);
      assert.ok(clues.every(clue => {
        const clueText = normalized(clue);
        return answer.includes(" ") ? !clueText.includes(answer) : !clueText.split(" ").includes(answer);
      }), `${entry.externalId}: ${challenge.answer}`);
    }
  }
});

test("potentially disputed timelines explicitly identify narrative order", () => {
  const timelines = pack.contents.filter(entry => entry.gameType === "linha-do-tempo-biblica");
  assert.ok(timelines.every(entry => /ordem narrativa/i.test(entry.payload.title)));
});

test("official package includes non-character editorial categories", () => {
  const diversifiedGames = ["memoria-biblica", "associacao-de-temas", "jogo-tres-pistas"];
  for (const gameType of diversifiedGames) {
    const entries = pack.contents.filter(entry => entry.gameType === gameType);
    const categories = new Set(entries.map(entry => entry.category));
    assert.ok(categories.size >= 7, `${gameType}: ${[...categories].join(", ")}`);
    assert.ok(entries.filter(entry => entry.category === "Personagens").length / entries.length <= 0.35, gameType);
  }
});

test("curated set metadata is descriptive and covers every item in the set", () => {
  const games = ["memoria-biblica", "associacao-de-temas", "jogo-tres-pistas"];
  for (const entry of pack.contents.filter(item => games.includes(item.gameType))) {
    assert.doesNotMatch(entry.payload.title, /(?:conjunto|associações bíblicas|três pistas bíblicas|personagens e feitos bíblicos)\s*\d+$/i);
    assert.equal(entry.biblicalReference.split(";").length, 3, entry.externalId);
    assert.ok(!entry.tags.includes("Personagens bíblicos") || entry.category === "Personagens", entry.externalId);
  }
});

test("association sets are unambiguous on both sides", () => {
  const normalized = value => String(value).normalize("NFD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  for (const entry of pack.contents.filter(item => item.gameType === "associacao-de-temas")) {
    const left = entry.payload.pairs.map(pair => normalized(pair.left));
    const right = entry.payload.pairs.map(pair => normalized(pair.right));
    assert.equal(new Set(left).size, left.length, `${entry.externalId}: item repetido`);
    assert.equal(new Set(right).size, right.length, `${entry.externalId}: associação repetida`);
  }
});

test("set games respect their approved cardinalities", () => {
  for (const entry of pack.contents) {
    if (entry.gameType === "linha-do-tempo-biblica") assert.ok(entry.payload.events.length >= 3 && entry.payload.events.length <= 8);
    if (entry.gameType === "memoria-biblica") assert.ok(entry.payload.pairs.length >= 3 && entry.payload.pairs.length <= 12);
    if (entry.gameType === "associacao-de-temas") assert.ok(entry.payload.pairs.length >= 3 && entry.payload.pairs.length <= 10);
    if (entry.gameType === "quem-sou-eu") assert.ok(entry.payload.challenges.every(item => item.hints.length >= 3 && item.hints.length <= 5));
    if (entry.gameType === "jogo-tres-pistas") assert.ok(entry.payload.challenges.every(item => item.clues.length === 3));
  }
});

test("official sets do not repeat pairs or clue/hint sets across CMS contents", () => {
  const identitiesByGame = {
    "memoria-biblica": entry => entry.payload.pairs.map(pair => `${pair.front}\u0000${pair.back}`),
    "associacao-de-temas": entry => entry.payload.pairs.map(pair => `${pair.left}\u0000${pair.right}`),
    "quem-sou-eu": entry => entry.payload.challenges.map(item => `${item.answer}\u0000${JSON.stringify(item.hints)}`),
    "jogo-tres-pistas": entry => entry.payload.challenges.map(item => `${item.answer}\u0000${JSON.stringify(item.clues)}`),
  };
  for (const [gameType, identities] of Object.entries(identitiesByGame)) {
    const all = pack.contents.filter(entry => entry.gameType === gameType).flatMap(identities);
    assert.equal(new Set(all).size, all.length, gameType);
  }
});
