import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("../docs/PRODUCT/ASSET_LICENSE_MANIFEST.json", import.meta.url), "utf8"));
const official = JSON.parse(await readFile(new URL("../content/official-base-content-v1.json", import.meta.url), "utf8"));
const allowedStatuses = new Set([
  "APPROVED_INTERNAL", "LICENSE_DOCUMENTED", "PENDING_HUMAN_REVIEW",
  "PROVISIONAL", "REPLACE_BEFORE_RELEASE", "POST_RELEASE_ONLY",
  "BLOCKED_FOR_REDISTRIBUTION", "REMOVED_FROM_ACTIVE_TREE",
]);

test("release provenance manifest uses known statuses and references existing repository files", async () => {
  assert.equal(manifest.version, 1);
  assert.ok(manifest.entries.length >= 9);
  for (const entry of manifest.entries) {
    assert.ok(entry.id && entry.kind && entry.origin && entry.use && entry.evidence, entry.id);
    assert.ok(allowedStatuses.has(entry.status), `${entry.id}: ${entry.status}`);
    if (!entry.removedFromActiveTree) {
      for (const path of entry.paths ?? [entry.path]) await access(new URL(path, root));
    }
    await access(new URL(entry.evidence, root));
  }
});

test("unapproved full-text biblical sources and derivatives stay outside the active tree", async () => {
  for (const path of [
    "bible-acf.json", "bible-almeida.json", "quiz_audit.json",
    "quiz_acf_reestruturado.json", "quiz_acf_homologacao.json",
    "quiz_acf_obpc_final.json",
  ]) {
    await assert.rejects(access(new URL(path, root)), { code: "ENOENT" });
  }
  assert.equal(manifest.entries.find(item => item.id === "bible-acf")?.status, "BLOCKED_FOR_REDISTRIBUTION");
  assert.equal(manifest.entries.find(item => item.id === "bible-almeida")?.status, "PENDING_HUMAN_REVIEW");
});

test("authored Quiz source and official platform content remain present", async () => {
  await access(new URL("Quiz.csv", root));
  await access(new URL("content/official-base-content-v1.json", root));
  assert.equal(official.contents.length, 380);
  assert.equal(manifest.entries.find(item => item.id === "quiz-universal-legacy-source")?.status, "APPROVED_INTERNAL");
  assert.equal(manifest.entries.find(item => item.id === "official-base-content-v1")?.aiAssisted, true);
  assert.equal(manifest.entries.find(item => item.id === "official-base-content-v1")?.humanCurated, true);
});

test("official publishable pack contains no recovery or fixture identities", () => {
  const serialized = JSON.stringify(official).toLowerCase();
  for (const marker of ["recovery-org", "synthetic-user", "@example.com", "fixture-content", "lorem ipsum"]) {
    assert.equal(serialized.includes(marker), false, marker);
  }
  assert.equal(official.contents.length, 380);
});

test("collectible art adoption and post-release memory images remain explicit", () => {
  assert.equal(manifest.entries.find(item => item.id === "collectible-emoji-art")?.status, "APPROVED_INTERNAL");
  assert.match(manifest.entries.find(item => item.id === "collectible-emoji-art")?.use || "", /Fallback/);
  assert.equal(manifest.entries.find(item => item.id === "memory-image-assets")?.status, "POST_RELEASE_ONLY");
});
