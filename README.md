# Conte os Feitos — Jogos e Desafios Bíblicos

**Conte os Feitos** é uma plataforma cristã modular com sete jogos, CMS Universal, progressão, missões, conquistas, economia e modos Livre, Diário e Evento.

## Estado do produto

- Fases 1–4 concluídas.
- Fase 5 em andamento.
- `v1.0.0` é a tag histórica do piloto anterior centrado no Quiz Bíblico.
- A primeira release formal da plataforma será `v2.0.0`; a tag ainda não foi criada.
- O estado operacional corrente está em [docs/AI/CURRENT_STATE.md](docs/AI/CURRENT_STATE.md).

## Documentação

| Assunto | Documento |
| --- | --- |
| Estado corrente | [docs/AI/CURRENT_STATE.md](docs/AI/CURRENT_STATE.md) |
| Roadmap | [docs/PRODUCT/ROADMAP.md](docs/PRODUCT/ROADMAP.md) |
| Changelog | [CHANGELOG.md](CHANGELOG.md) |
| Arquitetura | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Produto | [docs/PRODUCT/README.md](docs/PRODUCT/README.md) |
| Deprecações | [docs/PRODUCT/DEPRECATIONS.md](docs/PRODUCT/DEPRECATIONS.md) |
| Operação | [OPERATIONS.md](OPERATIONS.md) |
| Migrations | [docs/D1_MIGRATION_RECONCILIATION.md](docs/D1_MIGRATION_RECONCILIATION.md) |
| Desenvolvimento local | [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) |
| Testes | [docs/TESTING.md](docs/TESTING.md) |

## Desenvolvimento

Requer Node.js 22.13+ e pnpm 11.15.0.

```bash
pnpm install --frozen-lockfile
pnpm run dev
pnpm run dev:full
pnpm run dev:lan
pnpm run lint
pnpm run build
```

`pnpm run dev` executa apenas o frontend. `dev:full` e `dev:lan` executam frontend, Pages Functions e D1 exclusivamente local. Consulte [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md).

## Qualidade

```bash
pnpm run test:quick
pnpm run test:unit
pnpm run test:contracts
pnpm run test:integration
pnpm run test:all
pnpm run test:e2e
```

Os testes de integração usam banco temporário e não acessam produção.

## Banco e publicação

Migrations ficam em `drizzle/` e são promovidas pelo processo controlado documentado em [docs/D1_MIGRATION_RECONCILIATION.md](docs/D1_MIGRATION_RECONCILIATION.md). Deploy, migrations remotas e dados reais exigem autorização explícita.

Identificadores históricos como `quiz-biblico-db` e `journey-awards` permanecem por estabilidade operacional; eles não definem a identidade pública atual do produto.
