# Auditoria final do Asset Pack v2

## Wave 1 — Brand + PWA (adotada em 13/08/2026)

A identidade Brand v2 passou a ser consumida pelo runtime nas assinaturas da Home, autenticação, carregamento real, cabeçalhos compartilhados de participante e administração e telas de jogo que exibem a assinatura da plataforma. O componente compartilhado `BrandLogo` usa derivados locais leves e preserva dimensões explícitas, texto alternativo e proporção.

O PWA passou a usar exclusivamente `public/icons/icon-192.png`, `icon-512.png` e `icon-maskable-512.png`, derivados do `app-icon-master.png`. O favicon é `public/favicon.png`; o Apple Touch Icon foi regenerado em 180×180. O maskable usa canvas opaco azul de 512×512 e marca central de 320×320, mantendo a arte essencial dentro da área segura. O Service Worker pré-armazena apenas esses derivados públicos, o manifest e a página offline.

Os antigos `app-icon.svg`, `app-icon-192.png`, `app-icon-512.png` e `favicon.svg` não possuem consumidor de runtime e ficam classificados como `REPLACED_NOT_REFERENCED`/candidatos à retirada controlada. Nenhum arquivo antigo foi removido nesta Wave.

## Wave 2 — Artes dos sete jogos (adotada em 13/08/2026)

Os sete masters de `public/games/` permanecem preservados. O catálogo central `gameModules` passou a mapear cada ID funcional para um derivado determinístico `runtime/cover-card.png` de 420×420, mantendo o emoji anterior como fallback em caso de falha da imagem. A adoção cobre catálogo/Free Play, hub da Home, cards Daily, jogos de Evento e cards de jogos no Perfil.

Ranking e analytics permanecem textuais/compactos. O seletor administrativo de Evento reutiliza os metadados centrais, mas preserva o identificador compacto em vez de forçar capas em uma interface densa. As imagens são decorativas (`alt=""`), têm dimensões explícitas, carregamento lazy e não substituem nome ou CTA em HTML.

**Data:** 13/08/2026  
**Escopo:** arquivos gráficos reais de `public/`, identidade, jogos, recompensas, colecionáveis, Eventos, sistema, onboarding e Store  
**Manifesto técnico:** `ASSET_PACK_V2_MANIFEST.json`

## Resultado executivo

Foram encontrados **79 assets gráficos públicos**, somando **103.786.944 bytes (98,98 MiB)**. A contagem real do novo Asset Pack é **70 arquivos**, somando Brand v2, PWA v2, jogos, recompensas, colecionáveis, Eventos, ilustrações, onboarding e Store. Os nove restantes são quatro ícones antigos em uso, quatro SVGs antigos/genéricos e `favicon.svg`.

O pack está coerente visualmente com a identidade de balão/C, estrela/luz, azul, branco e dourado. Nenhum arquivo novo é consumido atualmente pelo runtime. A adoção pode ser incremental, mas precisa preservar HTML/CSS/componentes para interface, além de resolver os pontos de nomenclatura dos colecionáveis e validar variantes PWA.

## Inventário por diretório

| Diretório | Qtde. | Tamanho aproximado | Classificação principal |
|---|---:|---:|---|
| `public/brand/v2` | 9 | 11,74 MiB | `ADOPT_NOW` |
| `public/icons` | 3 | 771 KiB | `ADOPT_NOW` |
| `public/games` | 7 | 11,06 MiB | `ADOPT_NOW` |
| `public/rewards` | 8 | 9,54 MiB | `ADOPT_NOW` |
| `public/collectibles/v1/avatars` | 10 | 14,47 MiB | 8 `ADOPT_NOW`, 2 `EXTRA_RESERVED` |
| `public/collectibles/v1/frames` | 10 | 14,70 MiB | 6 `ADOPT_NOW`, 4 `EXTRA_RESERVED` |
| `public/events` | 3 | 4,27 MiB | `ADOPT_NOW` |
| `public/illustration` | 8 | 11,66 MiB | `ADOPT_NOW` |
| `public/onboarding` | 4 | 6,35 MiB | `EXTRA_RESERVED` |
| `public/store` | 9 | 16,23 MiB | `STORE_ONLY` |
| raiz de `public` | 8 | 109 KiB | 4 `FALLBACK`, 4 `RETIRE_CANDIDATE` |

Dimensões, formato, transparência, bytes e SHA-256 de cada arquivo constam no manifesto técnico. Todos os assets novos são PNG. Todos possuem transparência real, exceto `store/feature-graphic.png` e `store/QR.png`, que são RGB opacos. Os SVGs pertencem ao conjunto anterior.

## Classificação total

| Classificação | Quantidade | Conteúdo |
|---|---:|---|
| `ADOPT_NOW` | 52 | Brand v2, ícones v2, sete jogos, oito recompensas, três Eventos, oito ilustrações e 14 colecionáveis com nome/ID exato |
| `FALLBACK` | 4 | `app-icon.svg`, PNGs 192/512 e `apple-touch-icon.png` atuais |
| `EXTRA_RESERVED` | 10 | quatro imagens de onboarding e seis colecionáveis sem correspondência nominal exata |
| `STORE_ONLY` | 9 | ícone, feature graphic, banner, QR e cinco screenshots |
| `RETIRE_CANDIDATE` | 4 | `favicon.svg`, `file.svg`, `globe.svg`, `window.svg` |
| `REFERENCE_ONLY` | 5 fora de `public` | pranchas aprovadas/mockups em `assets/` |

## Brand v2 e PWA

| Finalidade | Arquivo indicado | Observação |
|---|---|---|
| fundo escuro | `logo-horizontal.png` / `logo-vertical.png` | lettering branco, validado sobre o fundo escuro real |
| fundo claro | `logo-horizontal-light.png` / `logo-vertical-light.png` | lettering azul, validado visualmente |
| símbolo isolado escuro/claro | `brand-symbol.png` / `brand-symbol-light.png` | nomes indicam variantes; uso final deve ser validado sobre fundos reais |
| splash | `splash-brand.png` | binariamente idêntico a `logo-vertical.png`; confirmar se duplicação intencional |
| app icon master | `app-icon-master.png` | 1024×1024, transparente |
| favicon master | `favicon-master.png` | idêntico ao app icon master; pode ser intencional, mas não é export favicon final |
| PWA any | `icons/icon-192.png`, `icons/icon-512.png` | dimensões corretas pelo nome |
| PWA maskable | `icons/icon-maskable-512.png` | derivado opaco com padding e área segura, validado por teste de pixels |

O runtime ainda aponta para `/app-icon-192.png`, `/app-icon-512.png`, `/app-icon.svg` e `/apple-touch-icon.png`. O Service Worker ainda pré-armazena `/app-icon.svg`. A próxima etapa deve alterar metadata, manifest, cache e testes de forma conjunta, sem reconstruir um ícone diferente durante deploy.

## Sete jogos

| Jogo / ID funcional | Asset | Estado atual | Consumidor futuro |
|---|---|---|---|
| Quiz / `quiz-biblico` | `games/quiz/cover-art.png` | emoji 📖 em `gameModules` | catálogo/Home/cards |
| Wordle / `wordle-biblico` | `games/wordle/cover-art.png` | emoji 🔤 | catálogo/Home/cards |
| Linha do Tempo / `linha-do-tempo-biblica` | `games/timeline/cover-art.png` | emoji ⏳ | catálogo/Home/cards |
| Memória / `memoria-biblica` | `games/memory/cover-art.png` | emoji 🧠 | catálogo/Home/cards |
| Associação / `associacao-de-temas` | `games/association/cover-art.png` | emoji 🔗 | catálogo/Home/cards |
| Quem Sou Eu / `quem-sou-eu` | `games/who-am-i/cover-art.png` | emoji ❓ | catálogo/Home/cards |
| Três Pistas / `jogo-tres-pistas` | `games/three-clues/cover-art.png` | emoji 🔎 | catálogo/Home/cards |

As capas são `ADOPT_NOW`. As telas, controles, HUD e estados dos jogos continuam em componentes.

## Recompensas

Os oito arquivos são `ADOPT_NOW`: `coin`, `xp`, `level`, `achievement`, `daily-challenge`, `chest-standard`, `chest-special` e `chest-daily`. Hoje moeda, XP, níveis, conquistas e desafios usam texto, CSS, SVG/Unicode ou emoji; os baús também não possuem consumidor gráfico oficial. Os assets devem entrar apenas como ilustração/ícone, sem incorporar valores nem modificar economia, ledger, grants ou progressão.

## Colecionáveis

### Correspondência nominal exata — `ADOPT_NOW`

- Avatares: `avatar-ark`, `avatar-crown`, `avatar-dove`, `avatar-fish`, `avatar-lamp`, `avatar-lion`, `avatar-olive`, `avatar-scroll`.
- Molduras: `frame-bronze`, `frame-silver`, `frame-gold`, `frame-olive`, `frame-light`, `frame-celestial`.

### `EXTRA_RESERVED`

- Sem ID funcional atual: `avatar-shield`, `avatar-star`, `frame-diamond`, `frame-platinum`.
- Possível correspondência sem nome 1:1: `frame-aliance` pode representar `frame-covenant`, e `frame-real` pode representar `frame-royal`. A semântica sugere relação, mas isso não é autorização para alterar IDs ou mapear automaticamente.

Consequentemente, **14 dos 16 IDs funcionais possuem arquivo nominalmente exato**. Os dois restantes precisam de confirmação ou renomeação controlada em etapa futura. O fallback atual dos 16 itens continua sendo o campo `icon` em emoji. Preços, raridades, grants, ownership, equipment, Daily e conquistas permanecem inalterados.

## Eventos, sistema e progressão

- Eventos: `default-event`, `event-completed` e `event-unavailable` são `ADOPT_NOW` para lista/detalhe/estados. O runtime ainda não os consome.
- Sistema: `empty-state`, `error-state` e `offline` são `ADOPT_NOW`; devem complementar mensagens e ações acessíveis, não substituí-las.
- `celebration` é `ADOPT_NOW` para resultado/feedback, com lazy loading.
- Progressão: `achievement-unlocked`, `collection-complete`, `level-up` e `ranking-podium` são `ADOPT_NOW`, preservando dados e componentes.

## Onboarding

Não foi localizado um fluxo funcional de onboarding do participante. `welcome`, `play`, `progress` e `participate` ficam `EXTRA_RESERVED`; sua existência não autoriza criar a funcionalidade.

## Store / Google Play

Os nove arquivos são `STORE_ONLY`. Dimensões observadas:

- `play-store-icon.png`: 1254×1254;
- `feature-graphic.png`: 1774×887;
- `banner.png`: 1672×941;
- `QR.png`: 1024×1536;
- screenshots: 941×1672 cada.

Os nomes não comprovam conformidade com requisitos vigentes da Google Play. Em especial, as dimensões observadas não devem ser declaradas conformes sem validação na etapa de publicação; QR e screenshots precisam de revisão visual/conteúdo final.

## Performance

O pack completo em `public` adiciona aproximadamente 98,9 MiB. Muitos PNGs de uso frequente têm 1–2,2 MiB e resolução entre 1083 e 2400 px, excessiva para cards/ícones móveis se enviados diretamente.

Maiores prioridades de otimização futura:

- `store/banner.png` — 2,64 MiB;
- `illustration/celebration.png` — 2,09 MiB;
- `collectibles/frame-celestial.png` — 2,10 MiB;
- `store/feature-graphic.png` — 2,00 MiB;
- `illustration/progression/ranking-podium.png` — 1,95 MiB;
- demais capas/colecionáveis geralmente entre 1,2 e 1,8 MiB.

Manter PNG master; gerar derivados WebP/AVIF ou tamanhos responsivos apenas em uma sprint de integração. Preload deve ficar restrito à marca crítica; jogos, recompensas, Eventos e ilustrações devem usar lazy loading conforme visibilidade.

## Duplicatas binárias

- `app-icon-master.png` = `favicon-master.png`;
- `logo-vertical.png` = `splash-brand.png`;
- `icon-512.png` = `icon-maskable-512.png`.

Isso economiza decisão artística, mas não comprova adequação específica a favicon, splash ou máscara. Não houve exclusão ou edição.

## Proveniência

O proprietário declarou que as novas artes foram produzidas especificamente para o Conte os Feitos com criação assistida por IA e seleção/edição/curadoria humana. O manifesto registra por arquivo caminho, hash, dimensão, formato, transparência, tamanho, origem, método, status de uso e classificação. A aprovação significa autorização interna/proveniência declarada; a adoção técnica continua pendente.

## Waves de adoção

1. **Wave 1 — Brand + PWA:** componente de marca, metadata, favicon, manifest, maskable, Service Worker e testes.
2. **Wave 2 — Jogos:** campo de asset no catálogo com fallback de emoji; cards e carregamento responsivo.
3. **Wave 3 — Recompensas:** moedas, XP, níveis, desafios e baús sem alterar contratos.
4. **Wave 4 — Colecionáveis:** confirmar dois aliases, adicionar `assetPath`, manter emoji como fallback e validar 16 IDs.
5. **Wave 5 — Sistema + Eventos + Progressão:** estados acessíveis e imagens lazy; fechar capa/Asset Registry/CSP separadamente.
6. **Wave 6 — Onboarding:** somente se o proprietário aprovar a funcionalidade futura.
7. **Wave 7 — Store/Google Play:** validar dimensões/requisitos atuais, textos, QR e capturas antes da publicação.

## Blockers para adoção

1. confirmar `frame-aliance` ↔ `frame-covenant` e `frame-real` ↔ `frame-royal`;
2. validar safe zone real do `icon-maskable-512`, hoje idêntico ao ícone comum;
3. decidir se duplicatas de favicon/splash são intencionais;
4. criar derivados de runtime sem destruir os PNGs master;
5. validar requisitos atuais da Store somente na publicação;
6. concluir testes visuais/mobile/acessibilidade em cada Wave.

Nenhum desses pontos exige alteração funcional nesta auditoria.
