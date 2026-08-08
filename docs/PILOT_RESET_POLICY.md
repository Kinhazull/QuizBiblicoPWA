# Política de reset do piloto

A fonte executável é `shared/operational-schema-contract.mjs`. Cada tabela recebe uma classificação: `PRESERVE`, `RESET`, `REBUILD`, `DERIVED`, `SECURITY_PRESERVE`, `LEGACY_PRESERVE` ou `INVESTIGATE`.

## Invariantes

- preservar organizações, contas, admins, permissões, segurança, CMS, conteúdo oficial e definições;
- preservar Eventos administrativos e suas seleções `EVENT`;
- remover atividade, progressão, recompensas e participações do piloto;
- remover seleções não-Evento;
- liberar reservas vencidas/canceladas e deixar a Biblioteca `AVAILABLE` somente quando não houver reserva válida;
- preservar auditoria e registrar o reset.

O modo `--dry-run` não escreve e informa contagens protegidas e afetadas. O workflow exige confirmação, backup integral cifrado, snapshot anterior, execução transacional e verificação independente. Testes usam apenas SQLite/D1 isolado.
