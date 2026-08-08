# Phase 5 Legacy Audit Backlog

Status: inventário para a Sprint 24.1  
Data: 03/08/2026

## 1. Critérios

| Classificação | Uso na Fase 5 |
| --- | --- |
| Remover | não participa do fluxo principal e possui substituto comprovado; remover somente após teste de ausência de uso |
| Substituir | ainda atende um fluxo real, mas deve migrar para contrato universal antes da remoção |
| Manter temporariamente | necessário para compatibilidade, operação ou evidência histórica no rollout atual |
| Investigar | uso, dependência externa ou obrigação de retenção ainda não está suficientemente demonstrado |

Nenhum item deste inventário foi removido na Fase 4.

## 2. Rotas do participante

| Item | Classificação | Dependências | Próxima ação sugerida |
| --- | --- | --- | --- |
| `/jornada` | Substituir | `/api/journey`, `/api/rounds/current`, attempts e rounds | redirecionar para `/jogos` somente depois de comprovar que não há links externos ou piloto ativo |
| `/rankings` | Manter temporariamente | `/api/rankings`, attempts, rounds, perfis públicos | decidir se ranking competitivo continuará como módulo opcional ou será aposentado |
| `/medalhas` | Manter temporariamente | `/api/badges`, `user_badges`, Worker de premiações | preservar enquanto medalhas históricas e notificações apontarem para esta rota |
| `/temporadas` | Investigar | `/api/seasons`, snapshots e prêmios sazonais | confirmar uso real e política de retenção antes de decidir substituir ou remover |
| `/jogar?legacy=1` | Remover | ponte `LEGACY_READ_ONLY`, `QUIZ_LEGACY_FALLBACK_ENABLED` | remover após confirmar 984 perguntas publicadas/elegíveis em todas as organizações e desativar a flag |
| `/jogos/modo-livre` | Remover | redirect para `/jogos` | manter por uma janela de compatibilidade de links; depois retirar rota e teste de redirect |
| `/perfil/publico` | Investigar | rankings e visibilidade do perfil legado | decidir junto com o futuro do ranking comunitário |
| `/revisao-inteligente` | Investigar | revisão/Quiz legado | mapear chamadas e valor antes de migrar ou aposentar |

## 3. Rotas administrativas legadas

| Área | Rotas | Classificação | Próxima ação sugerida |
| --- | --- | --- | --- |
| Perguntas legadas | `/admin/perguntas` e subáreas `base`, `arquivadas`, `colaboracao`, `duplicadas`, `ia`, `importar`, `revisao` | Substituir | mover capacidades ainda necessárias para CMS Universal e preservar somente leitura durante transição |
| Jornadas/Rodadas | `/admin/rodadas`, `lista`, `detalhes`, `importar`, `/admin/rodada1` | Manter temporariamente | manter para operação e evidência de jornadas existentes; retirar do menu antes de remover APIs |
| Temporadas | `/admin/temporadas` e `detalhes` | Investigar | decidir se o conceito será substituído por Eventos ou mantido como competição independente |
| Calendário legado | `/admin/calendario` | Investigar | separar eventos de Jornada de Eventos da plataforma |
| Diagnóstico | `/admin/diagnostico` | Manter temporariamente | ainda acompanha Worker, medalhas e estruturas legadas; modularizar depois |

## 4. APIs legadas

### Jornada, rodadas e tentativas

- `functions/api/journey.ts`
- `functions/api/journey/[roundId].ts`
- `functions/api/rounds/current.ts`
- `functions/api/rounds/status.ts`
- `functions/api/attempts/start.ts`
- `functions/api/attempts/[id]/answer.ts`
- `functions/api/attempts/[id]/advance.ts`
- `functions/api/attempts/[id]/finish.ts`
- `functions/api/admin/rounds.ts`
- `functions/api/admin/rounds/[id].ts`
- `functions/api/admin/rounds/[id]/duplicate.ts`
- `functions/api/admin/round-one.ts`

Classificação: **manter temporariamente**, seguida de **substituir/remover**. Ainda preservam o Quiz competitivo histórico, ranking, medalhas e operações de fechamento. Não devem ser removidas até o desligamento coordenado do Worker de premiações e a retenção dos resultados históricos estar definida.

### Ranking, medalhas e temporadas

- `functions/api/rankings.ts`
- `functions/api/badges.ts`
- `functions/api/seasons.ts`
- `functions/api/seasons/[id].ts`
- `functions/api/admin/seasons.ts`
- `functions/api/admin/seasons/[id].ts`
- `functions/api/admin/seasons/[id]/dashboard.ts`

Classificação: **investigar/manter temporariamente**. Medalhas específicas do Quiz não são Conquistas da plataforma; a decisão de produto precisa anteceder qualquer remoção.

### Banco de perguntas anterior ao CMS

- `functions/api/admin/questions.ts` e subrotas;
- `functions/_lib/universal-content-importer.ts`;
- `shared/content/adapters/quiz-legacy.ts`;
- `functions/api/admin/content/migrate-legacy-quiz.ts`.

Classificação: APIs de edição **substituir**; importador e adapter **manter temporariamente** como ferramenta controlada e auditável. O endpoint administrativo continua sendo o único caminho autorizado a escrever a migração; fluxos de jogador não o invocam.

## 5. Componentes e navegação

| Arquivo/estrutura | Classificação | Motivo |
| --- | --- | --- |
| `app/journey-card-state.ts` | Remover | modelo visual exclusivo de Jornada, sem uso na Home universal |
| `app/journey.css` | Investigar | confirmar seletores ainda usados por rotas legadas antes de excluir |
| `app/medals.css` | Manter temporariamente | necessário enquanto `/medalhas` existir |
| `app/LearningQuickNav.tsx` — rotas `/jornada`, `/rankings`, `/medalhas` | Substituir | menu principal da plataforma usa Home/Jogos/Recompensas/Perfil; entradas antigas ainda constam no contrato auxiliar |
| `app/ParticipantPageHeader.tsx` — suporte às rotas legadas | Substituir | migrar páginas mantidas para o chrome da plataforma ou retirar junto com elas |
| `app/navigation.tsx` — Jornada, Ranking, Medalhas e administração de rodadas | Manter temporariamente | separar catálogo ativo de links contextuais/legados na Sprint 24.1 |
| `app/jogar/page.tsx` — ramo `legacy=1` | Remover | ponte de leitura do Quiz anterior ao CMS |

## 6. Serviços e Workers

| Item | Classificação | Condição de saída |
| --- | --- | --- |
| `functions/_lib/rounds.ts` | Manter temporariamente | nenhuma Jornada ativa e APIs antigas desligadas |
| `functions/_lib/ranking.ts` | Investigar | decisão de produto sobre ranking comunitário |
| `functions/_lib/badges.ts` | Manter temporariamente | migração/retirada das medalhas históricas |
| `functions/_lib/round-awards.ts` | Manter temporariamente | backlog de premiação zerado e Worker desacoplado |
| Worker `workers/journey-awards` | Manter temporariamente | nenhuma rodada pendente, medalhas reconciliadas e operação substituta aprovada |
| `QUIZ_LEGACY_FALLBACK_ENABLED` | Remover | acervo universal confirmado suficiente em todas as organizações |
| resolução de permissões `legacyLeader` | Investigar | definir papéis explícitos sem quebrar líderes existentes |

## 7. Tabelas e índices exclusivamente ou predominantemente legados

### Competição do Quiz

- `rounds`;
- `round_questions`;
- `attempts`;
- `attempt_answers`;
- tabelas/checkpoints `round_award_processing` e `round_award_participant_processing`;
- `user_badges`;
- estruturas relacionadas de escolhas/perguntas materializadas para rodadas.

Classificação: **manter temporariamente**. São evidência histórica e suportam ranking/medalhas/diagnóstico. A futura remoção exige política de exportação ou anonimização, prova de inexistência de FK ativa e migration aditiva própria; nunca apagar na mesma sprint que remove a UI.

### Conteúdo editorial anterior

- `question_bank`;
- `question_bank_choices`;
- `question_collaborators`;
- `question_revisions`;
- colunas de origem legada em `questions`.

Classificação: **manter temporariamente**, depois **arquivar/remover**. Primeiro confirmar o mapeamento estável de todos os IDs no CMS e que nenhum relatório administrativo depende dessas tabelas.

### Temporadas

- `seasons`;
- `season_snapshots`;
- `season_awards`;
- colunas sazonais em `rounds`.

Classificação: **investigar**. Eventos não são automaticamente substitutos de temporadas; a decisão precisa ser explícita.

## 8. Referências visuais e textuais

Classificação geral: **substituir** quando a rota permanecer; **remover** junto com a rota quando aposentada.

- linguagem de “Jornada”, “rodada”, “ranking” e “medalha” em telas públicas antigas;
- chrome e CSS específicos das páginas `/jornada`, `/rankings`, `/medalhas` e `/temporadas`;
- notificações de `user_badges` que usam o título “Medalha conquistada” e apontam para `/medalhas`;
- textos legais que ainda descrevem Jornadas e rankings como finalidade central;
- relatórios/diagnósticos administrativos centrados no Worker de premiações;
- documentos históricos anteriores à plataforma modular.

Textos legais só podem ser atualizados com nova revisão humana/jurídica e versionamento apropriado.

## 9. Sequência segura sugerida para a Fase 5

1. confirmar contagens universais por organização e desativar a flag de fallback;
2. observar o Quiz sem fallback por uma janela controlada;
3. retirar o ramo `legacy=1` e o adapter de leitura, preservando o importador administrativo;
4. remover links legados do menu sem apagar rotas/APIs;
5. decidir produto e retenção para ranking, medalhas e temporadas;
6. migrar páginas mantidas para o chrome universal;
7. encerrar Jornadas e reconciliar Worker/backlogs;
8. tornar APIs legadas somente leitura e medir uso;
9. exportar/preservar evidências históricas;
10. somente então propor migrations aditivas de arquivamento/remoção em sprints separadas.

## 10. Gates obrigatórios antes de qualquer remoção

- nenhuma chamada ativa observada para o item durante a janela definida;
- cobertura de rota substituta e rollback documentado;
- confirmação de integridade e retenção de dados históricos;
- isolamento organizacional preservado;
- backup validado em D1 separado;
- nenhuma dependência do Worker ou diagnóstico pendente;
- alteração feita em branch própria ou diretamente na `main` quando houver autorização explícita, sem misturar limpeza com nova funcionalidade.
