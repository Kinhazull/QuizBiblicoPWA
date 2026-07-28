import { GameType, type ContentSchema } from "../schema-types.ts";
import { field, issue, objectArray, standardCapabilities } from "./shared.ts";

export const memoryContentSchema: ContentSchema = {
  gameType: GameType.MEMORY,
  label: "Memória Bíblica",
  description: "Conjuntos de pares bíblicos para o jogo da memória.",
  fields: [
    field("title", "Título do conjunto", "text", true, { minimum: 3, maximum: 120 }),
    field("pairs", "Pares", "list", true, { minimumItems: 4, maximumItems: 12 }),
  ],
  templates: [
    { id: "characters", label: "Personagens", description: "Pares de personagens e símbolos.", values: { category: "Personagens" } },
    { id: "books", label: "Livros", description: "Pares relacionados a livros bíblicos.", values: { category: "Livros" } },
    { id: "symbols", label: "Símbolos", description: "Pares de símbolos e significados.", values: { category: "Símbolos" } },
  ],
  validation: payload => objectArray(payload.pairs).flatMap((pair, index) => [
    ...(typeof pair.title !== "string" || !pair.title.trim() ? [issue(`pairs.${index}.title`, "required", "O par precisa de título.")] : []),
    ...(typeof pair.icon !== "string" || !pair.icon.trim() ? [issue(`pairs.${index}.icon`, "required", "O par precisa de ícone.")] : []),
  ]),
  duplicateStrategy: {
    fields: ["title", "pairs.title"],
    buildParts: (_metadata, payload) => [String(payload.title ?? ""), ...objectArray(payload.pairs).map(pair => String(pair.title ?? "")).sort()],
  },
  importColumns: [],
  capabilities: standardCapabilities(),
};
