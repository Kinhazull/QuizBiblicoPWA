import { GameType, type ContentSchema } from "../schema-types.ts";
import { field, issue, objectArray, standardCapabilities } from "./shared.ts";

export const associationContentSchema: ContentSchema = {
  gameType: GameType.ASSOCIATION,
  label: "Associação de Temas",
  description: "Pares de conceitos bíblicos relacionados.",
  fields: [
    field("title", "Título", "text", true, { minimum: 3, maximum: 120 }),
    field("pairs", "Associações", "list", true, { minimumItems: 4, maximumItems: 8 }),
  ],
  templates: [
    { id: "character-event", label: "Personagem e acontecimento", description: "Liga personagens a acontecimentos.", values: { category: "Personagens" } },
    { id: "book-character", label: "Livro e personagem", description: "Liga livros a personagens.", values: { category: "Livros" } },
    { id: "place-event", label: "Lugar e acontecimento", description: "Liga lugares a acontecimentos.", values: { category: "Lugares" } },
  ],
  validation: payload => objectArray(payload.pairs).flatMap((pair, index) =>
    ["category", "left", "right"].flatMap(key =>
      typeof pair[key] !== "string" || !String(pair[key]).trim()
        ? [issue(`pairs.${index}.${key}`, "required", "Todos os lados da associação são obrigatórios.")]
        : [],
    ),
  ),
  duplicateStrategy: {
    fields: ["pairs.left", "pairs.right"],
    buildParts: (_metadata, payload) => objectArray(payload.pairs)
      .map(pair => `${String(pair.left ?? "")}:${String(pair.right ?? "")}`)
      .sort(),
  },
  importColumns: [],
  capabilities: standardCapabilities(),
};
