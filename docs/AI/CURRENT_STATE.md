# Estado operacional corrente

**Última atualização:** 09/08/2026
**Fonte oficial de verdade para o estado corrente:** este arquivo.
**Roadmap canônico:** `docs/PRODUCT/ROADMAP.md`.

Documentos de release, auditorias e arquivos em `docs/AI/HISTORY/` preservam contexto, mas não substituem este estado.

## Estado geral

A baseline local é **`2.0.0-rc.1`**, confirmada no `package.json`. Ela não é a release final, não significa aprovação pública e não possui tag `v2.0.0`. O desenvolvimento funcional foi reaberto antes do lançamento para reavaliar e concluir as Fases 6 e 7; a Fase 8 concentrará Release Readiness e o Go/No-Go.

As Fases 1–5 estão concluídas como fundação histórica. As Sprints **25.1–25.7** da Fase 6 estão concluídas. A Fase 7 possui a **Central Administrativa (26.1)**, a **Biblioteca Inteligente (26.2)** e o **Editor Visual de Eventos (26.3)** implementados localmente.

## Maturidade dos subsistemas

| Subsistema | Estado corrente |
|---|---|
| Plataforma participante | MADURO: Home, catálogo, Perfil 2.0, Recompensas, Loja, Inventário e Notificações existem; há deltas de UX/engajamento antes da release. |
| Jogos | MADURO: sete jogos integrados ao SDK e à conclusão da plataforma; qualidade e cobertura cartesiana continuam em evolução. |
| Modos | MADURO: `FREE_PLAY`, `DAILY` e `EVENT` usam seleção/participação persistida e regras próprias. Daily apresenta vitórias, derrotas e metas 3/7–7/7 com claim idempotente. |
| Core Platform | MADURO: Event Engine, Progress, Reward, Statistics, Achievements e Missions possuem persistência, idempotência e APIs de leitura. |
| CMS/editorial | MADURO LOCALMENTE: workflow DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED, comentários, histórico, rollback e importação JSON/CSV. A ativação remota depende da 0037. |
| Conteúdo | MADURO: Quiz universal e pacote modular oficial de 380 conteúdos; nenhuma alteração editorial foi feita na Sprint 25.0. |
| Biblioteca/Gerador/Loader | MADURO: fonte publicada, elegibilidade, geração e providers sustentam os sete jogos; a Biblioteca calcula sinais determinísticos de cobertura, diversidade, uso, reservas e projeção, sem alterar conteúdo automaticamente. |
| Eventos | V2 LOCAL: editor guiado em oito etapas sobre o Event Engine v1, com catálogo elegível, Asset Registry, revisão, revalidação concorrente, reservas e agendamento existentes. |
| Economia/coleção | V2 LOCAL: política centralizada, 16 cosméticos em duas coleções, progresso derivado, raridade/origem, 14 itens de Loja e dois grants determinísticos sobre os ledgers existentes. |
| Administração/Analytics | MADURO: a Central Administrativa resume atenção, Health operacional, uso do dia, Eventos, conteúdo, reservas e atividade auditada, com atalhos para os módulos especializados; Analytics e Diagnóstico continuam sendo as superfícies detalhadas. |
| Operação/privacidade | FUNCIONAL: contrato de schema, reconciliação, backup/restore, diagnóstico, observabilidade, exportação e anonimização abrangem os domínios atuais. |
| PWA/mobile | RC LOCAL: manifest e service worker revisados; validação pública e em Android físico permanece externa. |

## Estado técnico confirmado

- `main` é a linha integrada corrente.
- `package.json` declara `2.0.0-rc.1` e pnpm como package manager oficial.
- A migration `0037_editorial_governance_assets.sql` existe e foi validada localmente; **esta sprint não verificou nem presumiu seu estado remoto**.
- O Asset Registry usa metadados e URL HTTPS controlada; R2 não está configurado.
- CMS Universal permanece a fonte oficial de conteúdo publicado.
- Os sete jogos são Quiz, Wordle, Linha do Tempo, Memória, Associação, Quem Sou Eu e Três Pistas.
- O acervo modular oficial inventariado permanece em 380 conteúdos: 120 Wordle, 40 Timeline, 40 Memory, 60 Associação, 60 Quem Sou Eu e 60 Três Pistas.
- FREE_PLAY evita repetição recente quando o catálogo permite; DAILY é determinístico; EVENT usa reservas.
- O runtime participante do Quiz usa a cadeia universal; fallback de leitura/importação legado não integra o fluxo principal.
- Jornadas, ranking, medalhas e temporadas permanecem históricos, fora da navegação participante ativa.
- O Worker conserva o nome técnico `journey-awards` por decisão operacional, sem reintroduzir Jornada no produto.
- Permissões semânticas modernas preservam compatibilidade unidirecional com grants históricos.
- Erros públicos, supportId, logs, health e runbooks possuem contratos compartilhados.
- Analytics administrativos reutilizam fontes existentes, com isolamento organizacional e sem PII desnecessária.
- O PWA mantém operações de servidor como `ONLINE_REQUIRED` e não armazena `/api/*` em cache.
- Daily 2.0 usa estados visíveis AVAILABLE/WON/LOST/UNAVAILABLE; STARTED permanece apenas técnico e nunca oferece retomada na lista.
- Recompensas Daily oficiais são 30 XP + 5 moedas em 3/7 e 70 XP + 12 moedas em 7/7.
- Partidas FREE_PLAY continuam ilimitadas em jogo e XP, mas concedem no máximo 15 moedas por usuário, organização e dia local da organização; outras fontes econômicas não consomem esse orçamento.
- Os seis cosméticos-base preservam o total de 950 moedas; 14 dos 16 itens permanecem compráveis, enquanto Avatar Lâmpada e Moldura Luz têm grants determinísticos por Daily 7/7 e conquista `first_steps`.
- A área `/recompensas` apresenta duas coleções e as 14 conquistas oficiais sem criar uma API pública de concessão.
- O Perfil 2.0 compõe Progress, Statistics e Collections existentes; mostra os sete jogos, deriva o mais jogado por conclusões e usa apenas conquistas com timestamp real como feitos recentes.
- A saúde editorial da Biblioteca é calculada sob demanda com quatro consultas agregadas, thresholds explícitos e severidades `info`, `attention` e `critical`; baixo uso não é tratado como baixa qualidade.
- O Editor Visual de Eventos não expõe JSON/IDs arbitrários e não persiste um segundo modelo; criação e edição continuam usando os contratos, validações e reservas do Event Engine existente.

## Baseline de validação registrada

A Sprint 25.1 registrou: testes focados 19/19, `test:quick` 147/147, `test:all` 254/254, Playwright Daily desktop/mobile 4/4, Axe sem violações sérias/críticas, lint, typecheck/build com 64 páginas e `git diff --check` aprovados.

A Sprint 25.2 registrou: testes econômicos focados 56/56, integrações corrigidas 20/20, `test:quick` 147/147, `test:all` 254/254, Playwright completo 72 executados sem falhas, lint e build/typecheck com 64 páginas aprovados. Nenhuma migration ou operação remota foi realizada.

O fechamento conjunto das Sprints 25.2 e 25.3 registrou: testes focados 46/46, `test:quick` 147/147, `test:all` 258/258, Playwright relacionado 46/46 em desktop/mobile, lint e build/typecheck com 65 páginas aprovados. Nenhuma migration ou operação remota foi realizada.

A Sprint 25.4 registrou: testes focados 29/29, `test:quick` 147/147, `test:all` 258/258, Playwright relacionado 4/4 em desktop/mobile com Axe, lint e build/typecheck com 65 páginas aprovados. Nenhuma migration ou operação remota foi realizada.

## Fases seguintes

- **Fase 6 — Experiência e engajamento:** delta de Daily, economia, colecionáveis, Perfil e decisão de ranking universal.
- **Fase 7 — Administração e inteligência:** evolução dos dashboards, Biblioteca, Eventos, planejamento e Analytics já existentes.
- **Fase 8 — Release Readiness:** auditoria, UX, conteúdo, performance/segurança, Android/PWA pública, jurídico e Go/No-Go.

O detalhamento e a classificação das antigas sprints estão em `docs/PRODUCT/ROADMAP.md`.

## Riscos e dependências atuais

- promoção controlada da 0037 antes de ativação remota das estruturas editoriais/assets;
- restauração operacional deve ser exercitada em D1 isolado antes da release;
- R2 ainda não está configurado e URLs externas são solução transitória;
- Memória ainda depende de apresentação textual em vez de assets editoriais integrais;
- colecionáveis usam representações simples; arte final autoral/licenciada e expansão dos grants além de Daily 7/7 e `first_steps` exigem decisão posterior;
- matriz E2E centralizada dos sete jogos × modos não está completa;
- testes Android físico, teclado, background/bloqueio/encerramento, atualização entre deploys e maskable dependem de ambiente real;
- Web Vitals dependem do domínio público/CDN;
- licença dos textos bíblicos, privacidade/menores e Data Safety dependem de revisão humana/jurídica;
- domínio público, package ID e eventual TWA dependem de decisão do dono.

## Regras operacionais

- trabalho direto na `main` é permitido quando o proprietário autorizar explicitamente;
- autorização de edição não inclui automaticamente commit, push, deploy, migration ou tag;
- nenhuma tag `v2.0.0` será criada antes do Go/No-Go;
- ações remotas exigem autorização específica e o estado remoto não é inferido do estado local.
