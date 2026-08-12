import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("../docs/PRODUCT/ASSET_LICENSE_MANIFEST.json", import.meta.url), "utf8"));
const official = JSON.parse(await readFile(new URL("../content/official-base-content-v1.json", import.meta.url), "utf8"));
const allowedStatuses = new Set([
  "APPROVED_INTERNAL", "LICENSE_DOCUMENTED", "PENDING_HUMAN_REVIEW",
  "PROVISIONAL", "REPLACE_BEFORE_RELEASE", "POST_RELEASE_ONLY",
]);

test("release provenance manifest uses known statuses and references existing repository files", async () => {
  assert.equal(manifest.version, 1);
  assert.ok(manifest.entries.length >= 9);
  for (const entry of manifest.entries) {
    assert.ok(entry.id && entry.kind && entry.origin && entry.use && entry.evidence, entry.id);
    assert.ok(allowedStatuses.has(entry.status), `${entry.id}: ${entry.status}`);
    for (const path of entry.paths ?? [entry.path]) await access(new URL(path, root));
    await access(new URL(entry.evidence, root));
  }
});

test("biblical full-text sources remain explicitly unapproved for redistribution", () => {
  for (const id of ["bible-acf", "bible-almeida"]) {
    const entry = manifest.entries.find(item => item.id === id);
    assert.equal(entry?.status, "PENDING_HUMAN_REVIEW");
    assert.equal(entry?.license, null);
    assert.match(entry?.use, /fora do bundle\/runtime/i);
  }
});

test("official publishable pack contains no recovery or fixture identities", () => {
  const serialized = JSON.stringify(official).toLowerCase();
  for (const marker of ["recovery-org", "synthetic-user", "@example.com", "fixture-content", "lorem ipsum"]) {
    assert.equal(serialized.includes(marker), false, marker);
  }
  assert.equal(official.contents.length, 380);
});

test("provisional collectible art and post-release memory images remain explicit", () => {
  assert.equal(manifest.entries.find(item => item.id === "collectible-emoji-art")?.status, "REPLACE_BEFORE_RELEASE");
  assert.equal(manifest.entries.find(item => item.id === "memory-image-assets")?.status, "POST_RELEASE_ONLY");
});
