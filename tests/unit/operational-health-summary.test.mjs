import assert from "node:assert/strict";
import test from "node:test";
import { summarizeOperationalHealth } from "../../functions/_lib/operational-health.ts";

const item = (status, code = status) => ({ status, code, description: "", value: null, checkedAt: 1, guidance: "" });

test("operational summary keeps conclusive health when optional telemetry is partial", () => {
  const summary = summarizeOperationalHealth({
    DATABASE: { status: "HEALTHY", checks: [item("HEALTHY")] },
    WORKER: { status: "UNKNOWN", checks: [item("UNKNOWN", "worker.cron_heartbeat_unavailable")] },
  });
  assert.deepEqual(summary, { status: "HEALTHY", partial: true });
});

test("operational summary preserves real degradation and full uncertainty", () => {
  assert.deepEqual(summarizeOperationalHealth({
    DATABASE: { status: "DEGRADED", checks: [item("DEGRADED")] },
    WORKER: { status: "UNKNOWN", checks: [item("UNKNOWN", "worker.cron_heartbeat_unavailable")] },
  }), { status: "DEGRADED", partial: true });
  assert.deepEqual(summarizeOperationalHealth({
    WORKER: { status: "UNKNOWN", checks: [item("UNKNOWN")] },
  }), { status: "UNKNOWN", partial: true });
  assert.deepEqual(summarizeOperationalHealth({
    DATABASE: { status: "HEALTHY", checks: [item("HEALTHY")] },
    CMS: { status: "UNKNOWN", checks: [item("UNKNOWN", "cms.unavailable")] },
  }), { status: "UNKNOWN", partial: true });
});
