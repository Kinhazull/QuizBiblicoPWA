# Inventário de Dados Pessoais

Status: contrato técnico da Sprint 24.2. Revisão humana e jurídica necessária antes da abertura pública ou Google Play.

## Fonte e cobertura

A única fonte de schema é `shared/operational-schema-contract.mjs`. A lista canônica contém **64 tabelas de aplicação** até a migration `0036`, e não 66 como estimado no briefing inicial. A contagem foi confirmada contra todos os `CREATE TABLE` únicos das migrations. `PRIVACY_TABLE_CLASSIFICATION` atribui categorias, ação de ciclo de vida e participação na exportação a cada uma das 64 tabelas; o teste contratual falha se surgir tabela sem decisão.

## Categorias

- **Dados diretos:** `users`, `invitations`, `sessions`, `legal_consents`, `account_recovery_codes`, `privacy_requests`.
- **Dados indiretos/pseudônimos:** tentativas e respostas, auditoria atribuída, medalhas, notificações, permissões e colaboração, progressão, ledgers, conquistas, missões, eventos do Core, seleções, participações, estatísticas e recompensas de Eventos.
- **Segurança:** `sessions`, `login_security`, `audit_logs`, `account_recovery_codes`, `abuse_counters`.
- **Economia virtual:** `user_platform_progress`, `platform_xp_ledger`, `platform_coin_ledger`, `platform_event_reward_ledger`.
- **Editorial/organizacional:** rodadas, perguntas, banco de perguntas, temporadas, comunicados, CMS e versões, Biblioteca Universal e definições/reservas de Eventos.
- **Idempotência:** ledgers, eventos/receipts do Core, Outbox, checkpoints, seleções, participações e recompensas de Eventos.

Uma tabela pode pertencer a mais de uma categoria. A classificação linha a linha está no contrato executável, evitando uma segunda lista manual divergente.

## Princípios

1. Identidade e organização são derivadas da sessão; o cliente não escolhe o titular exportado.
2. Conteúdo criado ou revisado por um usuário pertence à organização. A exportação informa a contribuição, mas não transfere o payload editorial.
3. Exclusão mantém um registro pseudônimo mínimo de `users` para conservar chaves estrangeiras e histórico legítimo.
4. Sessões, recuperação, permissões e preferências de notificação são removidas.
5. Ledgers e receipts são preservados sob identificador pseudônimo para impedir concessões duplicadas e permitir auditoria/reconstrução.
6. Hashes, tokens, sessões, cookies, segredos e respostas protegidas nunca fazem parte da exportação pessoal.

## Decisões pendentes

- `LEGAL_REVIEW_REQUIRED`: fundamento e prazo exato de retenção por categoria.
- Definir se o hash pseudônimo de segurança deve receber rotação periódica.
- Decidir sobre um registry de supressão/tombstone antes de automatizar restauração de backups contendo contas excluídas.
