# Estado operacional corrente

**Última atualização:** 09/08/2026
**Fonte oficial de verdade para o estado corrente:** este arquivo.
**Roadmap canônico:** `docs/PRODUCT/ROADMAP.md`.

Documentos de release, auditorias e arquivos em `docs/AI/HISTORY/` preservam contexto, mas não substituem este estado.

## Estado geral

A baseline local é **`2.0.0-rc.1`**, confirmada no `package.json`. Ela não é a release final, não significa aprovação pública e não possui tag `v2.0.0`. O desenvolvimento funcional foi reaberto antes do lançamento para reavaliar e concluir as Fases 6 e 7; a Fase 8 concentrará Release Readiness e o Go/No-Go.

As Fases 1–5 estão concluídas como fundação histórica. A sprint corrente é **25.0 — Sincronização do estado, roadmap e baseline da v2**.

## Maturidade dos subsistemas

| Subsistema | Estado corrente |
|---|---|
| Plataforma participante | MADURO: Home, catálogo, Perfil, Recompensas, Loja, Inventário e Notificações existem; há deltas de UX/engajamento antes da release. |
| Jogos | MADURO: sete jogos integrados ao SDK e à conclusão da plataforma; qualidade e cobertura cartesiana continuam em evolução. |
| Modos | MADURO: `FREE_PLAY`, `DAILY` e `EVENT` usam seleção/participação persistida e regras próprias. |
| Core Platform | MADURO: Event Engine, Progress, Reward, Statistics, Achievements e Missions possuem persistência, idempotência e APIs de leitura. |
| CMS/editorial | MADURO LOCALMENTE: workflow DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED, comentários, histórico, rollback e importação JSON/CSV. A ativação remota depende da 0037. |
| Conteúdo | MADURO: Quiz universal e pacote modular oficial de 380 conteúdos; nenhuma alteração editorial foi feita na Sprint 25.0. |
| Biblioteca/Gerador/Loader | MADURO: fonte publicada, elegibilidade, geração e providers sustentam os sete jogos. |
| Eventos | V1 COMPLETA: criação, validação, sugestão/seleção, reservas, agendamento, cancelamento e participante; Eventos 2.0 é evolução. |
| Economia/coleção | FUNCIONAL, A CALIBRAR: moedas, ledgers, Loja, Inventário, equipamento e conquistas existem. |
| Administração/Analytics | FUNCIONAL: navegação unificada, diagnóstico, operação, conteúdo, Eventos e Analytics agregados; dashboards ainda podem ganhar integração/ação. |
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

## Baseline de validação registrada

A Sprint 24.8 registrou: build com 64 páginas, `test:quick` com 147 testes, `test:all` com 250 testes, Playwright com 66 aprovados e 2 skips, além de lint, typecheck e `git diff --check` aprovados. Esses números são **históricos da 24.8** e não foram reexecutados nem alterados pela Sprint 25.0.

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
