export const CORE_EVENT_TYPES = [
  "USER_REGISTERED", "USER_LOGGED_IN", "DAILY_LOGIN",
  "GAME_STARTED", "GAME_FINISHED", "QUESTION_ANSWERED",
  "XP_GRANTED", "LEVEL_UP", "ACHIEVEMENT_UNLOCKED",
  "MISSION_PROGRESS", "MISSION_COMPLETED", "MISSION_REWARD_CLAIMED", "REWARD_GRANTED",
] as const;

export type CoreEventType = (typeof CORE_EVENT_TYPES)[number];
export type CoreEventSourceKind = "auth" | "game" | "platform" | "integration";

type FieldRule = "string" | "boolean" | "positiveInteger" | "nonNegativeInteger";
type EventDefinition = {
  version: 1;
  sourceKind: CoreEventSourceKind;
  services: readonly string[];
  fields: Readonly<Record<string, FieldRule>>;
  optional?: readonly string[];
  enums?: Readonly<Record<string, readonly string[]>>;
};

const authServices = ["auth-service"] as const;
const gameServices = ["quiz-service", "quiz-attempt-service"] as const;

export const CORE_EVENT_CATALOG: Readonly<Record<CoreEventType, EventDefinition>> = {
  USER_REGISTERED: { version: 1, sourceKind: "auth", services: authServices, fields: { method: "string" }, enums: { method: ["invite", "admin"] } },
  USER_LOGGED_IN: { version: 1, sourceKind: "auth", services: authServices, fields: { persistent: "boolean" } },
  DAILY_LOGIN: { version: 1, sourceKind: "auth", services: authServices, fields: { windowKey: "string" } },
  GAME_STARTED: { version: 1, sourceKind: "game", services: gameServices, fields: { sessionType: "string" } },
  GAME_FINISHED: { version: 1, sourceKind: "game", services: gameServices, fields: { status: "string", score: "nonNegativeInteger" }, optional: ["score"], enums: { status: ["completed"] } },
  QUESTION_ANSWERED: { version: 1, sourceKind: "game", services: gameServices, fields: { correct: "boolean" } },
  XP_GRANTED: { version: 1, sourceKind: "platform", services: ["platform-progress"], fields: { amount: "positiveInteger", reason: "string" } },
  LEVEL_UP: { version: 1, sourceKind: "platform", services: ["platform-progress"], fields: { fromLevel: "positiveInteger", toLevel: "positiveInteger" } },
  ACHIEVEMENT_UNLOCKED: { version: 1, sourceKind: "platform", services: ["platform-achievements"], fields: { achievementCode: "string", scopeKey: "string" } },
  MISSION_PROGRESS: { version: 1, sourceKind: "platform", services: ["platform-missions"], fields: { assignmentId: "string", amount: "positiveInteger", progress: "nonNegativeInteger", target: "positiveInteger" } },
  MISSION_COMPLETED: { version: 1, sourceKind: "platform", services: ["platform-missions"], fields: { assignmentId: "string", missionCode: "string" } },
  MISSION_REWARD_CLAIMED: { version: 1, sourceKind: "platform", services: ["platform-missions"], fields: { assignmentId: "string" } },
  REWARD_GRANTED: { version: 1, sourceKind: "platform", services: ["reward-service"], fields: { rewardType: "string", amount: "positiveInteger" }, enums: { rewardType: ["xp", "coins"] } },
};

const PUBLISHED_GAME_IDS = new Set(["quiz-biblico"]);
const tokenPattern = /^[a-zA-Z0-9._:-]+$/;

function validString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 160;
}

export function validateCoreEventPayload(eventType: CoreEventType, version: number, payload: unknown) {
  const definition = CORE_EVENT_CATALOG[eventType];
  if (!definition || version !== definition.version) throw new Error("unsupported_event_contract");
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("invalid_event_payload");
  const record = payload as Record<string, unknown>;
  const allowed = new Set(Object.keys(definition.fields));
  if (Object.keys(record).some(key => !allowed.has(key))) throw new Error("unexpected_event_payload_field");
  const optional = new Set(definition.optional || []);
  for (const [field, rule] of Object.entries(definition.fields)) {
    const value = record[field];
    if (value === undefined && optional.has(field)) continue;
    const valid = rule === "string" ? validString(value)
      : rule === "boolean" ? typeof value === "boolean"
      : rule === "positiveInteger" ? Number.isSafeInteger(value) && Number(value) > 0
      : Number.isSafeInteger(value) && Number(value) >= 0;
    if (!valid) throw new Error(`invalid_event_payload_${field}`);
    const values = definition.enums?.[field];
    if (values && !values.includes(String(value))) throw new Error(`invalid_event_payload_${field}`);
  }
  if (eventType === "LEVEL_UP" && Number(record.toLevel) <= Number(record.fromLevel)) throw new Error("invalid_event_level_transition");
  return definition;
}

export function validateCoreEventProducer(eventType: CoreEventType, kind: CoreEventSourceKind, service: string, gameId?: string) {
  const definition = CORE_EVENT_CATALOG[eventType];
  if (!definition) throw new Error("unsupported_event_contract");
  if (definition.sourceKind !== kind || !definition.services.includes(service)) throw new Error("unauthorized_event_producer");
  if (!validString(service) || !tokenPattern.test(service)) throw new Error("invalid_event_source");
  if (kind === "game" && (!gameId || !PUBLISHED_GAME_IDS.has(gameId))) throw new Error("invalid_event_game");
  if (kind !== "game" && gameId) throw new Error("invalid_event_game");
}
