# Testes do Quiz Bíblico PWA

## Pré-requisitos

- Node.js 22.13 ou superior
- pnpm 11
- Dependências instaladas com `pnpm install --frozen-lockfile`

Os testes nunca usam credenciais, D1 remoto ou dados de produção.

## Comandos

- `pnpm run test:quick`: contratos e verificações rápidas existentes.
- `pnpm run test:unit`: funções puras e regras competitivas.
- `pnpm run test:contracts`: contratos estáticos e comportamento do Service Worker.
- `pnpm run test:integration`: handlers reais com `Request`, sessão e banco temporário.
- `pnpm run test:e2e`: jornada de tentativa no nível da API, sem produção.
- `pnpm run test:all`: unitários, contratos e integração sem repetir o build.

Execute `pnpm run lint` e `pnpm run build` separadamente antes da entrega.

## Banco temporário

Cada teste de integração cria um SQLite `:memory:` isolado usando o módulo `node:sqlite`. Todas as migrations de `drizzle/` são aplicadas em ordem lexical antes do cenário. Um adaptador pequeno implementa a interface D1 utilizada pelos handlers (`prepare`, `bind`, `first`, `all`, `run` e `batch`) sobre o SQLite real. Assim, constraints, transações, índices e consultas são efetivamente executados; não há banco falso permissivo.

O banco é fechado ao final de cada teste. Testes concorrentes usam bancos distintos, e as requisições simultâneas dentro do cenário usam `Promise.all` contra o mesmo banco para comprovar idempotência e constraints.

## Handlers, sessão e tempo

Os testes importam os handlers de `functions/api` e os chamam com `Request`, `env.DB` e `params`, como no Worker. As sessões são persistidas na tabela `sessions`, com cookie opaco e hash real. `Date.now` é substituído somente dentro de casos determinísticos e restaurado em `finally`.

Para adicionar um cenário, use `tests/helpers/integration.mjs`, crie um banco por teste e valide tanto HTTP quanto as linhas persistidas. Não considere uma busca textual no fonte como comprovação comportamental.

## Tipos de teste

- **Estático/contrato:** detecta remoção acidental de cabeçalhos ou filtros, mas não prova persistência.
- **Unitário:** executa função pura sem banco.
- **Integração:** executa handler e SQL real em banco temporário.
- **Concorrência:** dispara handlers em paralelo e consulta efeitos persistidos.
- **E2E de API:** percorre início, resposta, retomada e conclusão sem depender de navegador ou produção.

## Limitações conhecidas

- D1 remoto e a propagação real em múltiplos dispositivos continuam sendo validações pré-lançamento.
- O Service Worker é exercitado em VM; instalação em navegadores reais permanece parte do teste manual da PWA.
- A vulnerabilidade moderada transitiva atualmente reportada pelo `pnpm audit` é documentada e acompanhada. A CI bloqueia vulnerabilidades altas ou críticas com `--audit-level=high`; ela não é ocultada nem ignorada.
- E2E visual com Playwright poderá ser acrescentado quando houver um servidor local Vinext/Workers estável na CI; a suíte atual já cobre a jornada no nível dos handlers.
