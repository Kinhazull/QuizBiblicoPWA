import assert from "node:assert/strict";
import test from "node:test";
import {
  createAuthenticatedRequest,
  createSession,
  createTestDatabase,
  createValidRound,
  responseJson,
  seedOrganization,
  seedUser,
} from "../helpers/integration.mjs";
import { onRequestGet as health } from "../../functions/api/admin/health.ts";

test("legacy completed award marker is not reported as participant backlog", async t => {
  const ctx = createTestDatabase(); t.after(ctx.close); seedOrganization(ctx);
  seedUser(ctx, { id: "admin", role: "admin" });
  seedUser(ctx, { id: "participant" });
  const token = await createSession(ctx, "admin"), now = Date.now();
  createValidRound(ctx, { id: "legacy-round", createdBy: "admin", status: "closed", opensAt: now - 120_000, closesAt: now - 60_000 });
  ctx.raw.prepare("INSERT INTO attempts(id,user_id,round_id,attempt_number,mode,status,shuffle_seed,score,correct_answers,total_time_ms,max_streak,started_at,completed_at,question_order_json) VALUES('legacy-attempt','participant','legacy-round',1,'official','completed','seed',1000,5,10000,2,?1,?2,'[]')").run(now - 100_000, now - 70_000);
  ctx.raw.prepare("INSERT INTO round_award_processing(round_id,processed_at,participant_count) VALUES('legacy-round',?1,1)").run(now - 60_000);

  const response = await health({ request: createAuthenticatedRequest("https://test/api/admin/health", { token }), env: ctx.env });
  assert.equal(response.status, 200);
  const data = await responseJson(response);
  assert.equal(data.awardProcessing.backlog, 0);
  assert.equal(data.awardProcessing.overdue, 0);
  assert.equal(data.checks.find(check => check.name === "awardProcessing").ok, true);
});
