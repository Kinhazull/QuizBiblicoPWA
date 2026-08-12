# Deprecações e compatibilidade

**Status:** CURRENT
Nenhum item é removido apenas por esta classificação.

| Superfície | Estado | Substituto / condição de retirada |
|---|---|---|
| `/rankings` | **CURRENT** | Ranking Universal moderno. Não é legado. |
| tabelas/handlers do ranking histórico do Quiz | LEGACY | Retirar apenas após provar ausência de consumidores e preservar histórico necessário. |
| `/medalhas` e Medalhas do Quiz | REDIRECTED / HISTORICAL | `/medalhas` redireciona para `/recompensas`; dados e API históricos permanecem preservados fora da navegação moderna. |
| `/temporadas` do Quiz | LEGACY / INVESTIGATE | Eventos modernos substituem o conceito participante; auditar dependências antes de retirar. |
| `/jornada` e Jornada como fluxo principal | REDIRECTED / HISTORICAL | `/jornada` redireciona para `/jogos`; Loader/Providers e modos universais são o fluxo atual. Dados e APIs históricas permanecem preservados. |
| `/jogos/modo-livre` redirect antigo | REDIRECT | Catálogo moderno `/jogos`; remover após janela de compatibilidade e telemetria. |
| `/jogar?legacy=1` | REMOVED FROM MAIN FLOW | Não reintroduzir; eventual referência histórica não autoriza runtime legado. |
| `QUIZ_LEGACY_FALLBACK_ENABLED` | REMOVED / HISTORICAL | CMS → Biblioteca → Gerador → Loader é o fluxo oficial. |
| editor/APIs administrativas de perguntas anteriores ao CMS | HISTORICAL, HIDDEN FROM NAVIGATION | CMS Universal substitui revisão, importação e colaboração antigas na navegação. Rotas/APIs diretas permanecem até prova de ausência de consumidores e decisão de retenção. |
| `/admin/analises` | REDIRECTED | Analytics 2.0 em `/admin/analytics`; endpoint analítico histórico permanece preservado enquanto relatórios antigos forem auditados. |
| perfil público legado | HISTORICAL / OWNER DECISION | Atalho administrativo removido; `/perfil/publico` e `/api/profile/:id` permanecem por privacidade e compatibilidade até decisão explícita sobre perfil social público. |
| grupos admin Progressão/Economia vazios | REMOVED | Analytics 2.0 já oferece a visão agregada existente. Uma área operacional especializada só será criada se surgir requisito distinto, sem duplicar Analytics. |
| status editoriais antigos compatíveis | TEMPORARY COMPATIBILITY | Contrato editorial moderno; retirar após dados e clientes estarem normalizados. |
| URL direta de cover asset | TEMPORARY COMPATIBILITY | Asset Registry/hospedagem aprovada e CSP definida. |
| nome técnico `journey-awards` | KEEP | Identidade operacional histórica; renomear só com plano específico de risco. |
| grants/permissões históricas | TEMPORARY BRIDGE | Permissões semânticas modernas; ponte é unidirecional e não amplia autorização. |
| `GAME_FINISHED` v1 | LEGACY CONTRACT | v2 é canônico; retirar após confirmar ausência de eventos/replay v1 necessários. |
| sugestões de IA desativadas | DORMANT | Manter inativas até decisão arquitetural, jurídica e de custo. |

Ranking Universal e Conquistas da plataforma são atuais. Ranking histórico, Jornadas e Medalhas do Quiz são conceitos distintos e não devem ser confundidos com seus equivalentes modernos.
