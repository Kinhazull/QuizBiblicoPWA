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
  assert.equal(manifest.runtimeDerivatives.length, 32);
  assert.equal(manifest.runtimeDerivativeDefaults.approval, "ADOPTED_WAVE_4");
  assert.equal(manifest.runtimeDerivativeDefaults.classification, "ADOPT_NOW");
  assert.equal(new Set(manifest.runtimeDerivatives.map(item => item.path)).size, 32);
  for (const item of manifest.runtimeDerivatives) {
    const path = resolve(root, item.path);
    assert.equal(existsSync(path), true, `${item.path} must exist`);
    const bytes = readFileSync(path);
    assert.equal(bytes.length, item.bytes, `${item.path} byte size`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256, `${item.path} sha256`);
    assert.deepEqual([item.width, item.height], item.variant === "compact" ? [96, 96] : [320, 320]);
  }
  assert.equal(manifest.platformIllustrationDerivatives.length, 9);
  assert.equal(manifest.platformIllustrationDerivativeDefaults.approval, "ADOPTED_WAVE_5");
  for (const item of manifest.platformIllustrationDerivatives) {
    const path = resolve(root, item.path);
    assert.equal(existsSync(path), true, `${item.path} must exist`);
    const bytes = readFileSync(path);
    assert.equal(bytes.length, item.bytes, `${item.path} byte size`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256, `${item.path} sha256`);
  }
  assert.equal(manifest.wave5Adoption.filter(item => item.status === "ADOPTED_RUNTIME").length, 9);
  assert.deepEqual(manifest.wave5Adoption.filter(item => item.status === "EXTRA_RESERVED").map(item => item.logicalId).sort(), ["achievement-unlocked", "level-up"]);
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
  assert.equal(collectibles.runtimeIntegrated, true);
  assert.equal(collectibles.items.length, 20);
  assert.equal(collectibles.items.filter(item => item.match === "EXACT").length, 14);
  assert.equal(collectibles.items.filter(item => item.match === "VISUAL_ALIAS").length, 2);
  assert.equal(collectibles.items.filter(item => item.classification === "EXTRA_RESERVED").length, 4);
  assert.deepEqual(
    collectibles.items.filter(item => item.visualAlias).map(item => [item.logicalId, item.visualAlias]).sort(),
    [["frame-covenant", "frame-aliance"], ["frame-royal", "frame-real"]],
  );
});

test("Wave 7 audits every Store asset without claiming Google Play readiness", () => {
  assert.equal(manifest.wave6Decision.status, "POST_RELEASE");
  assert.deepEqual(manifest.wave6Decision.assets, ["welcome", "play", "progress", "participate"]);
  assert.equal(manifest.wave7StoreAudit.status, "DONE");
  assert.equal(manifest.wave7StoreAudit.scope, "ASSET_PACK_AUDITED_NOT_GOOGLE_PLAY_READY");
  assert.equal(manifest.wave7StoreAudit.items.length, 9);
  assert.equal(new Set(manifest.wave7StoreAudit.items.map(item => item.path)).size, 9);
  const storeAssets = manifest.assets.filter(item => item.classification === "STORE_ONLY");
  assert.deepEqual(manifest.wave7StoreAudit.items.map(item => item.path).sort(), storeAssets.map(item => item.path).sort());
  assert.equal(storeAssets.reduce((sum, item) => sum + item.bytes, 0), manifest.wave7StoreAudit.totalBytes);
  assert.equal(manifest.wave7StoreAudit.items.some(item => item.state === "READY_ASSET"), false);
  assert.equal(manifest.wave7StoreAudit.items.filter(item => item.state === "NEEDS_RECAPTURE_AFTER_RC").length, 5);
});
