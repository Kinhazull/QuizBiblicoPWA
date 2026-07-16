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

## Validações manuais do piloto

- D1 remoto, autenticação em múltiplos aparelhos e instalação PWA foram verificados manualmente durante a homologação.
- Lighthouse/Core Web Vitals foram medidos e aprovados em aparelho real para o piloto em 16/07/2026; a CI não substitui novas medições após mudanças relevantes.
- A restauração automatizada usa SQLite isolado. O exercício operacional em um D1 separado continua sendo uma etapa distinta do checklist de operação.
- A CI bloqueia vulnerabilidades altas/críticas; a auditoria executada em 16/07/2026 não encontrou vulnerabilidades conhecidas.
