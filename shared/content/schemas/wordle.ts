import { GameType, type ContentSchema } from "../schema-types.ts";
import { field, issue, standardCapabilities } from "./shared.ts";

export const wordleContentSchema: ContentSchema = {
  gameType: GameType.WORDLE,
  label: "Wordle Bíblico",
  description: "Palavras bíblicas descobertas por tentativas de letras.",
  fields: [
    field("word", "Palavra", "text", true, { minimum: 4, maximum: 12, placeholder: "Ex.: GRAÇA" }),
    field("hint", "Dica", "textarea", false, { maximum: 240 }),
  ],
  templates: [
    { id: "character", label: "Personagem", description: "Nome de personagem bíblico.", values: { category: "Personagens" } },
    { id: "place", label: "Lugar", description: "Lugar mencionado na Bíblia.", values: { category: "Lugares" } },
    { id: "concept", label: "Conceito", description: "Palavra ou conceito bíblico.", values: { category: "Conceitos" } },
  ],
  validation: payload => /^[\p{L}]+$/u.test(String(payload.word ?? ""))
    ? []
    : [issue("word", "invalid_characters", "A palavra deve conter somente letras.")],
  duplicateStrategy: { fields: ["word"], buildParts: (_metadata, payload) => [String(payload.word ?? "")] },
  importColumns: [],
  capabilities: standardCapabilities(),
};
