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

test("login and identity confirmation use the current platform visual contract", async () => {
  const [page, hardening] = await Promise.all([
    read("app/page.tsx"),
    read("app/experience-hardening.css"),
  ]);

  assert.match(page, /className="shell auth-screen"/);
  assert.match(page, /VERIFICAÇÃO EM DUAS ETAPAS/);
  assert.match(hardening, /\.auth-screen\s*\{[^}]*#07172a/s);
  assert.match(hardening, /\.auth-card\s*\{[^}]*#0b2037f2/s);
  assert.match(hardening, /\.auth-card h1 em\s*\{[^}]*#489cff/s);
  assert.match(hardening, /\.auth-card \.primary\s*\{[^}]*#3287e7/s);
  assert.match(hardening, /@media \(max-width: 520px\)[\s\S]*\.auth-card/s);
});

test("profile uses the unified platform surface and responsive account layout", async () => {
  const [page, privacy, hardening] = await Promise.all([
    read("app/perfil/page.tsx"),
    read("app/ProfilePrivacySections.tsx"),
    read("app/experience-hardening.css"),
  ]);

  assert.match(page, /className="profile-shell"/);
  assert.match(page, /className="profile-section profile-form" id="identidade"/);
  assert.match(privacy, /className="profile-section account-privacy-card"/);
  assert.match(hardening, /\.profile-shell\s*\{[^}]*min\(1120px/s);
  assert.match(hardening, /\.profile-form\s*\{[^}]*grid-template-columns:\s*repeat\(2/s);
  assert.match(hardening, /\.profile-section \.logout-button\s*\{[^}]*position:\s*static/s);
  assert.match(hardening, /@media \(max-width: 700px\)[\s\S]*\.profile-form\s*\{\s*grid-template-columns:\s*1fr/s);
});

test("shop and inventory constrain collectible art without covering card content", async () => {
  const [shop, inventory, styles] = await Promise.all([
    read("app/loja/page.tsx"),
    read("app/inventario/page.tsx"),
    read("app/loja/shop.module.css"),
  ]);

  assert.match(shop, /className={styles\.artStage}.*className={styles\.art}/);
  assert.match(inventory, /className={styles\.artStage}.*className={styles\.art}/);
  assert.match(styles, /\.artStage\{[^}]*overflow:hidden/s);
  assert.match(styles, /\.artStage :global\(\.collectible-art-frame\)\{[^}]*136px/s);
  assert.match(styles, /@media\(max-width:430px\)[\s\S]*grid-template-columns:96px minmax\(0,1fr\)/s);
  assert.doesNotMatch(shop, /className={styles\.icon}/);
  assert.doesNotMatch(inventory, /className={styles\.icon}/);
});

test("participant bottom navigation is centered and uses the current platform palette", async () => {
  const [navigation, hardening] = await Promise.all([
    read("app/LearningQuickNav.tsx"),
    read("app/experience-hardening.css"),
  ]);

  assert.match(navigation, /participant-bottom-nav platform-bottom-nav/);
  assert.match(hardening, /\.participant-bottom-nav\.platform-bottom-nav\s*\{[^}]*left:\s*50% !important/s);
  assert.match(hardening, /\.participant-bottom-nav\.platform-bottom-nav\s*\{[^}]*translateX\(-50%\) !important/s);
  assert.match(hardening, /background:\s*#09192cf5 !important/);
  assert.match(hardening, /a\.active\s*\{[^}]*#3287e7/s);
  assert.match(hardening, /@media \(max-width: 430px\)[\s\S]*width:\s*calc\(100vw - 16px\) !important/s);
});

test("mobile Home keeps identity, play art, chest and achievements compact", async () => {
  const [home, hardening] = await Promise.all([
    read("app/PlatformHome.tsx"),
    read("app/experience-hardening.css"),
  ]);

  assert.match(home, /\.slice\(0, 3\)/);
  assert.match(home, /gameModules\.slice\(0, 3\)/);
  assert.match(home, /aria-label="Abrir Inventário"/);
  assert.match(home, /aria-label="Abrir Loja"/);
  assert.match(hardening, /\.platform-level-line\s*\{[^}]*grid-template-columns:\s*auto minmax\(36px, 1fr\) auto/s);
  assert.match(hardening, /\.platform-chest-art\s*\{[^}]*width:\s*68px !important/s);
  assert.match(hardening, /\.platform-play-art \.game-artwork\s*\{[^}]*width:\s*42px/s);
  assert.match(hardening, /\.platform-achievement-grid article\s*\{[^}]*min-height:\s*62px/s);
});

test("global back action uses the platform palette and a consistent safe-edge position", async () => {
  const [component, games, hardening] = await Promise.all([
    read("app/BackNavigation.tsx"),
    read("app/games.css"),
    read("app/experience-hardening.css"),
  ]);

  assert.match(component, /className="global-back"/);
  assert.match(games, /body:has\(\.games-catalog-page\) \.global-back/);
  assert.match(hardening, /body:has\(\.games-catalog-page\) \.global-back\s*\{[^}]*left:\s*max\(14px, env\(safe-area-inset-left\)\) !important/s);
  assert.match(hardening, /\.global-back:active[\s\S]*background:\s*#1c5fa8 !important/s);
  assert.match(hardening, /\.global-back:hover[\s\S]*background:\s*#123453 !important/s);
  assert.doesNotMatch(hardening.slice(hardening.indexOf("/* Shared return action")), /#2d1d58/);
});

test("mobile game discovery uses compact two-column cards with contained artwork", async () => {
  const [catalog, daily, hardening] = await Promise.all([
    read("app/jogos/page.tsx"),
    read("app/desafios-diarios/page.tsx"),
    read("app/experience-hardening.css"),
  ]);

  assert.match(catalog, /className="games-catalog-grid"/);
  assert.match(daily, /className="daily-challenges-grid"/);
  assert.match(hardening, /@media \(max-width: 600px\)[\s\S]*\.games-catalog-grid,[\s\S]*\.daily-challenges-grid\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(hardening, /\.games-catalog-art > \.game-artwork > img\s*\{[^}]*object-fit:\s*contain/s);
  assert.match(hardening, /\.daily-game-art > img\s*\{[^}]*object-fit:\s*contain/s);
  assert.match(hardening, /@media \(max-width: 330px\)[\s\S]*grid-template-columns:\s*1fr/s);
});

test("individual games expose separated and visually explicit mobile actions", async () => {
  const [wordle, association, whoAmI, threeClues, hardening] = await Promise.all([
    read("app/wordle.css"), read("app/theme-association.css"), read("app/who-am-i.css"),
    read("app/three-clues.css"), read("app/experience-hardening.css"),
  ]);

  assert.match(wordle, /\.wordle-message \+ \.wordle-board\s*\{[^}]*margin-top/s);
  assert.match(association, /\.theme-association-column\{[^}]*grid-auto-rows:82px/s);
  assert.match(association, /\.theme-association-column button\{[^}]*height:82px/s);
  assert.match(whoAmI, /\.who-am-i-options\{[^}]*border:1px solid/s);
  assert.match(whoAmI, /\.who-am-i-options button\{[^}]*background:#1767cf/s);
  assert.match(threeClues, /\.three-clues-answer \{[^}]*border:1px solid/s);
  assert.match(hardening, /\.daily-celebration\s*\{[^}]*margin:\s*2px 0 12px/s);
});

test("every administrative route receives the current platform theme last", async () => {
  const [layout, theme] = await Promise.all([
    read("app/admin/layout.tsx"), read("app/admin-platform-theme.css"),
  ]);

  assert.match(layout, /import "\.\.\/admin-platform-theme\.css";\s*\n\s*export default/s);
  assert.match(theme, /body:has\(\.admin-shell\)[\s\S]*--brand-purple:\s*#3287e7/s);
  assert.match(theme, /\.admin-side-menu\s*\{[^}]*#081a2e/s);
  assert.match(theme, /\.admin-nav-group nav a\.active\s*\{[^}]*background:\s*#1767cf !important/s);
  assert.match(theme, /\.admin-shell\s*\{[^}]*background:\s*transparent !important/s);
  assert.match(theme, /\.admin-shell \.admin-title\s*\{[^}]*#0d2e4d/s);
  assert.doesNotMatch(theme, /#7047eb|#2a1760|#1b103c|#120a28/);
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
