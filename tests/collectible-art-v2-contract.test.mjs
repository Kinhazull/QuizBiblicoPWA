import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(path, "utf8");
const functionalAvatars = ["avatar-scroll", "avatar-dove", "avatar-lion", "avatar-lamp", "avatar-fish", "avatar-olive", "avatar-ark", "avatar-crown"];
const functionalFrames = ["frame-bronze", "frame-silver", "frame-gold", "frame-olive", "frame-covenant", "frame-light", "frame-royal", "frame-celestial"];

test("central collectible registry covers exactly the 16 functional IDs", () => {
  const source = read("app/CollectibleArt.tsx");
  for (const id of [...functionalAvatars, ...functionalFrames]) {
    assert.match(source, new RegExp(`"${id}"`), `${id} missing from registry`);
    const folder = id.startsWith("avatar-") ? "avatars" : "frames";
    assert.equal(existsSync(`public/collectibles/runtime/${folder}/${id}-compact.png`), true);
    assert.equal(existsSync(`public/collectibles/runtime/${folder}/${id}-standard.png`), true);
  }
  for (const extra of ["avatar-shield", "avatar-star", "frame-diamond", "frame-platinum"]) {
    assert.doesNotMatch(source, new RegExp(`"${extra}"`), `${extra} must remain reserved`);
  }
  assert.match(source, /alias: "frame-aliance"/);
  assert.match(source, /alias: "frame-real"/);
});

test("participant surfaces resolve collectible art locally without changing API contracts", () => {
  for (const path of ["app/loja/page.tsx", "app/inventario/page.tsx", "app/recompensas/page.tsx"]) {
    assert.match(read(path), /CollectibleArt/);
  }
  const equipment = read("app/EquippedAvatar.tsx");
  assert.match(equipment, /CollectibleArt/);
  assert.match(equipment, /fallback/);
  assert.match(equipment, /frameId && \(collectibleArtRegistry\[frameId\] \|\| frame\?\.icon\)/);
});

test("visual adoption preserves Daily and Achievement collectible grants", () => {
  const collections = read("shared/platform-collections.ts");
  assert.match(collections, /dailyChallenge7: "avatar-lamp"/);
  assert.match(collections, /first_steps: "frame-light"/);
  const economy = read("shared/platform-economy.ts");
  for (const id of [...functionalAvatars, ...functionalFrames]) assert.match(economy, new RegExp(`id: "${id}"`));
});

test("runtime assets use explicit sizes, priority-aware loading and decorative alt text", () => {
  const source = read("app/CollectibleArt.tsx");
  assert.match(source, /width=\{size\}/);
  assert.match(source, /height=\{size\}/);
  assert.match(source, /loading=\{priority \? "eager" : "lazy"\}/);
  assert.match(source, /priority=\{priority\}/);
  assert.match(source, /alt=""/);
  assert.match(source, /onError=\{\(\) => setFailed\(true\)\}/);
});
