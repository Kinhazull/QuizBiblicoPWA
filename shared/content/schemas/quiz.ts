import {
  GameType,
  type ContentSchema,
  type SharedContentMetadata,
} from "../schema-types.ts";
import { EditorialCategory } from "../editorial-taxonomy.ts";
import { field, issue, objectArray, standardCapabilities } from "./shared.ts";

export const quizContentSchema: ContentSchema = {
  gameType: GameType.QUIZ,
  label: "Quiz Bíblico",
  description: "Perguntas bíblicas com alternativas e resposta verificável.",
  fields: [
    field("prompt", "Enunciado", "textarea", true, { minimum: 8, maximum: 500, importColumn: "enunciado" }),
    field("choices", "Alternativas", "list", true, {
      minimumItems: 4,
      maximumItems: 4,
      fields: [
        field("text", "Texto da alternativa", "text", true, { maximum: 300 }),
        field("correct", "Alternativa correta", "boolean", true, { defaultValue: false }),
      ],
    }),
    field("book", "Livro", "text", false, { maximum: 80, importColumn: "livro" }),
    field("theme", "Tema", "text", true, { minimum: 2, maximum: 80, importColumn: "tema" }),
    field("explanation", "Comentário", "textarea", false, { maximum: 1000, importColumn: "comentario" }),
  ],
  templates: [
    { id: "multiple-choice", label: "Múltipla escolha", description: "Quatro alternativas e uma correta.", values: { choices: 4 } },
    { id: "true-false", label: "Verdadeiro ou falso", description: "Afirmação bíblica com resposta binária.", values: { choices: ["Verdadeiro", "Falso"] } },
    { id: "complete-verse", label: "Complete o versículo", description: "Completar um trecho bíblico.", values: { category: EditorialCategory.VERSES } },
    { id: "character", label: "Personagem", description: "Pergunta sobre personagem bíblico.", values: { category: EditorialCategory.CHARACTERS } },
    { id: "book", label: "Livro bíblico", description: "Pergunta sobre um livro da Bíblia.", values: { category: EditorialCategory.BOOKS } },
  ],
  validation: payload => {
    const errors = [];
    const choices = objectArray(payload.choices);
    if (choices.length === 4) {
      const texts = choices.map(choice => String(choice.text ?? "").normalize("NFKC").trim().toLocaleLowerCase("pt-BR"));
      if (new Set(texts).size !== 4) errors.push(issue("choices", "duplicate_items", "As alternativas devem ser diferentes."));
      if (choices.filter(choice => choice.correct === true).length !== 1) {
        errors.push(issue("choices", "invalid_correct_count", "Exatamente uma alternativa deve ser correta."));
      }
      choices.forEach((choice, index) => {
        if (typeof choice.text !== "string" || !choice.text.trim() || choice.text.trim().length > 300) {
          errors.push(issue(`choices.${index}.text`, "invalid_text", "A alternativa deve conter até 300 caracteres."));
        }
        if (typeof choice.correct !== "boolean") errors.push(issue(`choices.${index}.correct`, "invalid_type", "O campo correta deve ser booleano."));
      });
    }
    return errors;
  },
  duplicateStrategy: {
    fields: ["prompt", "choices.text"],
    buildParts: (_metadata: SharedContentMetadata, payload) => [
      String(payload.prompt ?? ""),
      ...objectArray(payload.choices).map(choice => String(choice.text ?? "")).sort(),
    ],
  },
  importColumns: [
    ["book", "livro", ["book"], "text", false, "trim"],
    ["biblicalReference", "referencia", ["referência", "reference"], "text", false, "trim"],
    ["theme", "tema", ["theme"], "text", true, "trim"],
    ["category", "categoria", ["category"], "text", false, "trim"],
    ["difficulty", "dificuldade", ["difficulty"], "text", true, "difficulty"],
    ["prompt", "enunciado", ["pergunta", "prompt"], "text", true, "trim"],
    ["choiceA", "alternativa_a", ["alternativa a", "choice_a"], "text", true, "trim"],
    ["choiceB", "alternativa_b", ["alternativa b", "choice_b"], "text", true, "trim"],
    ["choiceC", "alternativa_c", ["alternativa c", "choice_c"], "text", true, "trim"],
    ["choiceD", "alternativa_d", ["alternativa d", "choice_d"], "text", true, "trim"],
    ["correctChoice", "correta", ["resposta", "correct"], "text", true, "correct-choice"],
    ["explanation", "comentario", ["comentário", "explanation"], "text", false, "trim"],
  ].map(([key, column, aliases, expectedType, required, transformation]) => ({
    key: key as string, column: column as string, aliases: aliases as string[],
    expectedType: expectedType as "text", required: required as boolean,
    transformation: transformation as "trim" | "difficulty" | "correct-choice",
  })),
  capabilities: standardCapabilities({ supportsExplanation: true, supportsBulkImport: true }),
};
