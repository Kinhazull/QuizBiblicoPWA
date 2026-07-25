# Índice operacional do projeto

## Entrada obrigatória

- `00-START-HERE.md`
- `AGENTS.md`
- `PROJECT_CONTEXT.md`
- `CURRENT_STATE.md`
- `PROJECT_INDEX.md`
- `CHAT_PROTOCOL.md`

## Produto e roadmap

- `docs/PRODUCT/README.md`
- `docs/PRODUCT/ROADMAP.md`
- `docs/PRODUCT/DECISION_LOG.md`
- `docs/PRODUCT/AI_COLLABORATION.md`
- `docs/PRODUCT_LANGUAGE.md`
- `BACKLOG.md`

## Arquitetura e operação

- `README.md`
- `docs/ARCHITECTURE.md`
- `OPERATIONS.md`
- `RELEASE.md`
- `docs/TESTING.md`
- `docs/LOCAL_DEVELOPMENT.md`
- `docs/D1_MIGRATION_RECONCILIATION.md`
- `docs/OPERATIONS_JOURNEY_AWARDS.md`
- `docs/JOURNEY_LIFECYCLE.md`

## Busca orientada

### Eventos e outbox

- `GAME_FINISHED`
- `quiz_core_event_outbox`
- `dispatchQuizOutbox`
- `consumer_version`
- `dead letter`
- `lease`

### Worker e scheduler

- `scheduled(`
- `processClosedRoundAwards`
- `dispatchQuizOutbox`
- arquivos Wrangler

### Perfil

- `/api/platform/progress`
- `/api/platform/statistics`
- `/api/platform/achievements`
- `/api/platform/missions/current`

### Progressão

- Progress Service
- Reward Service
- XP
- coins

### Estatísticas

- Statistics Service
- checkpoint
- rebuild

### Conquistas

- Achievement Service
- achievement consumer
- catálogo de Conquistas

### Missões

- Mission Service
- Mission Generator
- Mission Consumer
- Mission Claim
