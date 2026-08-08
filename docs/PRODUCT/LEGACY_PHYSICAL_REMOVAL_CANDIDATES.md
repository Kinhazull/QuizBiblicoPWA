# Candidatos à remoção física do legado

Status: inventário pós-Sprint 24.3. Nenhuma tabela foi removida e nenhuma migration foi criada.

| Tabela/estrutura | Último consumidor conhecido | Escrita ativa | Leitura ativa | Necessidade histórica | FKs/dependências principais | Candidata futura |
| --- | --- | --- | --- | --- | --- | --- |
| `rounds` | APIs e administração histórica de Jornadas, ranking e diagnóstico | sim, somente por rotas administrativas diretas preservadas | sim | alta | `questions`, `attempts`, temporadas e checkpoints | não, até desativar APIs e definir retenção |
| `questions` / `choices` | tentativas e revisão histórica de Jornada | sim, somente legado administrativo | sim | alta | `rounds`, `attempt_answers` | não, até prova de ausência de uso |
| `attempts` / `attempt_answers` | ranking, perfil e histórico do Quiz anterior | não pelo fluxo moderno | sim | alta | usuários, rounds, questions e choices | não, requer exportação/anonimização |
| `round_award_processing` / `round_award_participant_processing` / `round_badge_reconciliations` | diagnóstico e evidência do antigo job | não | sim, operacional/histórica | média/alta | `rounds`, usuários | sim, após backlog confirmado e retenção aprovada |
| `user_badges` | `/api/badges`, `/medalhas`, exportação e backup | não | sim | alta | usuários | não, enquanto leitura histórica existir |
| `seasons` / `season_snapshots` / `season_awards` | APIs e páginas sazonais diretas | sim, somente rotas administrativas diretas | sim | alta | rounds e usuários | não, decisão de produto pendente |
| `question_bank` / `question_bank_choices` | editor legado e importador administrativo para CMS | sim | sim | alta | colaboradores, revisões, origem em `questions` | não, até CMS substituir todas as capacidades |
| `question_collaborators` / `question_revisions` | colaboração e auditoria editorial legadas | sim | sim | alta | `question_bank` | não, até política editorial/retentiva |
| `ai_question_suggestions` | endpoint dormente, backup e diagnóstico | não | somente operacional | indeterminada | `question_bank` opcional | sim, após decisão formal e retenção |

## Condições gerais antes de remover

1. comprovar ausência de leitura e escrita em runtime e administração;
2. exportar ou anonimizar evidências conforme política de retenção;
3. levantar todas as FKs e consumidores operacionais;
4. validar backup/restauração em D1 isolado;
5. propor migration própria, revisão do reconciliador e rollback;
6. promover somente pelo fluxo operacional controlado.
