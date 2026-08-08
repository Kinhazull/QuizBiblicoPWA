# Ciclo de Vida e Retenção de Dados

Esta é uma política técnica, não uma declaração de conformidade jurídica. Prazos legais dependem de revisão humana/institucional e estão marcados como `LEGAL_REVIEW_REQUIRED`.

| Categoria | Motivo | Encerramento/anonimização | Reconstrução e necessidade |
|---|---|---|---|
| Conta e perfil | Acesso e personalização | Anonimizar dados diretos após pedido aprovado; manter identificador pseudônimo mínimo | Necessário para FKs históricas |
| Sessões e recuperação | Autenticação | Revogar e excluir imediatamente na anonimização | Não reconstruir |
| Segurança e auditoria | Fraude, investigação e responsabilização | Minimizar e preservar somente pelo prazo aprovado | `LEGAL_REVIEW_REQUIRED` |
| Participações e resultados | Histórico e integridade dos modos | Preservar pseudonimizados ou eliminar quando dependências permitirem | Alimentam estatísticas e investigação |
| Seleções | Determinismo, histórico DAILY/EVENT e idempotência | Preservar enquanto houver participação/receipt dependente | Conteúdo histórico usa `contentId/contentVersion` |
| Progressão e economia | Saldo, recompensas e consistência | Preservar ledgers pseudonimizados; perfil de saldo deixa de ser acessível | Reconstroem saldo e impedem duplicidade |
| Missões e conquistas | Histórico de objetivos | Preservar pseudonimizadas enquanto necessárias ao histórico | Reprocessamento depende dos receipts |
| Notificações | Preferência/estado de leitura | Excluir receipts na anonimização | Pode ser descartado |
| Outbox/dead letters | Entrega operacional | Preservar minimamente até entrega, investigação ou expiração definida | `LEGAL_REVIEW_REQUIRED` |
| CMS e versões | Acervo da organização | Preservar conteúdo; autoria aponta para usuário pseudônimo | Não pertence individualmente ao autor |
| Eventos e reservas | Integridade editorial e histórica | Preservar definições; participações/recompensas ficam pseudonimizadas | Necessário para resultados fixos |
| Backups | Disaster recovery | Retenção operacional própria | Prazo e descarte: `LEGAL_REVIEW_REQUIRED` |

## Matriz executável

As ações válidas são `ANONYMIZE`, `DELETE`, `PRESERVE`, `PRESERVE_FOR_SECURITY`, `PRESERVE_FOR_IDEMPOTENCY`, `ORGANIZATION_OWNED` e `INVESTIGATE`. `PRIVACY_TABLE_CLASSIFICATION` cobre todas as tabelas do contrato. Tabelas novas tornam o teste de completude vermelho até receberem política explícita.

## Backups e exclusão

Backups históricos não são editados registro a registro. Eles seguem retenção e destruição próprias. Qualquer restauração deve ocorrer primeiro em ambiente isolado e reaplicar pedidos/tombstones antes de reativar contas. O schema atual não possui registry de supressão independente; criá-lo exigirá decisão arquitetural e migration futura, não incluída nesta sprint.
