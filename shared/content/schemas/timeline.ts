import { GameType, type ContentSchema } from "../schema-types.ts";
import { field, issue, objectArray, standardCapabilities } from "./shared.ts";

export const timelineContentSchema: ContentSchema = {
  gameType: GameType.TIMELINE,
  label: "Linha do Tempo Bíblica",
  description: "Sequências cronológicas de acontecimentos bíblicos.",
  fields: [
    field("title", "Título", "text", true, { minimum: 3, maximum: 120 }),
    field("events", "Acontecimentos", "list", true, { minimumItems: 4, maximumItems: 8 }),
  ],
  templates: [
    { id: "biblical-event", label: "Evento bíblico", description: "Sequência geral de eventos.", values: { category: "Eventos" } },
    { id: "king", label: "Reis", description: "Sequência de reis bíblicos.", values: { category: "Reis" } },
    { id: "prophet", label: "Profetas", description: "Sequência de profetas e ministérios.", values: { category: "Profetas" } },
    { id: "missionary-journey", label: "Viagem missionária", description: "Etapas de uma viagem missionária.", values: { category: "Atos" } },
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
