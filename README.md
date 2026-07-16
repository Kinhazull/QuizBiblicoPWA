# Conte os Feitos — Quiz Bíblico PWA

Aplicativo de jornadas bíblicas semanais, com tentativas oficiais e de treino, ranking, medalhas, acervo de perguntas e painel administrativo. A aplicação roda em Next.js/Vinext sobre Cloudflare Workers e usa Cloudflare D1.

## Desenvolvimento

Requer Node.js 22.13+ e pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm run dev
pnpm run lint
pnpm run build
```

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

## Dados e implantação

Migrations ficam em `drizzle/`. Não aplique migrations nem publique automaticamente a partir de uma máquina de desenvolvimento. A CI valida lint, build, testes, E2E e auditoria antes de implantar o artefato verificado do Pages e, depois, o Worker de premiações.

Antes do primeiro uso desse fluxo, desative uma única vez o deploy Git nativo do Pages pelo workflow manual **Configure gated Pages deployment**. Consulte [docs/RELEASE_HARDENING_V1.md](docs/RELEASE_HARDENING_V1.md), [docs/D1_MIGRATION_RECONCILIATION.md](docs/D1_MIGRATION_RECONCILIATION.md) e [docs/OPERATIONS_JOURNEY_AWARDS.md](docs/OPERATIONS_JOURNEY_AWARDS.md).

## Estado da versão 1.0

O schema de produção está reconciliado até `0022_release_hardening.sql` (23 migrations), o deploy Git nativo do Pages está desativado e o fluxo oficial é `Quality and security`: qualidade → E2E → Pages → Worker. O Cron de premiações executa a cada minuto no Worker separado `quiz-biblico-journey-awards`.

A aprovação legal atual cobre somente um **piloto controlado de 5–10 usuários**. Consulte [docs/LEGAL_RELEASE_CHECKLIST.md](docs/LEGAL_RELEASE_CHECKLIST.md). A abertura ao público exige nova aprovação de escopo.
