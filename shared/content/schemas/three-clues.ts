import { GameType, type ContentSchema } from "../schema-types.ts";
import { field, issue, standardCapabilities } from "./shared.ts";

export const threeCluesContentSchema: ContentSchema = {
  gameType: GameType.THREE_CLUES,
  label: "Jogo das 3 Pistas",
  description: "Respostas bíblicas descobertas com até três pistas.",
  fields: [
    field("answer", "Resposta", "text", true, { minimum: 2, maximum: 100 }),
    field("clues", "Pistas", "list", true, { minimumItems: 3, maximumItems: 3 }),
  ],
  templates: [
    { id: "character", label: "Personagem", description: "Adivinhar um personagem.", values: { category: "Personagens" } },
    { id: "place", label: "Lugar", description: "Adivinhar um lugar.", values: { category: "Lugares" } },
    { id: "object", label: "Objeto", description: "Adivinhar um objeto.", values: { category: "Objetos" } },
    { id: "event", label: "Acontecimento", description: "Adivinhar um acontecimento.", values: { category: "Eventos" } },
  ],
  validation: payload => (Array.isArray(payload.clues) ? payload.clues : []).flatMap((clue, index) =>
    typeof clue !== "string" || !clue.trim()
      ? [issue(`clues.${index}`, "required", "A pista não pode ser vazia.")]
      : [],
  ),
  duplicateStrategy: {
    fields: ["answer", "clues"],
    buildParts: (_metadata, payload) => [String(payload.answer ?? ""), ...(Array.isArray(payload.clues) ? payload.clues.map(String) : [])],
  },
  importColumns: [],
  capabilities: standardCapabilities(),
};
