import { GameType, type ContentSchema } from "../schema-types.ts";
import { EditorialCategory } from "../editorial-taxonomy.ts";
import { field, issue, objectArray, standardCapabilities } from "./shared.ts";

export const memoryContentSchema: ContentSchema = {
  gameType: GameType.MEMORY,
  label: "Memória Bíblica",
  description: "Conjuntos de pares bíblicos para o jogo da memória.",
  fields: [
    field("title", "Título do conjunto", "text", true, { minimum: 3, maximum: 120 }),
    field("pairs", "Pares", "list", true, {
      minimumItems: 3,
      maximumItems: 12,
      fields: [
        field("front", "Frente", "text", true),
        field("back", "Verso", "text", true),
      ],
    }),
  ],
  templates: [
    { id: "characters", label: "Personagens", description: "Pares de personagens e símbolos.", values: { category: EditorialCategory.CHARACTERS } },
    { id: "books", label: "Livros", description: "Pares relacionados a livros bíblicos.", values: { category: EditorialCategory.BOOKS } },
    { id: "symbols", label: "Símbolos", description: "Pares de símbolos e significados.", values: { category: EditorialCategory.SYMBOLS } },
  ],
  validation: payload => {
    const pairs = objectArray(payload.pairs);
    const errors = pairs.flatMap((pair, index) => [
      ...(typeof pair.front !== "string" || !pair.front.trim() ? [issue(`pairs.${index}.front`, "required", "A frente do par é obrigatória.")] : []),
      ...(typeof pair.back !== "string" || !pair.back.trim() ? [issue(`pairs.${index}.back`, "required", "O verso do par é obrigatório.")] : []),
    ]);
    const identities = pairs.map(pair => `${String(pair.front ?? "").trim().toLocaleLowerCase("pt-BR")}\u0000${String(pair.back ?? "").trim().toLocaleLowerCase("pt-BR")}`);
    if (new Set(identities).size !== identities.length) {
      errors.push(issue("pairs", "duplicate_pairs", "Os pares não podem ser duplicados."));
    }
    return errors;
  },
  duplicateStrategy: {
    fields: ["title", "pairs.front", "pairs.back"],
    buildParts: (_metadata, payload) => [
      String(payload.title ?? ""),
      ...objectArray(payload.pairs).map(pair => `${String(pair.front ?? "")}:${String(pair.back ?? "")}`).sort(),
    ],
  },
  importColumns: [],
  capabilities: standardCapabilities(),
};
