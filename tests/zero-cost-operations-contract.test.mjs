import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const budget = JSON.parse(fs.readFileSync("config/zero-cost-operational-budget.json", "utf8"));
const document = fs.readFileSync("docs/PRODUCT/ZERO_COST_OPERATIONS.md", "utf8");

test("zero-cost budget keeps commercial limits external and thresholds canonical", () => {
  assert.deepEqual(budget.thresholdsPercent, { normalBelow: 50, observeAt: 50, attentionAt: 70, criticalAt: 85 });
  assert.ok(budget.resources.length >= 10);
  assert.equal(new Set(budget.resources.map(item => item.resource)).size, budget.resources.length);
  for (const item of budget.resources) {
    assert.equal(item.referenceBudget, null, `${item.resource} must be owner-configured`);
    assert.ok(["AUTOMATIC", "DERIVED", "MANUAL", "UNAVAILABLE"].includes(item.measurement));
    assert.ok(item.unit && item.source);
  }
});

test("canonical policy documents measured limits and safe degradation", () => {
  for (const text of [
    "ZERO-COST PLAUSIBLE, MEASUREMENT REQUIRED", "1.440", "MUST_KEEP", "AGGREGATE_THEN_RETIRE",
    "capacidade em usuários requer limites externos \\+ medição real", "FREE_PLAY", "Asset Registry",
  ]) assert.match(document, new RegExp(text));
});
