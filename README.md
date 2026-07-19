# Conte os Feitos — Jogos e Desafios Bíblicos

**Conte os Feitos** é uma plataforma cristã modular em evolução. O produto reúne Jogos e Desafios Bíblicos, e o **Quiz Bíblico** é seu primeiro módulo funcional, com Jornadas, tentativas oficiais e de treino, Ranking, Medalhas, acervo de perguntas e painel administrativo.

A versão `v1.0.0` da `main` permanece como referência estável do piloto controlado. A modularização é desenvolvida em branches próprias e deve preservar integralmente o domínio competitivo do Quiz.

## Índice da documentação

| Assunto | Documento |
| --- | --- |
| Arquitetura e componentes | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Processo oficial de publicação | [RELEASE.md](RELEASE.md) |
| Operação geral | [OPERATIONS.md](OPERATIONS.md) |
| Ciclo da Jornada, Ranking e Medalhas | [docs/JOURNEY_LIFECYCLE.md](docs/JOURNEY_LIFECYCLE.md) |
| Operação do Cron | [docs/OPERATIONS_JOURNEY_AWARDS.md](docs/OPERATIONS_JOURNEY_AWARDS.md) |
| Testes | [docs/TESTING.md](docs/TESTING.md) |
| Banco e migrations | [docs/D1_MIGRATION_RECONCILIATION.md](docs/D1_MIGRATION_RECONCILIATION.md) |
| Limpeza pré-piloto | [docs/PILOT_DATA_RESET.md](docs/PILOT_DATA_RESET.md) |
| Aprovação legal do piloto | [docs/LEGAL_RELEASE_CHECKLIST.md](docs/LEGAL_RELEASE_CHECKLIST.md) |
| Linguagem oficial do produto | [docs/PRODUCT_LANGUAGE.md](docs/PRODUCT_LANGUAGE.md) |
| Fundação e visão modular | [docs/PRODUCT/README.md](docs/PRODUCT/README.md) |
| Roadmap oficial | [docs/PRODUCT/ROADMAP.md](docs/PRODUCT/ROADMAP.md) |
| Decisões de produto | [docs/PRODUCT/DECISION_LOG.md](docs/PRODUCT/DECISION_LOG.md) |
| Colaboração com IA | [docs/PRODUCT/AI_COLLABORATION.md](docs/PRODUCT/AI_COLLABORATION.md) |
| Sugestões com IA | [docs/AI_SUGGESTIONS.md](docs/AI_SUGGESTIONS.md) |
| Backlog | [BACKLOG.md](BACKLOG.md) |

## Desenvolvimento

Requer Node.js 22.13+ e pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm run dev
pnpm run dev:full
pnpm run lint
pnpm run build
```

`pnpm run dev` abre somente o frontend Next.js. Para testar login, Pages Functions e D1 sem acessar produção, use `pnpm run dev:full` e consulte [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md).

## Qualidade

```bash
pnpm run test:quick
pnpm run test:unit
pnpm run test:contracts
pnpm run test:integration
pnpm run test:all
pnpm run test:e2e
```

Os testes de integração recriam um banco temporário e aplicam todas as migrations; não acessam produção. Consulte [docs/TESTING.md](docs/TESTING.md) para arquitetura, isolamento, concorrência e limitações.

O Ranking exibido durante uma Jornada aberta é provisório. Depois do encerramento, o Worker processa os participantes de forma idempotente, fecha a Jornada, consolida o Ranking final e sincroniza Medalhas. Consulte [docs/JOURNEY_LIFECYCLE.md](docs/JOURNEY_LIFECYCLE.md).

## Dados e implantação

Migrations ficam em `drizzle/`. Não aplique migrations nem publique automaticamente a partir de uma máquina de desenvolvimento. A CI valida lint, build, testes, E2E e auditoria antes de implantar o artefato verificado do Pages e, depois, o Worker de premiações.

Antes do primeiro uso desse fluxo, desative uma única vez o deploy Git nativo do Pages pelo workflow manual **Configure gated Pages deployment**. Consulte [docs/RELEASE_HARDENING_V1.md](docs/RELEASE_HARDENING_V1.md), [docs/D1_MIGRATION_RECONCILIATION.md](docs/D1_MIGRATION_RECONCILIATION.md) e [docs/OPERATIONS_JOURNEY_AWARDS.md](docs/OPERATIONS_JOURNEY_AWARDS.md).

## Estado da versão 1.0

O schema de produção está reconciliado até `0022_release_hardening.sql` (23 migrations), o deploy Git nativo do Pages está desativado e o fluxo oficial é `Quality and security`: qualidade → E2E → Pages → Worker. O Cron de premiações executa a cada minuto no Worker separado `quiz-biblico-journey-awards`.

A aprovação legal atual cobre somente um **piloto controlado de 5–10 usuários**. Consulte [docs/LEGAL_RELEASE_CHECKLIST.md](docs/LEGAL_RELEASE_CHECKLIST.md). A abertura ao público exige nova aprovação de escopo.

## Evolução modular

O roadmap de Módulos 0–10 está documentado em [docs/PRODUCT/ROADMAP.md](docs/PRODUCT/ROADMAP.md). Jornada e Medalhas continuam pertencendo ao Quiz. Novos jogos terão regras e persistência próprias; `rounds` e `attempts` não serão reutilizados sem decisão arquitetural formal.
