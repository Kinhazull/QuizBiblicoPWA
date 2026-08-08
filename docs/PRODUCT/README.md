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

- Fases 1–4 concluídas.
- Fase 5 em andamento.
- Sete jogos integrados ao CMS e à infraestrutura universal.
- Modos `FREE_PLAY`, `DAILY` e `EVENT` disponíveis.
- `v1.0.0` preservada como tag histórica do piloto do Quiz.
- Primeira release formal da plataforma prevista como `v2.0.0`, ainda sem tag.

## Documentos principais

| Documento | Finalidade |
| --- | --- |
| `ROADMAP.md` | sequência oficial da Fase 5 e histórico das fases |
| `PRE_PHASE_5_COMPREHENSIVE_AUDIT.md` | auditoria consolidada anterior à Fase 5 |
| `PHASE_5_LEGACY_AUDIT_BACKLOG.md` | inventário técnico do legado |
| `DEPRECATIONS.md` | registro operacional das estruturas em retirada |
| `PHASE_4_RELEASE_CANDIDATE.md` | estado consolidado da Fase 4 |
| `PHASE_4_ARCHITECTURE_DESIGN.md` | arquitetura da plataforma universal |
| `CORE_PLATFORM_ARCHITECTURE.md` | serviços compartilhados |
| `GAME_INTEGRATION_CONTRACT.md` | contrato dos jogos com a plataforma |
| `EDITORIAL_ARCHITECTURE.md` | contratos editoriais do CMS |

## Regra documental

Novos documentos devem referenciar a fonte oficial em vez de criar outro “estado atual”. Decisões históricas não são apagadas; quando superadas, recebem status e substituto explícitos.
