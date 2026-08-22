import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ContentStatus, validateContent } from "../../shared/content.ts";

const packUrl = new URL("../../content/content-scale-up-v2-remaining-games.json", import.meta.url);
const reviewUrl = new URL("../../docs/PRODUCT/CONTENT_SCALE_UP_V2_REMAINING_GAMES_REVIEW.md", import.meta.url);
const official = JSON.parse(await readFile(new URL("../../content/official-base-content-v1.json", import.meta.url), "utf8"));
const pack = JSON.parse(await readFile(packUrl, "utf8"));

const countBy = (items, key) => Object.fromEntries(
  Object.entries(Object.groupBy(items, key)).map(([name, values]) => [name, values.length]),
);
const normalize = value => String(value ?? "").normalize("NFD").replace(/\p{M}/gu, "")
  .toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/gu, " ").trim();
const metadata = entry => ({
  id: entry.externalId,
  gameType: entry.gameType,
  category: entry.category,
  tags: entry.tags,
  difficulty: entry.difficulty,
  biblicalReference: entry.biblicalReference,
  status: ContentStatus.DRAFT,
  authorId: "content-scale-up-v2",
  reviewerId: null,
  createdAt: 1,
  updatedAt: 1,
  version: 1,
  internalNotes: "Pacote conjunto pendente de revisão humana",
});

test("pacote conjunto possui exatamente os cinco blocos autorizados", () => {
  assert.equal(pack.reviewStatus, "PENDING_HUMAN_REVIEW");
  assert.equal(pack.generationPolicy, "OWNER_AUTHORIZED_COMBINED_REVIEW_BATCH");
  assert.equal(pack.contents.length, 3040);
  assert.deepEqual(countBy(pack.contents, item => item.gameType), {
    "linha-do-tempo-biblica": 760,
    "memoria-biblica": 60,
    "associacao-de-temas": 740,
    "quem-sou-eu": 740,
    "jogo-tres-pistas": 740,
  });
  assert.equal(new Set(pack.contents.map(item => item.externalId)).size, 3040);
});

test("metas acumuladas e distribuições editoriais são preservadas", () => {
  const combined = [...official.contents, ...pack.contents];
  for (const gameType of ["linha-do-tempo-biblica", "associacao-de-temas", "quem-sou-eu", "jogo-tres-pistas"]) {
    const contents = combined.filter(item => item.gameType === gameType);
    assert.equal(contents.length, 800, gameType);
    assert.deepEqual(countBy(contents, item => item.difficulty), { EASY: 240, MEDIUM: 360, HARD: 200 }, gameType);
    assert.deepEqual(countBy(contents, item => item.tags[0]), {
      "Antigo Testamento": 440,
      "Novo Testamento": 360,
    }, gameType);
  }

  const memory = combined.filter(item => item.gameType === "memoria-biblica");
  const memoryPairs = memory.flatMap(item => item.payload.pairs.map(pair => ({ ...pair, testament: item.tags[0] })));
  assert.equal(memoryPairs.length, 300);
  assert.deepEqual(countBy(memoryPairs, pair => pair.testament), {
    "Antigo Testamento": 165,
    "Novo Testamento": 135,
  });

  const three = combined.filter(item => item.gameType === "jogo-tres-pistas");
  assert.equal(three.filter(item => item.category === "Personagens").length, 100);
});

test("todos os candidatos passam pelos schemas reais somente como DRAFT", () => {
  const failures = pack.contents.flatMap(entry => {
    const result = validateContent(entry.gameType, metadata(entry), entry.payload);
    return result.valid ? [] : [{ id: entry.externalId, errors: result.errors }];
  });
  assert.deepEqual(failures, []);
});

test("relações, respostas e fingerprints não se duplicam indevidamente", () => {
  for (const entry of pack.contents) {
    assert.ok(entry.biblicalReference.trim(), entry.externalId);
    assert.equal(entry.editorialProvenance.reviewFlag, "PENDING_HUMAN_REVIEW", entry.externalId);
    if (entry.payload.pairs) {
      const pairs = entry.payload.pairs.map(pair => `${normalize(pair.left ?? pair.front)}:${normalize(pair.right ?? pair.back)}`);
      assert.equal(new Set(pairs).size, pairs.length, entry.externalId);
    }
    if (entry.payload.challenges) {
      const answers = entry.payload.challenges.map(challenge => normalize(challenge.answer));
      assert.equal(new Set(answers).size, answers.length, entry.externalId);
      for (const challenge of entry.payload.challenges) {
        const answer = normalize(challenge.answer);
        for (const clue of challenge.hints ?? challenge.clues) {
          const clueNormalized = normalize(clue);
          const revealed = answer.includes(" ") ? clueNormalized.includes(answer) : clueNormalized.split(" ").includes(answer);
          assert.equal(revealed, false, entry.externalId);
        }
      }
    }
    if (entry.payload.events) {
      assert.deepEqual(entry.payload.events.map(event => event.position), [1, 2, 3], entry.externalId);
      assert.match(entry.payload.title, /Ordem narrativa/u, entry.externalId);
    }
  }
});

test("gerador e relatório conjunto são determinísticos", async () => {
  const before = await readFile(packUrl, "utf8");
  const reviewBefore = await readFile(reviewUrl, "utf8");
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(
    "../../scripts/generate-content-scale-up-v2-remaining-games.mjs",
    import.meta.url,
  ))], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(packUrl, "utf8"), before);
  assert.equal(await readFile(reviewUrl, "utf8"), reviewBefore);
  assert.match(reviewBefore, /3040 conteúdos candidatos/u);
});
