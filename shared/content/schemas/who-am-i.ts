import { GameType, type ContentSchema } from "../schema-types.ts";
import { field, issue, standardCapabilities } from "./shared.ts";

export const whoAmIContentSchema: ContentSchema = {
  gameType: GameType.WHO_AM_I,
  label: "Quem Sou Eu?",
  description: "Personagens bíblicos descobertos por dicas progressivas.",
  fields: [
    field("name", "Personagem", "text", true, { minimum: 2, maximum: 80 }),
    field("hints", "Dicas", "list", true, {
      minimumItems: 3,
      maximumItems: 8,
      itemField: field("hint", "Dica", "text", true),
    }),
    field("options", "Alternativas", "list", true, {
      minimumItems: 4,
      maximumItems: 6,
      itemField: field("option", "Alternativa", "text", true),
    }),
  ],
  templates: [
    { id: "old-testament", label: "Antigo Testamento", description: "Personagem do Antigo Testamento.", values: { category: "Antigo Testamento" } },
    { id: "new-testament", label: "Novo Testamento", description: "Personagem do Novo Testamento.", values: { category: "Novo Testamento" } },
    { id: "hidden-character", label: "Personagem especial", description: "Personagem para conteúdo especial.", values: { difficulty: "SPECIAL" } },
  ],
  validation: payload => {
    const hints = Array.isArray(payload.hints) ? payload.hints : [];
    const options = Array.isArray(payload.options) ? payload.options : [];
    const errors = [...hints.flatMap((hint, index) => typeof hint !== "string" || !hint.trim()
      ? [issue(`hints.${index}`, "required", "A dica não pode ser vazia.")] : [])];
    if (!options.some(option => String(option).normalize("NFKC").trim().toLocaleLowerCase("pt-BR") === String(payload.name ?? "").normalize("NFKC").trim().toLocaleLowerCase("pt-BR"))) {
      errors.push(issue("options", "missing_answer", "As alternativas devem incluir o personagem correto."));
    }
    return errors;
  },
  duplicateStrategy: {
    fields: ["name", "hints"],
    buildParts: (_metadata, payload) => [String(payload.name ?? ""), ...(Array.isArray(payload.hints) ? payload.hints.map(String) : [])],
  },
  importColumns: [],
  capabilities: standardCapabilities(),
};
