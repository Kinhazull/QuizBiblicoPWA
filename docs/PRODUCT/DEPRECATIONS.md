# Deprecações da plataforma

Este registro acompanha estruturas ainda presentes, mas destinadas a substituição ou retirada. Nenhum item deve ser removido sem cumprir sua condição de saída e validar rollback.

| Item | Status | Substituto | Condição para remoção | Dependências | Sprint prevista |
| --- | --- | --- | --- | --- | --- |
| `/jogar?legacy=1` | Deprecado, ativo como fallback de leitura | Quiz via CMS → Biblioteca → Gerador → Loader | 984 perguntas universais confirmadas em todas as organizações, flag desativada e janela sem fallback | `app/jogar/page.tsx`, adapter e flag | 24.3 |
| `QUIZ_LEGACY_FALLBACK_ENABLED` | Deprecado | catálogo universal elegível | operação universal comprovada sem fallback | configuração de ambiente e fluxo do Quiz | 24.3 |
| `/jogos/modo-livre` | Compatibilidade de rota | `/jogos` | janela de compatibilidade concluída e ausência de links ativos | redirect e testes de navegação | 24.3 |
| Jornada como fluxo principal | Histórico/legado | catálogo universal e modos Livre, Diário e Evento | decisão sobre retenção, links e jornadas ativas | rounds, attempts, UI e documentos legais | 24.3 |
| editor/APIs de perguntas anteriores ao CMS | Em substituição | CMS Universal | capacidades necessárias migradas e uso legado somente leitura/zerado | `question_bank`, rotas administrativas e importador | 24.3/24.6 |
| `/rankings` | Em decisão | Analytics/competição futura, se aprovada | decisão de produto e preservação histórica | attempts, rounds e perfis públicos | 24.3/24.5 |
| `/medalhas` e `user_badges` | Em decisão | Conquistas da plataforma não são substituto automático | notificações migradas, histórico preservado e decisão de produto | Worker, ranking e notificações | 24.3 |
| `/temporadas` e estruturas sazonais | Investigar | Eventos ou temporadas futuras de colecionáveis | decisão explícita de produto e retenção | seasons, snapshots, awards e rounds | 24.3 |
| Worker `journey-awards` como nome/domínio legado | Manter operacionalmente | executor de plataforma a definir | backlog legado zerado, responsabilidades migradas e plano operacional aprovado | Cron, outbox, retry e premiações | 24.1/24.3 |
| `legacyLeader` | Compatibilidade | permissões explícitas | papéis migrados sem perda de acesso | autenticação e administração | 24.5 |
| `GAME_FINISHED` v1 | Compatibilidade de contrato | `GAME_FINISHED` v2 | todos os produtores e eventos históricos tratados | Event Engine, outbox e consumers | posterior |
| página de sugestões com IA | Redirect/dormente | decisão futura | reativação controlada ou retirada formal | flag, endpoint, tabela e CSS | 24.3 ou posterior |

O inventário detalhado de rotas, APIs, componentes, serviços e tabelas permanece em `PHASE_5_LEGACY_AUDIT_BACKLOG.md`.

