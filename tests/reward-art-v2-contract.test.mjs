import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const compact = ["coin", "xp", "level", "achievement", "daily-challenge"];
const cards = ["achievement", "daily-challenge", "chest-standard", "chest-special", "chest-daily"];

test("reward registry maps all eight official masters and fallbacks", async () => {
  const source = await readFile(new URL("app/RewardArt.tsx", root), "utf8");
  for (const id of [...compact, "chest-standard", "chest-special", "chest-daily"]) {
    assert.match(source, new RegExp(`(?:"${id}"|${id}): \\{`));
    assert.match(source, new RegExp(`/rewards/${id}\\.png`));
  }
  assert.match(source, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(source, /loading=\{eager \? "eager" : "lazy"\}/);
});

test("reward runtime derivatives are deterministic lightweight categories", async () => {
  for (const [kind, ids, size] of [["compact", compact, 96], ["card", cards, 320]]) {
    for (const id of ids) {
      const runtime = new URL(`public/rewards/runtime/${id}-${kind}.png`, root);
      await access(runtime);
      const runtimeBytes = (await stat(runtime)).size;
      const masterBytes = (await stat(new URL(`public/rewards/${id}.png`, root))).size;
      assert.ok(runtimeBytes < masterBytes * 0.25, `${id}-${kind} is not lightweight`);
      const manifest = JSON.parse(await readFile(new URL("docs/PRODUCT/ASSET_PACK_V2_MANIFEST.json", root), "utf8"));
      const entry = manifest.assets.find(item => item.path === `public/rewards/runtime/${id}-${kind}.png`);
      assert.equal(entry?.width, size);
      assert.equal(entry?.height, size);
    }
  }
});

test("participant reward surfaces consume RewardArt without changing APIs", async () => {
  for (const file of ["app/PlatformHome.tsx", "app/perfil/PlatformProfileOverview.tsx", "app/loja/page.tsx", "app/recompensas/page.tsx", "app/desafios-diarios/page.tsx", "app/eventos/detalhes/page.tsx"]) {
    assert.match(await readFile(new URL(file, root), "utf8"), /RewardArt/);
  }
  const admin = await readFile(new URL("app/admin/analytics/page.tsx", root), "utf8");
  assert.doesNotMatch(admin, /RewardArt/);
});
