import test from "node:test";
import assert from "node:assert/strict";
import {
  ContentStatus,
  Difficulty,
  GameType,
  canTransitionContentStatus,
  contentSchemas,
  createContentDuplicateKey,
  duplicateContent,
  getContentSchema,
  legacyQuizToUniversal,
  universalQuizToLegacy,
  validateContent,
} from "../../shared/content.ts";

const metadata = (gameType, overrides = {}) => ({
  id: `content-${gameType}`,
  gameType,
  category: "Bíblia",
  tags: [" fé ", "Fé"],
  difficulty: Difficulty.MEDIUM,
  biblicalReference: " João 3:16 ",
  status: ContentStatus.PUBLISHED,
  authorId: "user-1",
  reviewerId: null,
  createdAt: 1,
  updatedAt: 2,
  version: 1,
  internalNotes: null,
  ...overrides,
});

const validPayloads = {
  [GameType.QUIZ]: {
    prompt: " Quem construiu a arca? ",
    choices: [
      { text: " Noé ", correct: true },
      { text: "Moisés", correct: false },
      { text: "Davi", correct: false },
      { text: "Paulo", correct: false },
    ],
    book: "Gênesis",
    theme: "Dilúvio",
    explanation: "Noé obedeceu a Deus.",
  },
  [GameType.WORDLE]: { word: " GRAÇA ", hint: "Favor imerecido" },
  [GameType.TIMELINE]: {
    title: "Patriarcas",
    events: [
      { title: "Abraão", position: 1 }, { title: "Isaque", position: 2 },
      { title: "Jacó", position: 3 }, { title: "José", position: 4 },
    ],
  },
  [GameType.MEMORY]: {
    title: "Símbolos",
    pairs: [
      { front: "Noé", back: "Arca" }, { front: "Espírito Santo", back: "Pomba" },
      { front: "Judá", back: "Leão" },
    ],
  },
  [GameType.ASSOCIATION]: {
    title: "Personagens",
    pairs: [
      { left: "Noé", right: "Arca" },
      { left: "Davi", right: "Golias" },
      { left: "Moisés", right: "Mar Vermelho" },
    ],
  },
  [GameType.WHO_AM_I]: {
    name: "Moisés",
    hints: ["Fui criado no Egito", "Vi uma sarça", "Conduzi Israel"],
    options: ["Moisés", "Davi", "Paulo", "Pedro"],
  },
  [GameType.THREE_CLUES]: { answer: "Noé", clues: ["Construí uma arca", "Houve um dilúvio", "Vi um arco-íris"] },
};

test("registry exposes complete schemas and real templates for all seven games", () => {
  assert.equal(contentSchemas.length, 7);
  for (const gameType of Object.values(GameType)) {
    const schema = getContentSchema(gameType);
    assert.equal(schema?.gameType, gameType);
    assert.ok(schema.fields.length >= 2);
    assert.ok(schema.templates.length >= 3);
    assert.equal(schema.capabilities.supportsVersioning, true);
    assert.ok(Object.values(schema.capabilities).every(value => typeof value === "boolean"));
    assert.ok(schema.duplicateStrategy.fields.length);
  }
});

test("registry returns an explicit null for unsupported games", () => {
  assert.equal(getContentSchema("future-game"), null);
});

test("all seven schemas accept and normalize valid content", () => {
  for (const gameType of Object.values(GameType)) {
    const result = validateContent(gameType, metadata(gameType), validPayloads[gameType]);
    assert.equal(result.valid, true, `${gameType}: ${JSON.stringify(result.errors)}`);
    assert.equal(result.normalizedValue?.gameType, gameType);
    assert.deepEqual(result.normalizedValue?.tags, ["fé", "Fé"]);
  }
});

test("each game schema rejects an invalid payload with field-level errors", () => {
  for (const gameType of Object.values(GameType)) {
    const result = validateContent(gameType, metadata(gameType), {});
    assert.equal(result.valid, false, gameType);
    assert.ok(result.errors.length >= 2, gameType);
    assert.ok(result.errors.every(error => error.field && error.code && error.message), gameType);
  }
});

test("generic validation identifies required fields, types and list limits", () => {
  const quiz = validateContent(GameType.QUIZ, metadata(GameType.QUIZ), {
    ...validPayloads[GameType.QUIZ],
    prompt: "",
    choices: [{ text: "Uma", correct: true }],
  });
  assert.equal(quiz.valid, false);
  assert.ok(quiz.errors.some(error => error.field === "prompt" && error.code === "required"));
  assert.ok(quiz.errors.some(error => error.field === "choices" && error.code === "minimum_items"));

  const wordle = validateContent(GameType.WORDLE, metadata(GameType.WORDLE), { word: 123, hint: null });
  assert.ok(wordle.errors.some(error => error.field === "word" && error.code === "invalid_type"));
  for (const word of ["REI", "APOSTOLO"]) {
    const invalidLength = validateContent(
      GameType.WORDLE,
      metadata(GameType.WORDLE),
      { word, hint: null },
    );
    assert.equal(invalidLength.valid, false);
    assert.ok(invalidLength.errors.some(error => error.field === "word"));
  }
});

test("Timeline accepts 3 to 8 events and requires a unique contiguous sequence", () => {
  const threeEvents = {
    title: "Origens",
    events: [
      { title: "Criação", description: "Deus cria todas as coisas.", position: 1 },
      { title: "Dilúvio", position: 2 },
      { title: "Chamado de Abraão", position: 3 },
    ],
  };
  assert.equal(validateContent(GameType.TIMELINE, metadata(GameType.TIMELINE), threeEvents).valid, true);
  const gap = validateContent(GameType.TIMELINE, metadata(GameType.TIMELINE), {
    ...threeEvents,
    events: threeEvents.events.map((event, index) => ({ ...event, position: index === 2 ? 4 : event.position })),
  });
  assert.ok(gap.errors.some(error => error.code === "invalid_sequence"));
  const duplicate = validateContent(GameType.TIMELINE, metadata(GameType.TIMELINE), {
    ...threeEvents,
    events: threeEvents.events.map((event, index) => ({ ...event, position: index === 2 ? 2 : event.position })),
  });
  assert.ok(duplicate.errors.some(error => error.code === "duplicate_positions"));
});

test("Memory accepts 3 to 12 pairs with required, unique fronts and backs", () => {
  const valid = validPayloads[GameType.MEMORY];
  assert.equal(validateContent(GameType.MEMORY, metadata(GameType.MEMORY), valid).valid, true);
  const duplicate = validateContent(GameType.MEMORY, metadata(GameType.MEMORY), {
    ...valid,
    pairs: [...valid.pairs, { ...valid.pairs[0] }],
  });
  assert.ok(duplicate.errors.some(error => error.code === "duplicate_pairs"));
  const incomplete = validateContent(GameType.MEMORY, metadata(GameType.MEMORY), {
    ...valid,
    pairs: valid.pairs.map((pair, index) => index === 0 ? { ...pair, back: "" } : pair),
  });
  assert.ok(incomplete.errors.some(error => error.field === "pairs.0.back"));
});

test("Association accepts 3 to 10 pairs with required and unique sides", () => {
  const valid = validPayloads[GameType.ASSOCIATION];
  assert.equal(validateContent(GameType.ASSOCIATION, metadata(GameType.ASSOCIATION), valid).valid, true);
  const duplicateLeft = validateContent(GameType.ASSOCIATION, metadata(GameType.ASSOCIATION), {
    ...valid,
    pairs: [...valid.pairs, { left: " noé ", right: "Dilúvio" }],
  });
  assert.ok(duplicateLeft.errors.some(error => error.code === "duplicate_left_items"));
  const duplicateRight = validateContent(GameType.ASSOCIATION, metadata(GameType.ASSOCIATION), {
    ...valid,
    pairs: [...valid.pairs, { left: "Ester", right: " ARCA " }],
  });
  assert.ok(duplicateRight.errors.some(error => error.code === "duplicate_right_items"));
  const incomplete = validateContent(GameType.ASSOCIATION, metadata(GameType.ASSOCIATION), {
    ...valid,
    pairs: valid.pairs.map((pair, index) => index === 0 ? { ...pair, right: "" } : pair),
  });
  assert.ok(incomplete.errors.some(error => error.field === "pairs.0.right"));
});

test("published content requires a biblical reference while drafts do not", () => {
  const published = validateContent(GameType.WORDLE, metadata(GameType.WORDLE, { biblicalReference: null }), validPayloads[GameType.WORDLE]);
  assert.ok(published.errors.some(error => error.code === "required_for_published"));
  const draft = validateContent(GameType.WORDLE, metadata(GameType.WORDLE, {
    biblicalReference: null,
    status: ContentStatus.DRAFT,
  }), validPayloads[GameType.WORDLE]);
  assert.equal(draft.valid, true);
});

test("editorial state transitions are explicit and safe", () => {
  assert.equal(canTransitionContentStatus(ContentStatus.DRAFT, ContentStatus.IN_REVIEW), true);
  assert.equal(canTransitionContentStatus(ContentStatus.IN_REVIEW, ContentStatus.PUBLISHED), true);
  assert.equal(canTransitionContentStatus(ContentStatus.PUBLISHED, ContentStatus.DRAFT), false);
  assert.equal(canTransitionContentStatus(ContentStatus.ARCHIVED, ContentStatus.PUBLISHED), false);
});

test("quiz rejects duplicate alternatives and anything other than one correct answer", () => {
  const duplicate = validateContent(GameType.QUIZ, metadata(GameType.QUIZ), {
    ...validPayloads[GameType.QUIZ],
    choices: [
      { text: "Noé", correct: true }, { text: " NOÉ ", correct: false },
      { text: "Davi", correct: false }, { text: "Paulo", correct: false },
    ],
  });
  assert.ok(duplicate.errors.some(error => error.code === "duplicate_items"));
  const twoCorrect = validateContent(GameType.QUIZ, metadata(GameType.QUIZ), {
    ...validPayloads[GameType.QUIZ],
    choices: validPayloads[GameType.QUIZ].choices.map((choice, index) => ({ ...choice, correct: index < 2 })),
  });
  assert.ok(twoCorrect.errors.some(error => error.code === "invalid_correct_count"));
});

test("quiz import metadata contains official columns, aliases and transformations", () => {
  const columns = getContentSchema(GameType.QUIZ).importColumns;
  assert.deepEqual(columns.map(column => column.column), [
    "livro", "referencia", "tema", "categoria", "dificuldade", "enunciado",
    "alternativa_a", "alternativa_b", "alternativa_c", "alternativa_d", "correta", "comentario",
  ]);
  assert.ok(columns.find(column => column.column === "referencia").aliases.includes("referência"));
  assert.equal(columns.find(column => column.column === "correta").transformation, "correct-choice");
});

test("duplicate strategies normalize accents, case and spacing per game", () => {
  for (const gameType of Object.values(GameType)) {
    const first = createContentDuplicateKey(gameType, metadata(gameType), validPayloads[gameType]);
    assert.ok(first?.key.startsWith(`${gameType}:`));
  }
  const first = createContentDuplicateKey(GameType.WORDLE, metadata(GameType.WORDLE), { word: "GRAÇA", hint: null });
  const second = createContentDuplicateKey(GameType.WORDLE, metadata(GameType.WORDLE), { word: " graca ", hint: "outra" });
  assert.equal(first?.key, second?.key);
});

test("generic duplication creates an independent draft without reusing identity", () => {
  const source = validateContent(GameType.WORDLE, metadata(GameType.WORDLE), validPayloads[GameType.WORDLE]).normalizedValue;
  const copy = duplicateContent(source, { id: "copy-1", authorId: "editor-2", now: 100 });
  assert.equal(copy.id, "copy-1");
  assert.equal(copy.status, ContentStatus.DRAFT);
  assert.equal(copy.version, 1);
  assert.equal(copy.authorId, "editor-2");
  assert.notEqual(copy.content.payload, source.content.payload);
  assert.equal(copy.content.payload.word, source.content.payload.word);
  assert.throws(() => duplicateContent(source, { id: source.id, authorId: "editor-2", now: 100 }));
});

test("legacy Quiz adapter preserves identity, answer, editorial state and references", () => {
  const legacy = {
    id: "question-1",
    reference: "Gênesis 6",
    book: "Gênesis",
    theme: "Dilúvio",
    category: "História",
    difficulty: "hard",
    prompt: "Quem construiu a arca?",
    commentary: "Noé.",
    status: "active",
    reviewStatus: "approved",
    version: 4,
    createdBy: "author",
    updatedBy: "reviewer",
    createdAt: 10,
    updatedAt: 20,
    choices: [
      { id: "c2", text: "Moisés", position: 1, correct: 0 },
      { id: "c1", text: "Noé", position: 0, correct: 1 },
      { id: "c3", text: "Davi", position: 2, correct: 0 },
      { id: "c4", text: "Paulo", position: 3, correct: 0 },
    ],
  };
  const universal = legacyQuizToUniversal(legacy);
  assert.equal(universal.id, legacy.id);
  assert.equal(universal.status, ContentStatus.PUBLISHED);
  assert.equal(universal.content.payload.choices[0].text, "Noé");
  assert.equal(universal.content.payload.choices[0].correct, true);
  assert.equal(universal.biblicalReference, legacy.reference);
  assert.equal(universal.difficulty, Difficulty.HARD);

  const restored = universalQuizToLegacy(universal);
  assert.equal(restored.id, legacy.id);
  assert.equal(restored.status, "active");
  assert.equal(restored.reviewStatus, "approved");
  assert.deepEqual(restored.choices.map(choice => [choice.text, choice.correct]), [
    ["Noé", true], ["Moisés", false], ["Davi", false], ["Paulo", false],
  ]);
});

test("legacy editorial statuses map safely, including changes requested notes", () => {
  const base = {
    id: "question-2", reference: null, book: null, theme: "Tema", category: null,
    difficulty: "easy", prompt: "Pergunta válida e completa?", commentary: null,
    version: 1, createdBy: "author", createdAt: 1, updatedAt: 1,
    choices: [
      { text: "A", correct: true }, { text: "B", correct: false },
      { text: "C", correct: false }, { text: "D", correct: false },
    ],
  };
  assert.equal(legacyQuizToUniversal({ ...base, status: "draft", reviewStatus: "draft" }).status, ContentStatus.DRAFT);
  assert.equal(legacyQuizToUniversal({ ...base, status: "draft", reviewStatus: "in_review" }).status, ContentStatus.IN_REVIEW);
  assert.equal(legacyQuizToUniversal({ ...base, status: "archived", reviewStatus: "approved" }).status, ContentStatus.ARCHIVED);
  const changes = legacyQuizToUniversal({ ...base, status: "draft", reviewStatus: "changes_requested" });
  assert.equal(changes.status, ContentStatus.DRAFT);
  assert.match(changes.internalNotes, /alterações solicitadas/i);
  assert.equal(universalQuizToLegacy(changes).reviewStatus, "changes_requested");
});
