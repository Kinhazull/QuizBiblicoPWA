# Índice operacional do projeto

Este documento orienta assistentes a encontrar o contexto certo sem explorar o repositório inteiro.

## Entrada obrigatória

- `docs/AI/AGENTS.md`
- `docs/AI/PROJECT_CONTEXT.md`
- `docs/AI/CURRENT_STATE.md`
- `docs/AI/PROJECT_INDEX.md`
- `docs/AI/CHAT_PROTOCOL.md`

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

## Documentação operacional de IA

- `docs/AI/DECISIONS.md`
- `docs/AI/HANDOFF_TEMPLATE.md`
- `docs/AI/SPRINT_TEMPLATE.md`
- `docs/AI/CODEX/FEATURE.md`
- `docs/AI/CODEX/BUGFIX.md`
- `docs/AI/CODEX/REFACTOR.md`
- `docs/AI/CODEX/REVIEW.md`
- `docs/AI/CODEX/HOTFIX.md`
- `docs/AI/HISTORY/`

## Estratégia de busca no código

### Eventos e outbox

Pesquisar por:

- `GAME_FINISHED`
- `quiz_core_event_outbox`
- `dispatchQuizOutbox`
- `consumer_version`
- `dead letter`
- `lease`

### Worker e scheduler

Pesquisar por:

- `scheduled(`
- `processClosedRoundAwards`
- `dispatchQuizOutbox`
- arquivos Wrangler
- configuração do Worker

### Perfil da plataforma

Pesquisar pelas APIs:

- `/api/platform/progress`
- `/api/platform/statistics`
- `/api/platform/achievements`
- `/api/platform/missions/current`

### Progressão e recompensas

Pesquisar por:

- Progress Service
- Reward Service
- XP
- coins
- reward consumer

### Estatísticas

Pesquisar por:

- Statistics Service
- checkpoint
- rebuild
- consumer version

### Conquistas

Pesquisar por:

- Achievement Service
- catálogo de Conquistas
- achievement consumer

### Missões

Pesquisar por:

- Mission Service
- Mission Generator
- Mission Consumer
- Mission Claim

## Manutenção

Atualizar este arquivo quando:

- serviços forem renomeados;
- novos módulos forem criados;
- pontos de entrada mudarem;
- novas APIs centrais surgirem;
- novas pastas documentais forem adicionadas;
- os termos de busca deixarem de localizar os arquivos corretos.
