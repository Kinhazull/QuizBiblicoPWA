import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("modern game mode endpoints do not serialize unexpected error.message directly", () => {
  const files = [
    "functions/api/platform/free-play/generate.ts", "functions/api/platform/free-play/start.ts",
    "functions/api/platform/free-play/selection.ts", "functions/api/platform/free-play/action.ts",
    "functions/api/platform/daily-objectives/start.ts", "functions/api/platform/daily-objectives/action.ts",
    "functions/api/platform/daily-objectives/index.ts", "functions/_lib/daily-objective-api.ts",
    "functions/api/platform/events/action.ts", "functions/api/platform/events/[id]/selection.ts",
    "functions/api/platform/events/[id]/start.ts",
    "functions/api/admin/events.ts", "functions/api/admin/events/[id].ts",
    "functions/api/admin/events/[id]/cancel.ts", "functions/api/admin/events/[id]/schedule.ts",
    "functions/api/admin/events/[id]/validate.ts", "functions/api/admin/events/suggest-content.ts",
    "functions/api/platform/free-play/catalog-options.ts",
  ];
  for (const file of files) {
    const source = read(file);
    assert.equal(/json\s*\(\s*\{\s*error\s*:\s*error\s+instanceof\s+Error\s*\?\s*error\.message/.test(source), false, file);
    assert.match(source, /public(?:Domain)?Error/, file);
  }
});

test("observability contract declares every public category, support correlation and log-only alerts", () => {
  const source = read("functions/_lib/operational-observability.ts");
  for (const category of ["DOMAIN_ERROR", "VALIDATION_ERROR", "AUTHENTICATION_ERROR", "AUTHORIZATION_ERROR", "NOT_FOUND", "CONFLICT", "RATE_LIMITED", "DEPENDENCY_FAILURE", "INTERNAL_ERROR"]) assert.match(source, new RegExp(category));
  assert.match(source, /OperationalAlertSink/);
  assert.match(source, /logOnlyOperationalAlertSink/);
  assert.match(source, /supportId/);
});
