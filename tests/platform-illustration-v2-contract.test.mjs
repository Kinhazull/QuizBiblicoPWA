import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFileSync(resolve(root, path), "utf8");

test("Wave 5 registry adopts only illustrations backed by an existing runtime state", () => {
  const registry = read("app/PlatformIllustration.tsx");
  for (const id of ["offline", "empty-state", "error-state", "celebration", "default-event", "event-completed", "event-unavailable", "collection-complete", "ranking-podium"]) {
    assert.match(registry, new RegExp(`[\"']${id}[\"']`));
  }
  assert.doesNotMatch(registry, /level-up|achievement-unlocked/);
  assert.match(registry, /customUrl[\s\S]*platform-illustration-custom/);
});

test("system illustrations complement preserved accessible text and recovery actions", () => {
  const offline = read("public/offline.html");
  assert.match(offline, /offline-card\.png/);
  assert.match(offline, /Você está sem conexão/);
  assert.match(offline, /location\.reload\(\)/);
  assert.match(offline, /VOLTAR AO INÍCIO/);
  const events = read("app/eventos/page.tsx");
  assert.match(events, /id="error-state"/);
  assert.match(events, /Tentar novamente/);
  assert.match(events, /id="empty-state"/);
});

test("event and progression consumers preserve their existing state contracts", () => {
  assert.match(read("app/eventos/page.tsx"), /eventIllustration\(event\.status\).*customUrl=\{event\.coverUrl\}/s);
  assert.match(read("app/eventos/detalhes/page.tsx"), /id="event-unavailable"/);
  assert.match(read("app/PlatformHome.tsx"), /eventIllustration\(featuredEvent\.status\).*customUrl=\{featuredEvent\.coverUrl\}/s);
  assert.match(read("app/desafios-diarios/page.tsx"), /target === 7/);
  assert.match(read("app/desafios-diarios/page.tsx"), /id="celebration"/);
  assert.match(read("app/recompensas/page.tsx"), /collection\.progress\.status === "COMPLETE"/);
  assert.match(read("app/rankings/page.tsx"), /id="ranking-podium"/);
});
