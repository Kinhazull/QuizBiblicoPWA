import type { AppEnv } from "./auth";
import type { CoreEventConsumer, CorePlatformEvent } from "./platform-event-engine";
import { PLATFORM_MISSION_CATALOG, type PlatformMissionCatalogEntry } from "./platform-mission-catalog";
import { recordMissionProgress } from "./platform-missions";

export const MISSION_CONSUMER_ID = "platform-missions";
export const MISSION_CONSUMER_VERSION = 1;

/** READY_TO_CLAIM is persisted as `completed` until the additive mission schema evolves. */
export const READY_TO_CLAIM_PERSISTED_STATE = "completed" as const;

type GameFinishedV2Payload = {
  status: string;
  mode: string;
  correctAnswers: number;
  questionsAnswered: number;
  completedAt: number;
};

type ActiveMissionRow = {
  id: string;
  missionCode: string;
  target: number;
  gameId: string | null;
};

const missionById = new Map<string, PlatformMissionCatalogEntry>(
  PLATFORM_MISSION_CATALOG.map(mission => [mission.missionId, mission]),
);

function progressAmount(mission: PlatformMissionCatalogEntry, payload: GameFinishedV2Payload): number {
  switch (mission.target.metric) {
    case "officialGamesCompletedInWindow":
      return 1;
    case "questionsAnsweredInWindow":
      return payload.questionsAnswered;
    case "correctAnswersInWindow":
      return payload.correctAnswers;
    case "perfectGamesInWindow":
      return payload.questionsAnswered > 0 && payload.correctAnswers === payload.questionsAnswered ? 1 : 0;
    case "correctAnswersInSingleGame":
      return payload.correctAnswers >= mission.target.value ? mission.target.value : 0;
    default:
      // XP, level and active-day missions require their own authoritative events/projections.
      return 0;
  }
}

function appliesToGame(mission: PlatformMissionCatalogEntry, gameId: string): boolean {
  return mission.scope === "global" || mission.gameFilter.includes(gameId);
}

async function activeAssignments(env: AppEnv, event: CorePlatformEvent): Promise<ActiveMissionRow[]> {
  const rows = await env.DB.prepare(`SELECT m.id,m.mission_code missionCode,m.target,d.game_id gameId
    FROM user_platform_missions m
    JOIN platform_mission_definitions d ON d.id=m.definition_id
    WHERE m.user_id=?1 AND m.organization_id=?2 AND m.state='active'
      AND m.assigned_at<=?3 AND m.expires_at>?3
    ORDER BY m.assigned_at,m.id`).bind(event.userId, event.organizationId, event.occurredAt).all<ActiveMissionRow>();
  return rows.results || [];
}

export const platformMissionConsumer: CoreEventConsumer = {
  id: MISSION_CONSUMER_ID,
  handlerVersion: MISSION_CONSUMER_VERSION,
  eventTypes: ["GAME_FINISHED"],
  async handle(event: CorePlatformEvent, env) {
    if (event.version === 1) return;
    if (event.eventType !== "GAME_FINISHED" || event.version !== 2) throw new Error("unsupported_mission_event");
    const payload = event.payload as GameFinishedV2Payload;
    if (payload.status !== "completed" || payload.mode !== "official") return;
    const gameId = event.source.gameId;
    if (!gameId) throw new Error("invalid_mission_game");

    for (const assignment of await activeAssignments(env, event)) {
      const mission = missionById.get(assignment.missionCode);
      if (!mission || mission.target.value !== Number(assignment.target) || !appliesToGame(mission, gameId)) continue;
      if (mission.scope === "game" && assignment.gameId !== gameId) continue;
      const amount = progressAmount(mission, payload);
      if (amount <= 0) continue;
      await recordMissionProgress(env, {
        assignmentId: assignment.id,
        userId: event.userId,
        organizationId: event.organizationId,
        eventId: event.eventId,
        amount,
        now: payload.completedAt,
      });
    }
  },
};
