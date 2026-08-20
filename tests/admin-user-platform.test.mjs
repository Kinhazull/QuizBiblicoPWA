import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("members loads platform details only after explicit selection", () => {
  const page = read("app/admin/membros/page.tsx");
  const panel = read("app/admin/membros/PlatformUserDetails.tsx");
  assert.match(page, /Ver dados/);
  assert.match(page, /setPlatformUser\(user\)/);
  assert.match(page, /aria-label={`Ver dados da plataforma de \$\{user\.displayName\}`}/);
  assert.doesNotMatch(page, /\/platform`,\s*\{\s*cache:/);
  assert.match(panel, /fetch\(`\/api\/admin\/users\/\$\{encodeURIComponent\(userId\)\}\/platform`/);
  assert.match(panel, /cache: "no-store"/);
});

test("platform user panel exposes accessible loading, error, regions and close control", () => {
  const panel = read("app/admin/membros/PlatformUserDetails.tsx");
  const css = read("app/admin/membros/PlatformUserDetails.module.css");
  assert.match(panel, /aria-labelledby="platform-user-title"/);
  assert.match(panel, /aria-label="Fechar dados da plataforma"/);
  assert.match(panel, /role="status"/);
  assert.match(panel, /role="alert"/);
  assert.match(panel, /Nenhuma atividade por jogo/);
  assert.match(panel, /Nenhuma conquista desbloqueada/);
  assert.match(panel, /Nenhum item adquirido/);
  assert.match(panel, /id="platform-missions">Missões/);
  assert.match(panel, /Missão diária/);
  assert.match(panel, /Missão semanal/);
  assert.match(panel, /id="platform-retention">Retenção/);
  assert.match(panel, /Sequência atual/);
  assert.match(panel, /id="platform-daily-chest">Cofre diário/);
  assert.match(panel, /Última recompensa/);
  assert.match(css, /width: min\(680px, 100%\)/);
  assert.match(css, /@media \(max-width: 540px\)/);
});
