# Diagnóstico administrativo

`GET /api/admin/health` é somente leitura e exige `reports.view`.

O contrato moderno está no bloco `operational`, com resumo agregado e grupos `HEALTHY`, `DEGRADED`, `CRITICAL` e `UNKNOWN`. A resposta anterior foi preservada temporariamente para compatibilidade da interface e dos contratos administrativos existentes.

O schema esperado vem de `shared/operational-schema-contract.mjs` e cobre migrations até `0036`, tabelas, índices e triggers críticos. O endpoint também verifica:

- projeções CMS ausentes;
- seleções sem itens e versões históricas ausentes;
- Eventos encerrados ainda ativos, reservas expiradas e participações conflitantes;
- outbox em retry/dead letter;
- Event Engine e checkpoints de Statistics;
- processamento histórico de premiações.

Erros inesperados seguem `docs/API_ERROR_CONTRACT.md`; SQL, stack e payloads não são expostos. Thresholds e orientações ficam em `docs/OPERATIONAL_OBSERVABILITY.md` e os procedimentos em `docs/OPERATIONAL_RUNBOOKS.md`.
