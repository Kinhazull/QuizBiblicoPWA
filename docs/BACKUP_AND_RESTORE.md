# Backup e restauração

## Contratos distintos

1. **Exportação do usuário:** atende privacidade e portabilidade; não é backup operacional. Será aprofundada na Sprint 24.2.
2. **Backup organizacional administrativo:** JSON autenticado, isolado por organização, sem credenciais, sessões, tokens, códigos de recuperação ou contadores de abuso. Usa `schemaVersion: 36` e a classificação canônica em `shared/operational-schema-contract.mjs`.
3. **Backup integral de recuperação:** `wrangler d1 export` executado somente pelo workflow operacional autorizado. É o snapshot completo para disaster recovery.

## Restauração administrativa

Uma restauração deve ocorrer somente em D1 isolado e vazio:

1. validar formato, versão e `organizationId`;
2. verificar o backup e sua origem;
3. restaurar na ordem documentada/testada, preservando IDs;
4. bloquear credenciais restauradas e exigir nova senha;
5. executar `PRAGMA foreign_key_check` e comparar contagens;
6. validar CMS, Biblioteca, seleções, participações, progresso, Eventos, reservas e reward ledger;
7. somente depois elaborar um plano separado para produção.

O exercício automatizado fica em `tests/integration/backup-restore-exercise.integration.test.mjs`. Ele nunca aponta para produção.

## Disaster recovery

O workflow exporta o D1 antes de migrations/reset, cifra o SQL com AES-256-CBC/PBKDF2, remove o arquivo em claro e publica somente o artefato cifrado com retenção configurada. A recuperação exige autorização, segredo de descriptografia, download auditado, descriptografia local e importação primeiro em D1 isolado. Nunca restaure diretamente sobre produção sem validar schema, ledger, contagens e integridade.
