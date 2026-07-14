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
```

Os testes de integração recriam um banco temporário e aplicam todas as migrations; não acessam produção. Consulte [docs/TESTING.md](docs/TESTING.md) para arquitetura, isolamento, concorrência e limitações.

## Dados e implantação

Migrations ficam em `drizzle/`. Não aplique migrations nem publique automaticamente a partir de uma máquina de desenvolvimento. A CI valida push para `main` e pull requests sem segredos de produção.
