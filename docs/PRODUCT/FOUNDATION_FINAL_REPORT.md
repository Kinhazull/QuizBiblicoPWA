# Relatório final da Foundation

Data: 21/07/2026

Branch: `feature/platform-foundation`

Base estável: `main` em `92b7249` (`v1.0.0` do piloto)

## Escopo implementado

- Home modular e catálogo centralizado de jogos, preservando o Quiz Bíblico existente.
- Ambiente local completo e modo LAN usando exclusivamente D1 local.
- Progress Service global com XP, nível, moedas e ledgers idempotentes.
- Achievement Service, catálogo oficial, desbloqueio e recompensas idempotentes.
- Mission Service com catálogo, generator, consumer, progresso e claim explícito.
- Event Engine síncrono, registro oficial de consumers, recibos versionados, retry e leases.
- Statistics Service com projeções globais e por jogo reconstruíveis.
- Reward Consumer conectado exclusivamente ao Progress Service.
- Adaptador `GAME_FINISHED` v2 do Quiz, outbox transacional e dispatcher administrativo.

## Migrations aditivas da Foundation

| Migration | Finalidade |
| --- | --- |
| `0023_platform_user_progress.sql` | Progresso global e ledgers de XP/moedas |
| `0024_platform_achievements.sql` | Definições e desbloqueios de conquistas |
| `0025_platform_missions.sql` | Definições, atribuições e eventos de progresso de missões |
| `0026_platform_event_engine.sql` | Eventos e recibos versionados dos consumers |
| `0027_platform_statistics.sql` | Projeções globais e por jogo |
| `0028_quiz_core_event_outbox.sql` | Outbox transacional do Quiz |
| `0029_quiz_core_event_outbox_leases.sql` | Lease concorrente do dispatcher |
| `0030_achievement_statistics_projections.sql` | Projeções oficiais usadas pelas conquistas |

Não há numeração duplicada, migration destrutiva ou conflito de nomes conhecido. A aplicação remota dessas migrations permanece fora desta branch e deve seguir o processo operacional controlado.

## Consumers oficiais

Ordem registrada:

1. `platform-statistics:1`
2. `reward-progress:1`
3. `platform-achievements:1`
4. `platform-missions:1`

Achievement exige recibos concluídos de Statistics e Reward. Todos usam identidade de processamento composta por evento, consumer e versão; seus efeitos persistentes possuem IDs determinísticos próprios.

## Eventos oficiais

O catálogo contém: `USER_REGISTERED`, `USER_LOGGED_IN`, `DAILY_LOGIN`, `GAME_STARTED`, `GAME_FINISHED`, `QUESTION_ANSWERED`, `XP_GRANTED`, `LEVEL_UP`, `ACHIEVEMENT_UNLOCKED`, `MISSION_PROGRESS`, `MISSION_COMPLETED`, `MISSION_REWARD_CLAIMED` e `REWARD_GRANTED`.

`GAME_FINISHED` v2 é o contrato canônico para novas conclusões do Quiz. A versão 1 continua aceita por compatibilidade histórica, sem receber efeitos que dependem dos campos exclusivos da v2.

## APIs da Foundation

- `GET /api/platform/progress`
- `GET /api/platform/achievements`
- `GET /api/platform/statistics`
- `GET /api/platform/missions/current`
- `POST /api/platform/missions/:id/claim`
- `POST /api/admin/operations/quiz-outbox`

As APIs de plataforma são autenticadas e isoladas por usuário/organização. Não existe API pública para conceder XP, moedas, conquistas, progresso de missão ou estatísticas arbitrariamente.

## Documentação

A Foundation adiciona 34 documentos Markdown entre visão, roadmap, linguagem, design, arquitetura, domínio, catálogos, ADR, contratos, registros de implementação, desenvolvimento local, revisão e hardening. O índice oficial está em `docs/PRODUCT/README.md`.

## Cobertura de testes

- 25 arquivos de teste foram adicionados ou ampliados na branch.
- Cobertura unitária: adaptador do Quiz, Mission Generator e Mission Consumer.
- Cobertura de integração: Progress, Achievement, Event Engine, Statistics, Reward, Missions, claim, outbox e dispatcher.
- Cobertura contratual: arquitetura, migrations, catálogo de jogos, desenvolvimento local, segurança e PWA.
- Cobertura E2E: Home responsiva e fluxo real de login, Jornada, ranking e logout com banco temporário.
- Último baseline do hardening: `test:all` com 113 testes aprovados; Playwright com 29 aprovados e uma execução redundante intencionalmente ignorada.

## Estado de integração

- Árvore limpa antes desta atualização documental.
- Migrations `0023`–`0030` sequenciais e aditivas.
- `git diff --check` da branch passou após normalização documental.
- Nenhum código, API, teste ou migration foi alterado nesta preparação.
- A branch possui commits intermediários com mensagens exploratórias (`Test1`, `Cel`, `TelaJogos`, `Update games.css`). Por isso, a integração recomendada é **Squash and merge**, produzindo um único commit coerente na `main`.

## Riscos restantes

- As migrations precisam ser aplicadas de forma controlada no ambiente alvo antes de habilitar o novo Core.
- O dispatcher da outbox ainda depende de acionamento administrativo e observação de dead letters.
- A branch remota deve ser atualizada antes da revisão/merge.
- Merge commit comum preservaria mensagens exploratórias; usar squash evita esse débito histórico.

## Parecer

A Foundation está tecnicamente pronta para revisão e **Squash and merge**, condicionada à execução do pipeline completo no commit remoto e ao plano controlado de migrations. Não é recomendada a integração por merge commit comum enquanto o histórico exploratório permanecer intacto.
