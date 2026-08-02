import { GameType, type ContentSchema } from "../schema-types.ts";
import { EditorialCategory } from "../editorial-taxonomy.ts";
import { field, issue, objectArray, standardCapabilities } from "./shared.ts";

const normalized = (value: unknown) => String(value ?? "")
  .normalize("NFKC")
  .trim()
  .replace(/\s+/g, " ")
  .toLocaleLowerCase("pt-BR");

export const whoAmIContentSchema: ContentSchema = {
  gameType: GameType.WHO_AM_I,
  label: "Quem Sou Eu?",
  description: "Conjuntos de personagens bíblicos descobertos por dicas progressivas.",
  fields: [
    field("title", "Título do conjunto", "text", true, { minimum: 3, maximum: 120 }),
    field("challenges", "Desafios", "list", true, {
      minimumItems: 3,
      maximumItems: 10,
      fields: [
        field("answer", "Resposta correta", "text", true, { minimum: 2, maximum: 80 }),
        field("hints", "Pistas em ordem crescente de facilidade", "list", true, {
          minimumItems: 3,
          maximumItems: 5,
          itemField: field("hint", "Pista", "text", true, { minimum: 2, maximum: 240 }),
        }),
      ],
    }),
  ],
  templates: [
    { id: "old-testament", label: "Antigo Testamento", description: "Personagens do Antigo Testamento.", values: { category: EditorialCategory.OLD_TESTAMENT } },
    { id: "new-testament", label: "Novo Testamento", description: "Personagens do Novo Testamento.", values: { category: EditorialCategory.NEW_TESTAMENT } },
    { id: "mixed-set", label: "Conjunto misto", description: "Personagens de diferentes períodos bíblicos.", values: { difficulty: "MEDIUM" } },
  ],
  validation: payload => {
    const challenges = objectArray(payload.challenges);
    const errors = challenges.flatMap((challenge, challengeIndex) => {
      const challengeErrors = [];
      if (!normalized(challenge.answer)) {
        challengeErrors.push(issue(
          `challenges.${challengeIndex}.answer`,
          "required",
          "A resposta correta é obrigatória.",
        ));
      }
      const hints = Array.isArray(challenge.hints) ? challenge.hints : [];
      hints.forEach((hint, hintIndex) => {
        if (!normalized(hint)) {
          challengeErrors.push(issue(
            `challenges.${challengeIndex}.hints.${hintIndex}`,
            "required",
            "A pista não pode ser vazia.",
          ));
        }
      });
      const normalizedHints = hints.map(normalized).filter(Boolean);
      if (new Set(normalizedHints).size !== normalizedHints.length) {
        challengeErrors.push(issue(
          `challenges.${challengeIndex}.hints`,
          "duplicate_hints",
          "As pistas de um desafio não podem se repetir.",
        ));
      }
      return challengeErrors;
    });
    const answers = challenges.map(challenge => normalized(challenge.answer)).filter(Boolean);
    if (new Set(answers).size !== answers.length) {
      errors.push(issue(
        "challenges",
        "duplicate_answers",
        "As respostas do conjunto não podem se repetir.",
      ));
    }
    return errors;
  },
  duplicateStrategy: {
    fields: ["title", "challenges.answer"],
    buildParts: (_metadata, payload) => [
      String(payload.title ?? ""),
      ...objectArray(payload.challenges).map(challenge => String(challenge.answer ?? "")).sort(),
    ],
  },
  importColumns: [],
  capabilities: standardCapabilities(),
};
