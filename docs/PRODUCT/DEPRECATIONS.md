# Deprecações e compatibilidade

**Status:** CURRENT
Nenhum item é removido apenas por esta classificação.

| Superfície | Estado | Substituto / condição de retirada |
|---|---|---|
| `/rankings` | **CURRENT** | Ranking Universal moderno. Não é legado. |
| tabelas/handlers do ranking histórico do Quiz | LEGACY | Retirar apenas após provar ausência de consumidores e preservar histórico necessário. |
| `/medalhas` e Medalhas do Quiz | LEGACY COMPATIBILITY | Conquistas modernas da plataforma são o substituto; preservar enquanto houver dados/links históricos. |
| `/temporadas` do Quiz | LEGACY / INVESTIGATE | Eventos modernos substituem o conceito participante; auditar dependências antes de retirar. |
| Jornada como fluxo principal | DEPRECATED | Loader/Providers e modos universais; manter somente compatibilidade explicitamente necessária. |
| `/jogos/modo-livre` redirect antigo | REDIRECT | Catálogo moderno `/jogos`; remover após janela de compatibilidade e telemetria. |
| `/jogar?legacy=1` | REMOVED FROM MAIN FLOW | Não reintroduzir; eventual referência histórica não autoriza runtime legado. |
| `QUIZ_LEGACY_FALLBACK_ENABLED` | REMOVED / HISTORICAL | CMS → Biblioteca → Gerador → Loader é o fluxo oficial. |
| editor/APIs administrativas de perguntas anteriores ao CMS | LEGACY COMPATIBILITY | CMS Universal; retirar após inventário de rotas, permissões e integrações. |
| rotas administrativas antigas | INVESTIGATE | Central Administrativa e módulos modernos; acesso direto pode permanecer durante transição. |
| perfil público legado | INVESTIGATE | Perfil 2.0 autenticado; decisão de privacidade necessária antes de substituição pública. |
| status editoriais antigos compatíveis | TEMPORARY COMPATIBILITY | Contrato editorial moderno; retirar após dados e clientes estarem normalizados. |
| URL direta de cover asset | TEMPORARY COMPATIBILITY | Asset Registry/hospedagem aprovada e CSP definida. |
| nome técnico `journey-awards` | KEEP | Identidade operacional histórica; renomear só com plano específico de risco. |
| grants/permissões históricas | TEMPORARY BRIDGE | Permissões semânticas modernas; ponte é unidirecional e não amplia autorização. |
| `GAME_FINISHED` v1 | LEGACY CONTRACT | v2 é canônico; retirar após confirmar ausência de eventos/replay v1 necessários. |
| sugestões de IA desativadas | DORMANT | Manter inativas até decisão arquitetural, jurídica e de custo. |

Ranking Universal e Conquistas da plataforma são atuais. Ranking histórico, Jornadas e Medalhas do Quiz são conceitos distintos e não devem ser confundidos com seus equivalentes modernos.
