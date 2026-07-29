import { GameType, type ContentSchema } from "../schema-types.ts";
import { field, issue, standardCapabilities } from "./shared.ts";

export const threeCluesContentSchema: ContentSchema = {
  gameType: GameType.THREE_CLUES,
  label: "Jogo das 3 Pistas",
  description: "Conjuntos bíblicos com respostas descobertas por exatamente três pistas.",
  fields: [
    field("title", "Título", "text", true, { minimum: 3, maximum: 120 }),
    field("challenges", "Desafios", "list", true, {
      minimumItems: 3,
      maximumItems: 10,
      itemField: field("challenge", "Desafio", "object", true, {
        fields: [
          field("answer", "Resposta", "text", true, { minimum: 2, maximum: 100 }),
          field("clues", "Pistas", "list", true, {
            minimumItems: 3,
            maximumItems: 3,
            itemField: field("clue", "Pista", "text", true, { minimum: 2, maximum: 240 }),
          }),
        ],
      }),
    }),
  ],
  templates: [
    { id: "characters", label: "Personagens", description: "Conjunto sobre personagens bíblicos.", values: { category: "Personagens" } },
    { id: "places", label: "Lugares", description: "Conjunto sobre lugares bíblicos.", values: { category: "Lugares" } },
    { id: "events", label: "Acontecimentos", description: "Conjunto sobre acontecimentos bíblicos.", values: { category: "Eventos" } },
  ],
  validation: payload => {
    const challenges = Array.isArray(payload.challenges) ? payload.challenges : [];
    const answers = new Set<string>();
    return challenges.flatMap((value, challengeIndex) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return [issue(`challenges.${challengeIndex}`, "invalid", "O desafio é inválido.")];
      }
      const challenge = value as Record<string, unknown>;
      const normalizedAnswer = String(challenge.answer ?? "").normalize("NFKC")
        .trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
      const issues = [];
      if (!normalizedAnswer) {
        issues.push(issue(`challenges.${challengeIndex}.answer`, "required", "A resposta é obrigatória."));
      } else if (answers.has(normalizedAnswer)) {
        issues.push(issue(`challenges.${challengeIndex}.answer`, "duplicate_answers", "As respostas não podem se repetir."));
      }
      answers.add(normalizedAnswer);
      const clues = Array.isArray(challenge.clues) ? challenge.clues : [];
      const normalizedClues = new Set<string>();
      clues.forEach((clue, clueIndex) => {
        const normalizedClue = typeof clue === "string"
          ? clue.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR")
          : "";
        if (!normalizedClue) {
          issues.push(issue(
            `challenges.${challengeIndex}.clues.${clueIndex}`,
            "required",
            "A pista não pode ser vazia.",
          ));
        } else if (normalizedClues.has(normalizedClue)) {
          issues.push(issue(
            `challenges.${challengeIndex}.clues.${clueIndex}`,
            "duplicate_clues",
            "As pistas do desafio não podem se repetir.",
          ));
        }
        normalizedClues.add(normalizedClue);
      });
      return issues;
    });
  },
  duplicateStrategy: {
    fields: ["title", "challenges"],
    buildParts: (_metadata, payload) => [
      String(payload.title ?? ""),
      JSON.stringify(payload.challenges ?? []),
    ],
  },
  importColumns: [],
  capabilities: standardCapabilities(),
};
