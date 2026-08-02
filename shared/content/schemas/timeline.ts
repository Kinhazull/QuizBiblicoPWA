import { GameType, type ContentSchema } from "../schema-types.ts";
import { EditorialCategory } from "../editorial-taxonomy.ts";
import { field, issue, objectArray, standardCapabilities } from "./shared.ts";

export const timelineContentSchema: ContentSchema = {
  gameType: GameType.TIMELINE,
  label: "Linha do Tempo Bíblica",
  description: "Sequências cronológicas de acontecimentos bíblicos.",
  fields: [
    field("title", "Título", "text", true, { minimum: 3, maximum: 120 }),
    field("events", "Acontecimentos", "list", true, {
      minimumItems: 3,
      maximumItems: 8,
      fields: [
        field("title", "Acontecimento", "text", true),
        field("description", "Descrição curta", "textarea", false, { maximum: 240 }),
        field("position", "Posição cronológica", "number", true, { minimum: 1 }),
      ],
    }),
  ],
  templates: [
    { id: "biblical-event", label: "Evento bíblico", description: "Sequência geral de eventos.", values: { category: EditorialCategory.EVENTS } },
    { id: "king", label: "Reis", description: "Sequência de reis bíblicos.", values: { category: EditorialCategory.KINGS } },
    { id: "prophet", label: "Profetas", description: "Sequência de profetas e ministérios.", values: { category: EditorialCategory.PROPHETS } },
    { id: "missionary-journey", label: "Viagem missionária", description: "Etapas de uma viagem missionária.", values: { category: EditorialCategory.ACTS } },
  ],
  validation: payload => {
    const events = objectArray(payload.events);
    if (!events.length) return [];
    const positions = events.map(event => event.position);
    const errors = events.flatMap((event, index) => [
      ...(typeof event.title !== "string" || !event.title.trim() ? [issue(`events.${index}.title`, "required", "O acontecimento precisa de título.")] : []),
      ...(!Number.isInteger(event.position) || Number(event.position) < 1 ? [issue(`events.${index}.position`, "invalid_number", "A posição deve ser um inteiro positivo.")] : []),
    ]);
    if (new Set(positions).size !== positions.length) errors.push(issue("events", "duplicate_positions", "As posições cronológicas devem ser únicas."));
    const orderedPositions = [...positions].sort((left, right) => Number(left) - Number(right));
    if (!orderedPositions.every((position, index) => position === index + 1)) {
      errors.push(issue("events", "invalid_sequence", "As posições devem formar uma sequência contínua iniciando em 1."));
    }
    return errors;
  },
  duplicateStrategy: {
    fields: ["title", "events.title"],
    buildParts: (_metadata, payload) => [
      String(payload.title ?? ""),
      ...[...objectArray(payload.events)].sort((a, b) => Number(a.position) - Number(b.position)).map(event => String(event.title ?? "")),
    ],
  },
  importColumns: [],
  capabilities: standardCapabilities(),
};
