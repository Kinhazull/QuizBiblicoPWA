import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildInventory, renderInventory } from "../scripts/generate-content-scale-up-v2-inventory.mjs";

test("inventário v2 contabiliza fontes locais sem confundir CSV e produção", async () => {
  const inventory = await buildInventory();
  assert.equal(inventory.quiz.authoredCsvRows, 1000);
  assert.equal(inventory.quiz.lastVerifiedPublishedBaseline, 984);
  assert.equal(inventory.officialPackItems, 380);
  assert.equal(inventory.wordleExpansionItems, 153);
  assert.equal(inventory.wordleLot01Items, 50);
  assert.equal(inventory.wordleRemainingReviewItems, 877);
  assert.deepEqual(inventory.wordleProjectedAfterReview, {
    canonicalUnits: 1200,
    lengths: { "5": 400, "6": 400, "7": 400 },
  });
  assert.equal(inventory.remainingGamesReview.status, "PENDING_HUMAN_REVIEW");
  assert.equal(inventory.remainingGamesReview.items, 3040);
  assert.deepEqual(inventory.remainingGamesReview.projectedByGame, {
    "linha-do-tempo-biblica": { candidateContents: 760, canonicalUnits: 800 },
    "memoria-biblica": { candidateContents: 60, canonicalUnits: 300 },
    "associacao-de-temas": { candidateContents: 740, canonicalUnits: 800 },
    "quem-sou-eu": { candidateContents: 740, canonicalUnits: 800 },
    "jogo-tres-pistas": { candidateContents: 740, canonicalUnits: 800 },
  });
});

test("inventário calcula unidades canônicas e lacunas aprovadas", async () => {
  const { games } = await buildInventory();
  assert.deepEqual(
    Object.fromEntries(Object.entries(games).map(([game, value]) => [game, [value.canonicalUnits, value.gap]])),
    {
      "wordle-biblico": [323, 877],
      "linha-do-tempo-biblica": [40, 760],
      "memoria-biblica": [120, 180],
      "associacao-de-temas": [60, 740],
      "quem-sou-eu": [60, 740],
      "jogo-tres-pistas": [60, 740],
    },
  );
  assert.deepEqual(games["wordle-biblico"].lengths, { "5": 220, "6": 50, "7": 53 });
});

test("inventário torna visível a sobreposição histórica entre jogos", async () => {
  const inventory = await buildInventory();
  assert.equal(inventory.overlaps.memoryPairsAlsoInAssociation, 120);
  assert.equal(inventory.overlaps.whoChallengesAlsoInThreeClues, 20);
  assert.equal(inventory.overlaps.uniqueAnswersSharedByWhoAndThree, 20);
});

test("relatório versionado é reprodução exata do gerador", async () => {
  const expected = renderInventory(await buildInventory());
  const current = await readFile(new URL("../docs/PRODUCT/CONTENT_SCALE_UP_V2_INVENTORY.md", import.meta.url), "utf8");
  assert.equal(current, expected);
  assert.match(current, /não consulta produção/i);
  assert.match(current, /nada é publicado automaticamente/i);
});
