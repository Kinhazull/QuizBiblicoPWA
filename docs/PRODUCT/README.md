# Produto — Conte os Feitos

Esta pasta reúne visão, arquitetura, decisões, implementações e histórico da plataforma de Jogos e Desafios Bíblicos.

## Fonte de verdade

- Estado operacional corrente: `docs/AI/CURRENT_STATE.md`.
- Roadmap aprovado: `docs/PRODUCT/ROADMAP.md`.
- Pendências complementares: `BACKLOG.md`.
- Decisões: `docs/PRODUCT/DECISION_LOG.md`.
- Histórico de releases: `CHANGELOG.md` e documentos de release.

Documentos antigos são evidência histórica. Quando divergirem do estado corrente, não devem ser tratados como instrução atual.

## Estado atual

- Fases 1–7 e preparação técnica da Fase 8 concluídas.
- Validação manual e estabilização pré-v2 (`27.7.4–27.7.5`) em andamento.
- Sete jogos integrados ao CMS e à infraestrutura universal.
- Modos `FREE_PLAY`, `DAILY` e `EVENT` disponíveis.
- Wordle 2.0, importação universal guiada e rodada de consolidação mobile estão implementados na `main` e aguardam revalidação final no artifact promovido.
- A Matriz Editorial v2 e o inventário local estão concluídos. O primeiro lote Wordle foi aprovado; 877 candidatos Wordle e 3.040 candidatos dos outros cinco jogos foram produzidos sob autorização de lote conjunto. Todos os candidatos não aprovados permanecem como DRAFT e aguardam revisão humana antes de qualquer importação.
- `v1.0.0` preservada como tag histórica do piloto do Quiz.
- Primeira release formal da plataforma prevista como `v2.0.0`, ainda sem tag ou autorização pública.

## Documentos principais

| Documento | Finalidade |
| --- | --- |
| `ROADMAP.md` | sequência oficial até a v2.0.0 e histórico das fases |
| `RELEASE_SNAPSHOT.md` | baseline, Release Truth e decisão corrente de release |
| `V2_RC_MANUAL_VALIDATION_CHECKLIST.md` | revalidação participante/administrativa antes do Go/No-Go |
| `PRE_PHASE_5_COMPREHENSIVE_AUDIT.md` | auditoria consolidada anterior à Fase 5 |
| `PHASE_5_LEGACY_AUDIT_BACKLOG.md` | inventário técnico do legado |
| `DEPRECATIONS.md` | registro operacional das estruturas em retirada |
| `PHASE_4_RELEASE_CANDIDATE.md` | estado consolidado da Fase 4 |
| `PHASE_4_ARCHITECTURE_DESIGN.md` | arquitetura da plataforma universal |
| `CORE_PLATFORM_ARCHITECTURE.md` | serviços compartilhados |
| `GAME_INTEGRATION_CONTRACT.md` | contrato dos jogos com a plataforma |
| `EDITORIAL_ARCHITECTURE.md` | contratos editoriais do CMS |
| `CONTENT_SCALE_UP_V2_EDITORIAL_MATRIX.md` | metas, diversidade, identidade dos jogos e gates dos lotes v2 |
| `CONTENT_SCALE_UP_V2_INVENTORY.md` | fontes locais, unidades canônicas, lacunas e plano de lotes v2 |
| `CONTENT_SCALE_UP_V2_REMAINING_GAMES_REVIEW.md` | checklist conjunto dos 3.040 candidatos de Timeline, Memória, Associação, Quem Sou Eu? e Três Pistas |

## Regra documental

Novos documentos devem referenciar a fonte oficial em vez de criar outro “estado atual”. Decisões históricas não são apagadas; quando superadas, recebem status e substituto explícitos.
