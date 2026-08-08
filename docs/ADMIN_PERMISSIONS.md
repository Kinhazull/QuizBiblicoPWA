# Permissões Administrativas

## Domínios modernos

| Permissão | Domínio |
| --- | --- |
| `content.manage` | CMS e acervo universal |
| `events.manage` | Eventos da plataforma |
| `operations.view` | health e diagnóstico operacional |
| `privacy.manage` | solicitações e operação de privacidade |
| `economy.manage` | futuras operações administrativas da economia |
| `analytics.view` | Analytics agregados da plataforma |

Admin mantém acesso total. Leader mantém o acesso legado existente. Permissões explícitas continuam armazenadas em `user_permissions`; não foi criado outro sistema de autorização.

## Ponte de compatibilidade

A compatibilidade é unidirecional e temporária: `questions.edit → content.manage`, `rounds.manage → events.manage`, `reports.view → operations.view`, `members.manage → privacy.manage`, `reports.view → economy.manage` e `reports.view → analytics.view`. Assim, grants históricos continuam funcionando, enquanto código moderno solicita a permissão semântica moderna. Um grant moderno não amplia automaticamente o acesso a endpoints históricos.

`/api/auth/me` expõe as permissões efetivas normalizadas, sem duplicatas. A navegação é conveniência visual; toda API continua protegida no servidor.

