import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("participant Quiz runtime is universal and has no legacy fallback", () => {
  const play = read("app/jogar/page.tsx");
  const generate = read("functions/api/platform/free-play/generate.ts");
  const auth = read("functions/_lib/auth.ts");
  const providers = read("app/games/loader/providers.ts");
  for (const source of [play, generate, auth, providers]) {
    assert.doesNotMatch(source, /QUIZ_LEGACY_FALLBACK_ENABLED|LEGACY_READ_ONLY|legacy=1/);
  }
  assert.doesNotMatch(providers, /\/api\/rounds\/current/);
  assert.match(play, /loadGameContent/);
  assert.match(generate, /generateFreePlaySelection/);
  assert.doesNotMatch(generate, /question_bank|round_questions|FROM questions|JOIN questions/);
});

test("active navigation does not expose journey medals rankings seasons or dormant AI", () => {
  const navigation = read("app/navigation.tsx");
  const learning = read("app/LearningQuickNav.tsx");
  const dashboard = read("app/admin/page.tsx");
  assert.doesNotMatch(navigation, /href: "\/(?:jornada|rankings|medalhas|temporadas)"/);
  assert.doesNotMatch(navigation, /\/admin\/(?:rodadas|temporadas)/);
  assert.match(navigation, /\/admin\/calendario/);
  assert.doesNotMatch(navigation, /Sugestões com IA/);
  assert.doesNotMatch(dashboard, /\/admin\/rodadas|Jornadas cadastradas/);
  assert.match(learning, /platformHomeNavigation/);
});

test("scheduled runtime and participant APIs no longer create legacy medals or notices", () => {
  const worker = read("workers/journey-awards/index.ts");
  const badges = read("functions/api/badges.ts");
  const notifications = read("functions/api/notifications.ts");
  assert.doesNotMatch(worker, /processClosedRoundAwards|journey_awards/);
  assert.doesNotMatch(badges, /syncBadges|INSERT|UPDATE|DELETE/);
  assert.match(badges, /historical:true/);
  assert.doesNotMatch(notifications, /FROM rounds|user_badges|Medalha conquistada|Jornada/);
});
