# Diagnóstico administrativo

`GET /api/admin/health` é somente leitura e exige `reports.view`.

O schema esperado vem de `shared/operational-schema-contract.mjs` e cobre migrations até `0036`, tabelas, índices e triggers críticos. O endpoint também verifica:

- projeções CMS ausentes;
- seleções sem itens e versões históricas ausentes;
- Eventos encerrados ainda ativos, reservas expiradas e participações conflitantes;
- outbox em retry/dead letter;
- Event Engine e checkpoints de Statistics;
- processamento histórico de premiações.

Erros inesperados retornam somente `unexpected_error` e `supportId`; SQL, stack e payloads não são expostos.
