import test from "node:test";
import assert from "node:assert/strict";
import {
  BIBLICAL_AREAS,
  ContentStatus,
  Difficulty,
  EDITORIAL_CATEGORIES,
  EDITORIAL_CONTRACTS,
  EDITORIAL_DIFFICULTIES,
  EDITORIAL_TAXONOMY_POLICY,
  EDITORIAL_THEMES,
  GameType,
  getContentSchema,
  getEditorialContract,
  isOfficialBiblicalArea,
  isOfficialEditorialCategory,
  isOfficialEditorialTheme,
  validateEditorialMetadata,
} from "../../shared/content.ts";

const metadata = (difficulty = Difficulty.MEDIUM, overrides = {}) => ({
  id: "legacy-content-1",
  gameType: GameType.QUIZ,
  category: "Criação e patriarcas",
  tags: ["História e Origens", " Gênesis "],
  difficulty,
  biblicalReference: "Gn 1:1",
  status: ContentStatus.PUBLISHED,
  authorId: "admin-1",
  reviewerId: null,
  createdAt: 1,
  updatedAt: 2,
  version: 1,
  internalNotes: null,
  ...overrides,
});

test("editorial taxonomy centralizes unique difficulties, areas, categories and themes", () => {
  assert.deepEqual(EDITORIAL_DIFFICULTIES, Object.values(Difficulty));
  for (const values of [EDITORIAL_DIFFICULTIES, BIBLICAL_AREAS, EDITORIAL_CATEGORIES, EDITORIAL_THEMES]) {
    assert.ok(values.length > 0);
    assert.equal(new Set(values.map(value => value.normalize("NFKC").toLocaleLowerCase("pt-BR"))).size, values.length);
  }
  assert.equal(isOfficialBiblicalArea(" evangelhos "), true);
  assert.equal(isOfficialEditorialCategory("personagens"), true);
  assert.equal(isOfficialEditorialTheme("SALVAÇÃO"), true);
});

test("one editorial contract covers every registered game and matches its schema", () => {
  assert.deepEqual(new Set(Object.keys(EDITORIAL_CONTRACTS)), new Set(Object.values(GameType)));
  for (const gameType of Object.values(GameType)) {
    const contract = getEditorialContract(gameType);
    const schema = getContentSchema(gameType);
    assert.equal(contract?.gameType, gameType);
    assert.equal(contract?.taxonomyPolicy, EDITORIAL_TAXONOMY_POLICY);
    assert.deepEqual(contract?.payloadFields, schema?.fields.map(field => field.key));
    assert.deepEqual(contract?.requiredMetadata, ["category", "difficulty", "tags"]);
    assert.deepEqual(contract?.requiredForPublished, ["biblicalReference"]);
  }
  assert.equal(getEditorialContract("future-game"), null);
});

test("central editorial validation preserves open legacy category, themes and tags", () => {
  const result = validateEditorialMetadata(GameType.QUIZ, metadata());
  assert.equal(result.errors.length, 0);
  assert.equal(result.value?.category, "Criação e patriarcas");
  assert.deepEqual(result.value?.tags, ["História e Origens", "Gênesis"]);
  assert.equal(isOfficialEditorialCategory("Criação e patriarcas"), false);
  assert.equal(EDITORIAL_TAXONOMY_POLICY, "OPEN_COMPATIBLE");
});

test("central editorial validation accepts every canonical difficulty without aliases", () => {
  for (const difficulty of EDITORIAL_DIFFICULTIES) {
    const result = validateEditorialMetadata(GameType.QUIZ, metadata(difficulty));
    assert.equal(result.errors.length, 0, difficulty);
    assert.equal(result.value?.difficulty, difficulty);
  }
});

test("central editorial validation still rejects invalid required metadata", () => {
  const result = validateEditorialMetadata(GameType.QUIZ, metadata("medium", {
    category: "",
    biblicalReference: null,
  }));
  assert.equal(result.value, null);
  assert.ok(result.errors.some(issue => issue.field === "metadata.category"));
  assert.ok(result.errors.some(issue => issue.field === "metadata.difficulty"));
  assert.ok(result.errors.some(issue => issue.field === "metadata.biblicalReference"));
});
