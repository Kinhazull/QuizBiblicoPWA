# Backup e restauração

## Escopos distintos

1. **Exportação do usuário:** portabilidade e privacidade; não é backup operacional.
2. **Backup organizacional administrativo:** JSON autenticado, isolado por organização e sem credenciais, sessões, tokens ou códigos de recuperação.
3. **Backup integral de recuperação:** export SQL completo do D1 pelo workflow operacional autorizado. Preserva schema, dados e `d1_migrations`.

Backups integrais contêm PII, hashes, progresso, economia, auditoria, conteúdo, eventos e segredos MFA já cifrados. Nunca podem ser versionados, publicados como artifact público ou copiados para logs/tickets.

## Criação do backup integral

Os workflows de reconciliação de migrations e limpeza do piloto executam:

1. preflight/snapshot do estado atual;
2. `wrangler d1 export` para SQL local do runner;
3. criptografia AES-256-CBC com PBKDF2 e 200.000 iterações;
4. remoção do SQL em claro;
5. SHA-256 do arquivo cifrado;
6. upload privado e temporário do `.enc`, checksum e snapshot.

O workflow manual `reconcile-production-d1.yml` possui duas operações explícitas. `reconcile` preserva o fluxo completo acima e, após o artifact, revalida e aplica somente migrations oficiais pendentes, executando `verify-final` e `compare`. `backup_only` encerra com sucesso imediatamente após exportação, criptografia, verificação do checksum, remoção do plaintext, upload do artifact e resumo seguro; o job mutável é separado e condicionado estruturalmente a `operation == 'reconcile'`. Valores ausentes ou inválidos falham antes do export. Esta separação foi adicionada após o safety finding da 27.7.2B; ela não constitui evidência de que um backup produtivo já tenha sido executado.

A chave é o secret independente `D1_BACKUP_ENCRYPTION_KEY`. Ela não pode ser o token Cloudflare, não entra no banco, no Git, no artifact ou nos logs. O proprietário deve mantê-la em gerenciador de segredos com cópia de recuperação offline controlada. Perder essa chave torna os backups cifrados inutilizáveis.

Antes de armazenar ou restaurar, execute `sha256sum -c <arquivo>.sha256`. O checksum detecta corrupção acidental; autenticidade também depende da proveniência do workflow/artifact e do controle de acesso.

## Restore controlado

Restore é uma operação perigosa e nunca começa em produção:

1. congelar a promoção/escritas quando aplicável e preservar evidências;
2. selecionar artifact e snapshot do run correto;
3. verificar SHA-256 antes de descriptografar;
4. descriptografar localmente com a chave separada;
5. criar D1 vazio/isolado;
6. importar o SQL;
7. executar `PRAGMA integrity_check` em SQLite local; no D1 remoto, usar `PRAGMA quick_check` porque `integrity_check` é rejeitado com `SQLITE_AUTH`; executar `PRAGMA foreign_key_check` nos dois ambientes;
8. conferir ledger, schema, índices/triggers e contagens sanitizadas;
9. validar contas, progresso/economia, CMS/Biblioteca, Eventos/reservas, Outbox/consumers e MFA;
10. somente então elaborar recuperação produtiva com autorização explícita.

O `MFA_ENCRYPTION_KEY` não faz parte do backup. Restaurar `user_mfa.encrypted_secret` exige a mesma chave MFA correspondente; sem ela, o caminho seguro é reset assistido, nunca extração do segredo.

## Evidência automatizada

`tests/integration/backup-restore-exercise.integration.test.mjs` cobre:

- backup organizacional sanitizado restaurado sobre schema migrado, com credenciais bloqueadas;
- snapshot integral local em arquivo SQLite, reaberto e verificado quanto a integridade, FKs, migration 0039, MFA, progresso/economia e Outbox.

Isso comprova o restore lógico/local. Em 12/08/2026, o restore remoto foi também comprovado em D1 isolado e descartável com dataset sintético, sem restaurar nem alterar produção.

## Dataset sintético para ensaio remoto

Gere localmente o dump efêmero com `pnpm run db:recovery:generate-synthetic`. A saída padrão é `outputs/recovery/recovery-synthetic-0039.sql`, diretório ignorado pelo Git. O gerador concatena as migrations reais de `drizzle/` até 0039 e acrescenta somente dados sintéticos descritos por um manifesto compartilhado com o teste. Ele não chama Wrangler, não acessa rede e não usa chaves de backup ou MFA.

O dump inclui organização e contas fictícias, progresso/economia, CMS/Biblioteca, seleção, Evento/reserva, Outbox, schema/registro MFA fictício e ledger completo. Deve ser removido depois do ensaio.

## Evidência do restore remoto isolado — 12/08/2026

- banco descartável: `quiz-biblico-recovery-20260812`, UUID `99992341-8206-41e4-95ad-e296cadaac0b`;
- produção foi apenas referência de exclusão: `quiz-biblico-db`, UUID `33fc35a0-46cf-4756-b6be-89b07371256c`;
- dataset exclusivo: `outputs/recovery/recovery-synthetic-0039.sql`, sem dados de produção;
- importação: 261 queries, 10.211 rows read, 685 rows written e cerca de 1,20 MB;
- local: `PRAGMA integrity_check = ok`;
- D1 remoto: `PRAGMA quick_check = ok`; `PRAGMA foreign_key_check` sem linhas;
- ledger consultado diretamente: 40 migrations, terminando em `0039_administrative_mfa.sql`;
- schema, índice de owner, progresso/economia, CMS/Biblioteca, Evento/reserva, Outbox e MFA sintético confirmados;
- banco temporário excluído e listagem final contendo somente produção.

O banco descartável não foi adicionado ao `wrangler.jsonc`; portanto, `wrangler d1 migrations list` não integra esta evidência. Para restore temporário não vinculado, a prova é a consulta direta e ordenada de `d1_migrations`. Isso não substitui o reconciliador oficial para migrations de produção.

O secret `D1_BACKUP_ENCRYPTION_KEY` foi provisionado no GitHub Environment `production`, com passphrase aleatória de 64 caracteres, versão `v1` custodiada externamente e arquivo temporário removido. O valor nunca deve ser registrado.

## Backup produtivo pré-migration 0039 — 13/08/2026

Estado: `PRE_MIGRATION_BACKUP_VERIFIED`.

- banco: `quiz-biblico-db`, UUID `33fc35a0-46cf-4756-b6be-89b07371256c`;
- workflow run: `31742051309`, operação `backup_only`, concluído em `2026-08-13T20:43:15Z`;
- artifact privado: `d1-production-backup-31742051309`, 7.155.577 bytes, retenção até `2026-08-20T20:43:13Z`;
- arquivo cifrado: `d1-production-backup.sql.enc`, 7.142.608 bytes;
- SHA-256 do arquivo cifrado: `65571640b719e9e99fc4838d89b12f4b77296331adab8dd671ac04c8d24c2d2a`;
- artifact contém somente o arquivo cifrado, seu checksum e `d1-before.json`; o SQL em claro foi removido antes do upload;
- job `Apply and verify pending migrations`: `SKIPPED`;
- ledger pós-backup: 39 migrations, terminando em `0038_platform_rankings_indexes.sql`; `0039_administrative_mfa.sql` permanece pendente.

Nenhum valor de secret foi acessado ou registrado e nenhuma migration, escrita no D1, promoção ou deploy ocorreu nesse run.

## Secret MFA produtivo pré-migration 0039 — 13/08/2026

Estado: `PRODUCTION_PRESENT_DEPLOY_REQUIRED`.

O secret `MFA_ENCRYPTION_KEY` foi provisionado como valor cifrado no ambiente production do Pages `quizbiblicopwa`, usando material aleatório de 32 bytes compatível com AES-256-GCM. A verificação confirmou apenas a presença do nome e o estado cifrado; valor, hash, prefixo e sufixo não foram recuperados ou registrados. O provisionamento não criou deployment. Conforme o contrato do Cloudflare Pages, um deployment controlado posterior é necessário para disponibilizar o binding ao código implantado.

Na conclusão desta etapa de secret, o ledger produtivo ainda permanecia com 39 migrations, terminando em `0038_platform_rankings_indexes.sql`; `0039_administrative_mfa.sql` estava pendente. MFA produtivo, enrollment, recovery codes e smoke funcional não foram ativados nesta etapa.

## Promoção controlada da migration 0039 — 13/08/2026

Estado: `MIGRATION_APPLIED_COMPARE_BLOCKED`.

O run `31748776445`, operação `reconcile`, criou um novo backup cifrado e aplicou exclusivamente `0039_administrative_mfa.sql`. O ledger passou para 40 migrations e o `verify-final` aprovou o estado final. A etapa `compare` falhou com `Pre-existing schema object changed unexpectedly: table sessions`, embora a própria 0039 adicione intencionalmente `sessions.mfa_verified`.

A inspeção read-only posterior confirmou `user_mfa`, `mfa_recovery_codes`, `mfa_login_challenges`, seus índices, o índice único de owner ativo, FKs com cascade, `quick_check = ok`, `foreign_key_check` sem linhas e zero registros nas tabelas MFA. Nenhum restore, retry, deployment ou enrollment foi executado. O artifact pré-migration original permanece a referência de recuperação; o novo artifact do run também foi produzido pelo fluxo obrigatório.

A correção local 27.7.2C.3 tornou o compare consciente da transição exata da migration 0039: `sessions` somente é aceito quando muda da definição integral da baseline 0038 para a mesma definição acrescida exclusivamente de `mfa_verified INTEGER NOT NULL DEFAULT 0`. Objetos criados também precisam pertencer ao manifesto das migrations aplicadas. A correção foi validada localmente com SQLite, mas ainda não foi reexecutada contra produção.

## Revalidação read-only pós-migration 0039 — 13/08/2026

Estado: `0039_PRODUCTION_VERIFIED / EXPECTED_0039_ONLY`.

O snapshot `d1-before.json` foi recuperado do artifact privado `d1-production-backup-31748776445`, sem abrir ou descriptografar o dump SQL. Sua proveniência corresponde ao run controlado da 0039, ledger 39 e última migration `0038_platform_rankings_indexes.sql`.

Contra a produção atual, o `verify-final` confirmou ledger 40/0039 e o compare corrigido aceitou somente a alteração estrutural exata de `sessions`. O relatório registrou 11 objetos criados, 1 modificação esperada, 0 modificações inesperadas, 0 remoções, 0 regressões de linhas e preservação das 67 tabelas preexistentes. `quick_check` retornou `ok` e `foreign_key_check` não retornou inconsistências.

As três tabelas MFA, os índices esperados e `sessions.mfa_verified INTEGER NOT NULL DEFAULT 0` foram confirmados; as três tabelas MFA permanecem vazias. O secret `MFA_ENCRYPTION_KEY` permanece listado somente como `Value Encrypted`. A listagem read-only do Pages registrou deployment de produção no SHA `11c2377`, posterior ao provisionamento; isso não substitui o enrollment/smoke funcional MFA, que permanece pendente e fora desta etapa.

Nenhuma migration, escrita D1, restauração, alteração de secret ou deployment foi executado durante a revalidação.

## Metas operacionais iniciais

São targets, não SLA:

- RPO alvo: até 24 horas para backup periódico e imediatamente antes de migrations/operações destrutivas;
- RTO alvo: 4 horas para triagem e restauração validada em ambiente isolado;
- retenção sugerida: 7 backups diários cifrados, revista conforme custo e obrigação legal;
- teste de recuperação: local em cada alteração do contrato e remoto isolado antes da release e depois trimestralmente.

O proprietário deve aprovar frequência, retenção, local externo privado e descarte seguro considerando orçamento e privacidade.
