import { GameType, type ContentSchema } from "../schema-types.ts";
import { EditorialCategory } from "../editorial-taxonomy.ts";
import { field, issue, objectArray, standardCapabilities } from "./shared.ts";

export const associationContentSchema: ContentSchema = {
  gameType: GameType.ASSOCIATION,
  label: "Associação de Temas",
  description: "Pares de conceitos bíblicos relacionados.",
  fields: [
    field("title", "Título", "text", true, { minimum: 3, maximum: 120 }),
    field("pairs", "Associações", "list", true, {
      minimumItems: 3,
      maximumItems: 10,
      fields: [
        field("left", "Item A", "text", true),
        field("right", "Item B", "text", true),
      ],
    }),
  ],
  templates: [
    { id: "character-event", label: "Personagem e acontecimento", description: "Liga personagens a acontecimentos.", values: { category: EditorialCategory.CHARACTERS } },
    { id: "book-character", label: "Livro e personagem", description: "Liga livros a personagens.", values: { category: EditorialCategory.BOOKS } },
    { id: "place-event", label: "Lugar e acontecimento", description: "Liga lugares a acontecimentos.", values: { category: EditorialCategory.PLACES } },
  ],
  validation: payload => {
    const pairs = objectArray(payload.pairs);
    const errors = pairs.flatMap((pair, index) =>
      ["left", "right"].flatMap(key =>
      typeof pair[key] !== "string" || !String(pair[key]).trim()
        ? [issue(`pairs.${index}.${key}`, "required", "Todos os lados da associação são obrigatórios.")]
        : [],
      ),
    );
    const normalized = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase("pt-BR");
    const left = pairs.map(pair => normalized(pair.left)).filter(Boolean);
    const right = pairs.map(pair => normalized(pair.right)).filter(Boolean);
    if (new Set(left).size !== left.length) {
      errors.push(issue("pairs", "duplicate_left_items", "Os itens A não podem se repetir."));
    }
    if (new Set(right).size !== right.length) {
      errors.push(issue("pairs", "duplicate_right_items", "Os itens B não podem se repetir."));
    }
    return errors;
  },
  duplicateStrategy: {
    fields: ["pairs.left", "pairs.right"],
    buildParts: (_metadata, payload) => objectArray(payload.pairs)
      .map(pair => `${String(pair.left ?? "")}:${String(pair.right ?? "")}`)
      .sort(),
  },
  importColumns: [],
  capabilities: standardCapabilities(),
};
