import test from "node:test";
import assert from "node:assert/strict";
import {
  ContentStatus,
  Difficulty,
  GameType,
  contentSchemas,
  getContentSchema,
  validateContent,
} from "../../shared/content.ts";
import {
  aliasForGame,
  applyTemplate,
  createEditorDraft,
  defaultListItem,
  editorGameAliases,
  gameFromQuery,
  updateAtPath,
} from "../../app/admin/conteudo/editor/editor-model.ts";

test("editor query aliases resolve all schemas and invalid input falls back to Quiz", () => {
  assert.equal(Object.keys(editorGameAliases).length, 7);
  for (const [alias, gameType] of Object.entries(editorGameAliases)) {
    assert.deepEqual(gameFromQuery(alias), { gameType, invalid: false });
    assert.equal(aliasForGame(gameType), alias);
  }
  assert.deepEqual(gameFromQuery("unknown"), { gameType: GameType.QUIZ, invalid: true });
  assert.deepEqual(gameFromQuery(null), { gameType: GameType.QUIZ, invalid: false });
});

test("each schema creates an isolated local DRAFT with registry defaults", () => {
  for (const schema of contentSchemas) {
    const draft = createEditorDraft(schema.gameType);
    assert.equal(draft.gameType, schema.gameType);
    assert.equal(draft.metadata.status, ContentStatus.DRAFT);
    assert.equal(draft.metadata.difficulty, Difficulty.MEDIUM);
    assert.match(draft.metadata.id, /^local-/);
    assert.deepEqual(Object.keys(draft.payload), schema.fields.map(field => field.key));
  }
});

test("first template can be applied for every game and metadata stays compatible", () => {
  for (const schema of contentSchemas) {
    const draft = createEditorDraft(schema.gameType);
    draft.metadata.tags = ["editorial"];
    draft.metadata.biblicalReference = "João 3:16";
    const next = applyTemplate(draft, schema.templates[0]);
    assert.equal(next.templateId, schema.templates[0].id);
    assert.deepEqual(next.metadata.tags, ["editorial"]);
    assert.equal(next.metadata.biblicalReference, "João 3:16");
    assert.notEqual(next.payload, draft.payload);
  }
});

test("quiz template materializes structured alternatives from declarative item fields", () => {
  const schema = getContentSchema(GameType.QUIZ);
  const template = schema.templates.find(item => item.id === "multiple-choice");
  const draft = createEditorDraft(GameType.QUIZ, template);
  assert.equal(draft.payload.choices.length, 4);
  assert.deepEqual(draft.payload.choices[0], { text: "", correct: false });
});

test("list item factories cover simple and object items without shared references", () => {
  const quizChoices = getContentSchema(GameType.QUIZ).fields.find(field => field.key === "choices");
  const whoChallenges = getContentSchema(GameType.WHO_AM_I).fields.find(field => field.key === "challenges");
  const whoHints = whoChallenges.fields.find(field => field.key === "hints");
  const first = defaultListItem(quizChoices);
  const second = defaultListItem(quizChoices);
  assert.deepEqual(first, { text: "", correct: false });
  assert.notEqual(first, second);
  assert.equal(defaultListItem(whoHints), "");
});

test("immutable nested updates support object fields and list reordering state", () => {
  const source = { choices: [{ text: "A", correct: false }, { text: "B", correct: true }] };
  const updated = updateAtPath(source, ["choices", 0, "correct"], true);
  assert.equal(updated.choices[0].correct, true);
  assert.equal(source.choices[0].correct, false);
  assert.notEqual(updated, source);
});

test("universal validation reports nested list/object errors using precise paths", () => {
  const draft = createEditorDraft(GameType.QUIZ, getContentSchema(GameType.QUIZ).templates[0]);
  draft.metadata.category = "Perguntas";
  draft.payload.prompt = "Quem construiu a arca?";
  draft.payload.theme = "Dilúvio";
  draft.payload.choices[0].text = "";
  const result = validateContent(draft.gameType, draft.metadata, draft.payload);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(issue => issue.field === "choices.0.text" && issue.code === "required"));
});
