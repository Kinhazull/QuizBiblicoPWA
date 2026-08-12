# Runbooks operacionais

Comece pelo `supportId`, Central Administrativa e artifact/SHA afetado. Nunca edite ledger, saldo, checkpoints ou reservas diretamente.

## Deploy ruim — Pages ou Worker

1. interrompa novas promoções;
2. confirme SHA, artifact validado e smoke que falhou;
3. selecione o último artifact conhecido e aprovado pelo Quality;
4. repromova esse artifact pelo workflow manual, sem reconstruí-lo;
5. confirme `/api/auth/me` retornando 401 sem sessão e valide o Worker;
6. monitore Health, logs estruturados, Outbox e consumers.

Se código anterior não for compatível com schema já promovido, não faça downgrade destrutivo: use roll-forward compatível.

## Migration falhou

1. pare a promoção antes do deploy funcional;
2. preserve backup, snapshot e logs;
3. execute `verify-promotable`/`verify-final` somente pelo reconciliador;
4. não edite `d1_migrations` nem reaplique SQL manualmente;
5. prefira migration aditiva corretiva;
6. restaure backup apenas com perda/corrupção e após ensaio isolado.

Migrations são forward-only por padrão. Rollback SQL automático não é autorizado.

## Corrupção ou perda de dados

1. interrompa writes/promoções quando aplicável;
2. preserve evidências e determine a janela;
3. selecione backup anterior e valide checksum/proveniência;
4. restaure primeiro em ambiente vazio e isolado;
5. execute todas as verificações de `BACKUP_AND_RESTORE.md`;
6. estime perda contra o RPO e obtenha autorização antes de ação produtiva.

No SQLite local use `PRAGMA integrity_check`; no D1 remoto use `PRAGMA quick_check`, pois o serviço rejeita `integrity_check` com `SQLITE_AUTH`. Em ambos, `PRAGMA foreign_key_check` deve retornar vazio. Em banco descartável deliberadamente não vinculado ao `wrangler.jsonc`, valide o ledger consultando `d1_migrations` diretamente; não altere a configuração de produção apenas para executar `migrations list`.

## Cron, Outbox ou consumer parado

1. confira logs do Worker e `supportId`; não há heartbeat persistido nesta baseline;
2. analise backlog por quantidade e idade, dead letters e retries;
3. confirme reservas/eventos vencidos e checkpoints de consumers;
4. corrija a causa e retome pelos dispatchers/retries/reconciliadores oficiais;
5. valide idempotência e progresso após a retomada;
6. nunca mude estados manualmente nem conceda recompensas diretamente.

Fila não vazia, sozinha, não prova falha.

## Segredo comprometido

- sessão/token: revogar sessões afetadas e investigar segurança/auditoria;
- `MFA_ENCRYPTION_KEY`: interromper operações MFA, rotacionar em procedimento dedicado e considerar reset assistido;
- `D1_BACKUP_ENCRYPTION_KEY`: revogar acesso, criar nova chave, produzir novos backups e descartar cópias antigas conforme política;
- Cloudflare/GitHub: rotacionar credenciais, revisar runs/deploys e permissões;
- nunca incluir valores reais em incidentes ou logs.

## Responsabilidade humana

O proprietário aprova operações remotas, custódia das chaves, retenção/descarte, escolha do backup, restore produtivo e monitor externo. A chave de backup `v1` está provisionada e sob custódia externa; rotação futura deve preservar chaves antigas enquanto seus artifacts estiverem retidos. O sistema detecta internamente, mas não envia alerta proativo nesta baseline.
