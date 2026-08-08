# Deprecações da plataforma

Este registro acompanha estruturas ainda presentes, mas destinadas a substituição ou retirada. Nenhum item deve ser removido sem cumprir sua condição de saída e validar rollback.

| Item | Status | Substituto | Condição para remoção | Dependências | Sprint prevista |
| --- | --- | --- | --- | --- | --- |
| `/jogar?legacy=1` | **REMOVED** do runtime | Quiz via CMS → Biblioteca → Gerador → Loader | concluída | dados/importador histórico preservados | 24.3 |
| `QUIZ_LEGACY_FALLBACK_ENABLED` | **REMOVED** | catálogo universal elegível | concluída | nenhuma | 24.3 |
| `/jogos/modo-livre` | Compatibilidade de rota | `/jogos` | janela de compatibilidade concluída e ausência de links ativos | redirect e testes de navegação | 24.3 |
| Jornada como fluxo principal | **DISABLED** na navegação ativa; histórico preservado | catálogo universal e modos Livre, Diário e Evento | medir uso direto e concluir retenção antes de retirar rotas/APIs | rounds, attempts e histórico | posterior |
| editor/APIs de perguntas anteriores ao CMS | Em substituição | CMS Universal | capacidades necessárias migradas e uso legado somente leitura/zerado | `question_bank`, rotas administrativas e importador | 24.3/24.6 |
| `content_items.status` como estado editorial | Compatibilidade operacional | `content_items.editorial_status` | todos os leitores editoriais migrados | CMS, Biblioteca e importadores | posterior à 24.6 |
| URL direta de capa de Evento | Fallback histórico | `cover_asset_id` via Asset Registry | Eventos existentes migrados de forma controlada | Eventos e storage futuro | posterior à 24.6 |
| `/rankings` | **HISTORICAL_PRESERVED / DEFERRED** | ranking universal futuro | decisão de produto e preservação histórica | attempts, rounds e perfis públicos | posterior |
| `/medalhas` e `user_badges` | **HISTORICAL_PRESERVED**; geração automática desativada | Conquistas da plataforma | política de exportação/retenção e retirada de consumidores diretos | API histórica e dados | posterior |
| `/temporadas` e estruturas sazonais | **DEFERRED / HISTORICAL_PRESERVED**; fora da navegação | decisão futura explícita | política de produto e retenção | seasons, snapshots, awards e rounds | posterior |
| Worker `journey-awards` como nome/domínio legado | **ACTIVE_BY_DECISION** | executor moderno no recurso técnico existente | eventual renome somente com plano operacional próprio | Cron, outbox, retry e Eventos | não renomear na Fase 5 |
| `legacyLeader` | Compatibilidade | permissões explícitas | papéis migrados sem perda de acesso | autenticação e administração | 24.5 |
| permissões históricas em recursos modernos (`questions.edit`, `rounds.manage`, `reports.view`, `members.manage`) | Ponte de compatibilidade ativa | `content.manage`, `events.manage`, `operations.view`, `privacy.manage`, `economy.manage`, `analytics.view` | grants administrativos migrados e telemetria de uso confirmada | `user_permissions`, `/api/auth/me`, navegação e guards server-side | posterior à 24.5 |
| `GAME_FINISHED` v1 | Compatibilidade de contrato | `GAME_FINISHED` v2 | todos os produtores e eventos históricos tratados | Event Engine, outbox e consumers | posterior |
| página de sugestões com IA | Redirect/dormente | decisão futura | reativação controlada ou retirada formal | flag, endpoint, tabela e CSS | 24.3 ou posterior |

O inventário detalhado de rotas, APIs, componentes, serviços e tabelas permanece em `PHASE_5_LEGACY_AUDIT_BACKLOG.md`.
