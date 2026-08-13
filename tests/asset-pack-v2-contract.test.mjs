import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(resolve(root, "docs/PRODUCT/ASSET_PACK_V2_MANIFEST.json"), "utf8"));
const collectibles = JSON.parse(readFileSync(resolve(root, "docs/PRODUCT/COLLECTIBLES_ASSET_PROVENANCE.json"), "utf8"));

test("asset pack manifest matches the repository bytes", () => {
  assert.equal(manifest.assets.length, 99);
  assert.equal(new Set(manifest.assets.map(item => item.path)).size, 99);
  for (const item of manifest.assets) {
    const path = resolve(root, item.path);
    assert.equal(existsSync(path), true, `${item.path} must exist`);
    const bytes = readFileSync(path);
    assert.equal(bytes.length, item.bytes, `${item.path} byte size`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256, `${item.path} sha256`);
  }
});

test("every public asset has one supported adoption classification", () => {
  const supported = new Set(["ADOPT_NOW", "FALLBACK", "EXTRA_RESERVED", "STORE_ONLY", "RETIRE_CANDIDATE"]);
  for (const item of manifest.assets) assert.equal(supported.has(item.classification), true, `${item.path} classification`);
  const counts = Object.groupBy(manifest.assets, item => item.classification);
  assert.equal(counts.ADOPT_NOW.length, 73);
  assert.equal(counts.FALLBACK.length, 3);
  assert.equal(counts.EXTRA_RESERVED.length, 10);
  assert.equal(counts.STORE_ONLY.length, 9);
  assert.equal(counts.RETIRE_CANDIDATE.length, 4);
});

test("collectible provenance preserves exact functional IDs and reserves extras", () => {
  assert.equal(collectibles.runtimeIntegrated, false);
  assert.equal(collectibles.items.length, 20);
  assert.equal(collectibles.items.filter(item => item.match === "EXACT").length, 14);
  assert.equal(collectibles.items.filter(item => item.classification === "EXTRA_RESERVED").length, 6);
  assert.deepEqual(
    collectibles.items.filter(item => item.candidateLogicalId).map(item => item.candidateLogicalId).sort(),
    ["frame-covenant", "frame-royal"],
  );
});
