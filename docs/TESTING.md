# Testes do Quiz Bíblico PWA

## Pré-requisitos

- Node.js 22.13 ou superior
- pnpm 11
- `pnpm install --frozen-lockfile`

Os testes nunca usam credenciais, D1 remoto ou dados de produção.

## Comandos

- `pnpm run test:quick`: contratos e verificações rápidas.
- `pnpm run test:unit`: funções puras e regras competitivas.
- `pnpm run test:contracts`: segurança, PWA e Service Worker.
- `pnpm run test:integration`: handlers reais com sessão e SQLite temporário migrado.
- `pnpm run test:e2e`: Chromium desktop/mobile, axe e uma Jornada com handlers reais e banco temporário.
- `pnpm run test:all`: unitários, contratos e integração, sem repetir o build.

Execute também `pnpm run lint`, `pnpm run build` e `pnpm audit --audit-level=high`.

## Banco temporário

Cada teste cria um SQLite `:memory:` isolado usando `node:sqlite` e aplica todas as migrations em ordem lexical. O adaptador implementa a interface D1 usada pelos handlers. Constraints, índices, transações e consultas são executados; não existe banco falso permissivo.

Testes concorrentes usam bancos distintos. Requisições simultâneas dentro do mesmo cenário usam `Promise.all` contra o mesmo banco e validam os efeitos persistidos.

## E2E real isolado

O Playwright abre a aplicação local e despacha as requisições de API para os handlers reais no processo de teste. O cenário persiste login, cookie, dez respostas, conclusão, Ranking e logout no SQLite migrado. Não há URL de produção, rede externa ou credencial real.

O teste de restauração cria outro banco migrado, importa o núcleo de um backup e executa `PRAGMA foreign_key_check`. Como credenciais não pertencem ao backup, usuários restaurados ficam suspensos e obrigados a redefinir a senha.

## Tipos

- **Contrato:** detecta remoção acidental de proteções, mas não prova persistência.
- **Unitário:** executa função pura sem banco.
- **Integração:** executa handler e SQL real.
- **Concorrência:** dispara handlers em paralelo e consulta o banco.
- **E2E:** usa navegador real, UI local, handlers reais e banco isolado.

## Limitações conhecidas

- D1 remoto e propagação em vários aparelhos continuam no checklist manual.
- A instalação PWA deve ser confirmada em Android/iOS reais.
- Lighthouse/Core Web Vitals em aparelho físico não são substituídos pela CI.
- A CI bloqueia vulnerabilidades altas/críticas; vulnerabilidades transitivas moderadas permanecem documentadas e acompanhadas.
