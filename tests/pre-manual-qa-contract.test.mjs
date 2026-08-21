import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("asset pack uses a shared visual sizing and contrast contract", async () => {
  const [layout, contract] = await Promise.all([read("app/layout.tsx"), read("app/asset-visual-contract.css")]);
  assert.match(layout, /asset-visual-contract\.css/);
  assert.match(contract, /\.game-artwork/);
  assert.match(contract, /\.collectible-art/);
  assert.match(contract, /\.reward-art/);
  assert.match(contract, /object-fit:contain/);
  assert.match(contract, /equipped-avatar-frame/);
});

test("mobile experience hardening is the final visual consistency layer", async () => {
  const [layout, styles, recovery, analytics, rewards] = await Promise.all([
    read("app/layout.tsx"),
    read("app/experience-hardening.css"),
    read("app/recuperar-conta/page.tsx"),
    read("app/admin/analytics/page.tsx"),
    read("app/recompensas/collections.module.css"),
  ]);
  assert.match(layout, /experience-hardening\.css/);
  assert.ok(layout.indexOf("experience-hardening.css") > layout.indexOf("brand-system.css"));
  assert.match(styles, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /min-height:\s*44px/);
  assert.match(styles, /body:has\(\.profile-shell\)/);
  assert.doesNotMatch(recovery, /Voltar ao login/);
  assert.match(analytics, /Dados em preparação:/);
  assert.doesNotMatch(analytics, /Conclusão integral do Evento ainda não possui projeção própria confiável/);
  assert.match(rewards, /width:28px;height:28px/);
  assert.match(rewards, /width:48px;height:48px/);
});

test("profile, MFA and account recovery expose distinct current states", async () => {
  const [profile, mfa] = await Promise.all([read("app/perfil/page.tsx"), read("app/configurar-mfa/page.tsx")]);
  assert.match(profile, /mfaStatus === "active"/);
  assert.match(profile, /Códigos de recuperação da conta/);
  assert.match(profile, /diferentes dos códigos de recuperação do MFA/);
  assert.match(mfa, /O MFA está ativo/);
});

test("above-the-fold equipped identity eagerly loads its compact art", async () => {
  const [avatar, art] = await Promise.all([read("app/EquippedAvatar.tsx"), read("app/CollectibleArt.tsx")]);
  assert.match(avatar, /variant="compact" priority/);
  assert.match(art, /loading={priority \? "eager" : "lazy"}/);
  assert.match(art, /priority={priority}/);
});

test("administrative member filters and actions have explicit accessible names", async () => {
  const members = await read("app/admin/membros/page.tsx");
  assert.match(members, /aria-label="Pesquisar membros por nome ou usuário"/);
  assert.match(members, /aria-label="Filtrar membros por situação"/);
  assert.match(members, /aria-label={`Selecionar \$\{user\.displayName\}`}/);
  assert.match(members, /aria-label={`Remover \$\{user\.displayName\}`}/);
});

test("universal editor does not announce validation errors before user intent", async () => {
  const editor = await read("app/admin/conteudo/editor/UniversalContentEditor.tsx");
  assert.match(editor, /errors={manualValidation \? validation\.errors : \[\]}/);
  assert.match(editor, /setManualValidation\(true\)/);
  assert.match(editor, /pendências serão exibidas quando você validar, salvar ou publicar/i);
});

test("legacy writable surfaces are redirected to their universal replacements", async () => {
  const redirects = await read("app/LegacyRouteRedirects.tsx");
  for (const route of ["/admin/perguntas/base", "/admin/perguntas/importar", "/admin/rodadas", "/admin/temporadas", "/temporadas", "/revisao-inteligente"]) assert.match(redirects, new RegExp(route.replaceAll("/", "\\/")));
  assert.match(redirects, /\/admin\/conteudo\/acervo/);
  assert.match(redirects, /\/admin\/eventos/);
});

test("game result communicates score and asynchronous platform reconciliation", async () => {
  const [completion, result] = await Promise.all([read("app/games/sdk/platformCompletion.ts"), read("app/games/sdk/GameResult.tsx")]);
  assert.match(completion, /platform-game-result-recorded/);
  assert.match(completion, /sessionStorage\.setItem/);
  assert.match(result, /XP, moedas e objetivos atualizados/);
  assert.match(result, /Atualizando XP, moedas e objetivos/);
});

test("operational health ignores expired historical participations", async () => {
  const health = await read("functions/_lib/operational-health.ts");
  assert.match(health, /JOIN generated_game_selections selection/);
  assert.match(health, /selection\.expires_at>\?3/);
  assert.match(health, /Participações ativas permanecem STARTED/);
});

test("game loading messages are specific and participant-facing", async () => {
  const sources = await Promise.all([
    read("app/games/wordle/WordleGame.tsx"), read("app/games/memory/MemoryGame.tsx"),
    read("app/games/timeline/TimelineGame.tsx"), read("app/games/theme-association/ThemeAssociationGame.tsx"),
    read("app/games/who-am-i/WhoAmIGame.tsx"), read("app/games/three-clues/ThreeCluesGame.tsx"),
  ]);
  assert.match(sources[0], /Selecionando uma palavra publicada/);
  assert.match(sources[1], /Embaralhando as cartas/);
  assert.match(sources[2], /Montando a sequência de acontecimentos/);
  assert.match(sources[3], /Embaralhando referências e relações/);
  assert.match(sources[4], /Preparando as fichas dos personagens/);
  assert.match(sources[5], /Selecionando os desafios e preparando as pistas/);
});
