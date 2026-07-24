# Índice operacional do projeto

Este documento evita que assistentes precisem explorar todo o repositório.

## Entrada e visão geral

- `README.md` — visão geral, comandos e índice documental.
- `AGENTS.md` — regras obrigatórias para assistentes.
- `docs/PROJECT_CONTEXT.md` — contexto permanente.
- `docs/CURRENT_STATE.md` — prioridade, bloqueios e handoff.
- `docs/CHAT_PROTOCOL.md` — padrão de conversa e planejamento.

## Produto e roadmap

- `docs/PRODUCT/README.md`
- `docs/PRODUCT/ROADMAP.md`
- `docs/PRODUCT/DECISION_LOG.md`
- `docs/PRODUCT/AI_COLLABORATION.md`
- `docs/PRODUCT_LANGUAGE.md`
- `BACKLOG.md`

## Arquitetura e operação

- `docs/ARCHITECTURE.md`
- `OPERATIONS.md`
- `RELEASE.md`
- `docs/TESTING.md`
- `docs/LOCAL_DEVELOPMENT.md`
- `docs/D1_MIGRATION_RECONCILIATION.md`
- `docs/OPERATIONS_JOURNEY_AWARDS.md`
- `docs/JOURNEY_LIFECYCLE.md`

## Buscas recomendadas

### Evento canônico e outbox

`GAME_FINISHED`, `quiz_core_event_outbox`, `dispatchQuizOutbox`, `consumer_version`, `dead letter`, `lease`

### Scheduler e Worker

`scheduled(`, `processClosedRoundAwards`, `dispatchQuizOutbox`, configuração Wrangler

### Perfil da plataforma

`/api/platform/progress`, `/api/platform/statistics`, `/api/platform/achievements`, `/api/platform/missions/current`

### Progressão e recompensas

Progress Service, Reward Service, `reward-progress:1`, XP, coins

### Estatísticas

Statistics Service, `platform-statistics:1`, checkpoint, rebuild

### Conquistas

Achievement Service, `platform-achievements:1`, catálogo de Conquistas

### Missões

Mission Service, Mission Generator, Mission Consumer, Mission Claim, `platform-missions:1`

## Manutenção

Atualize este arquivo quando houver novo módulo, ponto de entrada, serviço central, Worker, API ou renomeação relevante.
