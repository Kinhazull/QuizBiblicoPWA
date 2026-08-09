import test from "node:test";
import assert from "node:assert/strict";
import { selectHomeEngagementAction } from "../../app/platform-engagement.ts";

const objective = (state = "AVAILABLE") => ({ gameType: "wordle-biblico", state });
const daily = (overrides = {}) => ({
  dayKey: "2026-08-09", timeZone: "UTC", wins: 0, played: 0, unavailable: 0, total: 7,
  objectives: [objective()], rewards: [{ target: 3, state: "LOCKED", reward: { xp: 30, coins: 5, label: "+30 XP e +5 moedas" } }], ...overrides,
});
const retention = (chest = { unlocked: false, opened: false }) => ({ streak: 1, chest: { preview: { label: "+20 XP" }, ...chest } });

test("Home engagement priority is deterministic across reward, progress, chest, event and new Daily", () => {
  const event = { id: "event-1", title: "Evento", description: "Participe", status: "ACTIVE" };
  assert.equal(selectHomeEngagementAction(daily({ rewards: [{ target: 7, state: "READY", reward: { label: "+70 XP" } }] }), retention({ unlocked: true, opened: false }), [event]).kind, "DAILY_REWARD");
  assert.equal(selectHomeEngagementAction(daily({ played: 2 }), retention({ unlocked: true, opened: false }), [event]).kind, "DAILY_PROGRESS");
  assert.equal(selectHomeEngagementAction(daily({ objectives: [] }), retention({ unlocked: true, opened: false }), [event]).kind, "CHEST");
  assert.equal(selectHomeEngagementAction(daily({ objectives: [] }), retention(), [event]).kind, "ACTIVE_EVENT");
  assert.equal(selectHomeEngagementAction(daily(), retention(), [event]).kind, "ACTIVE_EVENT");
  assert.equal(selectHomeEngagementAction(daily(), retention(), []).kind, "DAILY_NEW");
});

test("Home does not duplicate the featured event selected as primary action", () => {
  const action = selectHomeEngagementAction(null, null, [{ id: "event-2", title: "Evento", description: "Participe", status: "SCHEDULED" }]);
  assert.equal(action.kind, "UPCOMING_EVENT");
  assert.equal(action.eventId, "event-2");
  assert.match(action.href, /eventos\/detalhes/);
});
