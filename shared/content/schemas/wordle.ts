import { GameType, type ContentSchema } from "../schema-types.ts";
import { EditorialCategory } from "../editorial-taxonomy.ts";
import { field, issue, standardCapabilities } from "./shared.ts";

export const wordleContentSchema: ContentSchema = {
  gameType: GameType.WORDLE,
  label: "Wordle Bíblico",
  description: "Palavras bíblicas descobertas por tentativas de letras.",
  fields: [
    field("word", "Palavra", "text", true, { minimum: 5, maximum: 7, placeholder: "Ex.: JOSUÉ" }),
    field("hint", "Dica", "textarea", false, { maximum: 240 }),
  ],
  templates: [
    { id: "character", label: "Personagem", description: "Nome de personagem bíblico.", values: { category: EditorialCategory.CHARACTERS } },
    { id: "place", label: "Lugar", description: "Lugar mencionado na Bíblia.", values: { category: EditorialCategory.PLACES } },
    { id: "concept", label: "Conceito", description: "Palavra ou conceito bíblico.", values: { category: EditorialCategory.CONCEPTS } },
  ],
  validation: payload => {
    const word = String(payload.word ?? "");
    const normalized = word.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]+$/u.test(word)) {
      return [issue("word", "invalid_characters", "A palavra deve conter somente letras, sem espaços ou hífens.")];
    }
    if (normalized.length < 5 || normalized.length > 7) {
      return [issue("word", "invalid_length", "A palavra deve possuir entre cinco e sete letras.")];
    }
    return [];
  },
  duplicateStrategy: { fields: ["word"], buildParts: (_metadata, payload) => [String(payload.word ?? "")] },
  importColumns: [],
  capabilities: standardCapabilities(),
};
