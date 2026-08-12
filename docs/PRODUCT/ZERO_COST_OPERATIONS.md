# Sustentabilidade operacional e custo zero

**Status:** CURRENT — política operacional canônica da Sprint 27.3.1  
**Configuração mensurável:** `config/zero-cost-operational-budget.json`  
**Última revisão:** 12/08/2026

“Custo zero” é uma meta operacional do primeiro ano, não garantia comercial. Cotas, preços e termos externos devem ser conferidos pelo proprietário no plano vigente. O repositório prova arquitetura e frequência configurada; não prova consumo remoto.

## Classificação atual

**ZERO-COST PLAUSIBLE, MEASUREMENT REQUIRED.** Não há serviço pago obrigatório no runtime atual, e os lotes/intervalos são limitados. Entretanto, faltam consumo real, orçamento preenchido e limites atuais do plano para afirmar capacidade ou `ZERO-COST READY`.

## Inventário de consumo

| Recurso | O que consome | Frequência/proporção | Crescimento e redução segura |
|---|---|---|---|
| Pages | artefato estático e promoção manual | por release | builds menos frequentes; nunca reconstruir na promoção |
| Pages Functions | autenticação, APIs, jogos, CMS e administração | requisições de usuários/admins | cache somente de estáticos; não cachear `/api/*` |
| Worker agendado | Outbox, retry do Event Engine e reconciliação de Eventos | a cada minuto, mesmo vazio | avaliar intervalo após medir latência/backlog |
| D1 | leituras/escritas de todos os domínios | usuários, partidas, conteúdo e tempo | índices, queries bounded e retenção aprovada |
| Event Engine/Outbox | evento, checkpoint por consumer, leases e retries | conclusões de partidas | batches de até 100, backoff e dead letter |
| DAILY/FREE_PLAY/EVENT | seleção, itens, participação e uso | partidas; DAILY também por dia | preservar idempotência; aposentar derivados só com política |
| CMS/Biblioteca | item, versões, projeção e relações de assets | publicação/editorial | versões crescem lentamente; arquivar sem apagar histórico |
| Asset Registry | metadados e URLs; bytes ficam no host externo | assets editoriais | host/cotas ainda indisponíveis; evitar duplicatas |
| Analytics 2.0 | agregações D1 de 7/30 dias, custom até 90 | abertura administrativa | limitar frequência, janela e acesso; futura agregação diária |
| Logs | três operações + ciclo por minuto, erros e APIs | tempo + tráfego | amostragem/nível revisáveis; nunca remover erros críticos |
| GitHub Actions | install, testes, builds, browser smoke e promoção | push/PR/manual | cache/concurrency futuros, preservando Release Truth |
| Artifacts/backups | build 14 dias; backups cifrados 7 dias | Quality e operações remotas controladas | manter prazos curtos e custódia privada |

## D1: crescimento por domínio

| Classe | Estruturas principais | Observação |
|---|---|---|
| `bounded` | organizações, grupos, definições de conquistas/missões, progresso atual, MFA atual, catálogo de assets | limitadas por contas/configuração, embora catálogo possa expandir |
| `slowly growing` | `content_items`, `content_versions`, Biblioteca, comentários editoriais, Eventos e seus conteúdos/reservas | proporcional ao trabalho editorial e calendário |
| `usage-proportional` | seleções, itens, participações, usage, estatísticas/dias ativos, missões, conquistas, notificações, sessões | cresce com usuários, dias e partidas |
| `high-growth candidate` | XP/coin ledgers, `core_platform_events`, consumer processing, Outbox, audit logs, attempt answers, analytics/event usage | uma partida pode produzir múltiplas linhas e receipts |

Índices críticos estão declarados no contrato de schema. Eles reduzem leituras, mas aumentam bytes e writes; novos índices exigem evidência de query. As primeiras tabelas a acompanhar são ledgers, eventos/processamento, participações/usage, auditoria e Outbox.

## Cron de um minuto

`quiz-biblico-journey-awards` executa, independentemente, `dispatchQuizOutbox`, `retryOfficialCoreEvents` e `reconcilePlatformEvents`, cada uma com limite 100. `* * * * *` representa estruturalmente **1.440 invocações/dia** e 525.600/ano antes de tráfego. Ciclos vazios ainda fazem consultas indexadas e emitem logs.

Não há evidência de consumo remoto para mudar agora. Dois minutos reduzem invocações pela metade e elevam a latência típica de entrega; cinco minutos reduzem a aproximadamente um quinto, mas atrasam XP, missões, conquistas e encerramento de Eventos. Decisão futura: medir 30 dias de duração, backlog, rows read e latência; então escolher 1, 2 ou 5 minutos. Eventos ativos e backlog podem exigir um minuto.

## Outbox e consumers

- Outbox consulta somente estados pendentes/retry/lease vencida por índice, até 100; claim evita concorrência duplicada.
- Event Engine busca até 100 receipts vencidos e aplica limite solicitado; retries têm backoff e máximo de cinco tentativas.
- Dead letters não são repetidas indefinidamente, mas crescem até investigação aprovada.
- O custo ocioso é três consultas mais logs por minuto. Substituir polling por fila/evento seria mudança arquitetural pós-release.
- Não compactar eventos/ledgers antes de definir quais receipts sustentam idempotência, auditoria e reconstrução.

## Analytics 2.0

O período padrão é 7 dias, há 30 dias e custom limitado a 90. A resposta executa várias agregações concorrentes sobre participações, eventos, ledgers, dias ativos, conteúdo e uso; listas detalhadas têm limites de 10, 20, 24 ou 200. O risco cresce com partidas no período, sobretudo `json_extract`, `COUNT(DISTINCT)`, CTEs e agrupamentos de usage.

Mitigação inicial: manter acesso administrativo, intervalos máximos, índices e limites; evitar polling automático da tela. Se métricas reais mostrarem pressão, criar agregados diários reconstruíveis e aposentar detalhes somente após validação — não adicionar cache/warehouse agora.

## Retenção proposta (não executada)

| Classe | Dados | Política inicial proposta |
|---|---|---|
| `MUST_KEEP` | migration ledger, saldo/progresso atual, ledgers de economia necessários à idempotência, conteúdo/versões publicadas, segurança e auditoria sob obrigação aprovada | preservar; revisão jurídica antes de qualquer descarte |
| `RETENTION_CANDIDATE` | sessões expiradas, recovery/login challenges usados/expirados, notificações lidas, Outbox entregue/dead letter resolvida, logs operacionais | 30–90 dias conforme domínio; segurança/auditoria exige aprovação |
| `AGGREGATE_THEN_RETIRE` | participações/usage antigos, eventos processados, detalhes de Analytics, dias/atividade granular | agregar por dia/mês; considerar 12–18 meses de detalhe após medir necessidade |
| `EPHEMERAL` | leases, desafios expirados, artefatos temporários, dumps em claro, snapshots locais | menor prazo tecnicamente seguro; dumps em claro removidos imediatamente |

Backups integrais: manter proposta existente de RPO 24h, sete diários cifrados e ensaio trimestral; backups pré-migration continuam obrigatórios. Artifacts atuais de backup têm sete dias e build, 14 dias. Retenção legal e custódia externa continuam decisões humanas.

## Orçamento e medição

O JSON canônico não contém quota comercial. O proprietário preenche `referenceBudget`, `source` e `lastReviewedAt` após conferir painéis/planos. Estado relativo:

- `NORMAL`: abaixo de 50%;
- `OBSERVAR`: 50% ou mais;
- `ATENÇÃO`: 70% ou mais;
- `CRÍTICO`: 85% ou mais.

`DERIVED`: apenas frequência do Cron e características estáticas. `MANUAL`: Pages, Functions/Worker, D1, logs, Actions e artifacts dependem de painéis. `UNAVAILABLE`: host/custo de assets e monitor externo ainda não configurados. Não há medição `AUTOMATIC` de cotas nesta baseline.

## Modelo de capacidade

Modelo relativo para planejamento, não promessa:

| Perfil | Partidas/dia (hipótese configurável) | Efeito estrutural |
|---|---:|---|
| casual | 1–2 | participação/seleção, evento de conclusão, consumer receipts e 1–2 lançamentos por recompensa aplicável |
| regular | 4–7 | crescimento aproximadamente linear; DAILY + FREE_PLAY e missões |
| muito engajado | 10–20 | ledgers/eventos/usage dominam; limites econômicos reduzem prêmio, não necessariamente writes |

Uma conclusão gera múltiplas writes transacionais e de consumers; a quantidade exata varia por missão, conquista, modo e retry. Sem quotas externas e métricas de rows/request, **capacidade em usuários requer limites externos + medição real**.

## Degradação segura

1. reduzir telemetria informativa e atualização automática de Analytics;
2. aumentar, com decisão do proprietário, intervalo de reconciliações não urgentes;
3. reduzir retenção de logs/dados derivados já agregados;
4. suspender consultas administrativas analíticas pesadas;
5. reduzir cosméticos/assets não essenciais.

Preservar autenticação, partidas, progresso, economia, segurança, integridade, dados do usuário, recuperação e Eventos ativos. Nunca “economizar” ignorando writes, retries, backups ou gates de release.

## Alertas futuros sem fornecedor obrigatório

Revisão semanal manual até existir integração: avisar em 50/70/85% do orçamento, crescimento acima de duas vezes a tendência recente, Outbox nos thresholds técnicos, Cron sem heartbeat, backup/reconciliação falhos e D1/storage acima da tendência. O heartbeat persistido e a coleta automática de cotas exigiriam telemetria/migration/API externa e ficam fora desta sprint.

## Decisões do proprietário

1. preencher mensalmente orçamento e consumo dos painéis Cloudflare/GitHub;
2. decidir o intervalo do Cron somente após 30 dias de medição;
3. aprovar retenção com revisão jurídica/privacidade;
4. definir host/licença/orçamento de assets;
5. escolher responsável e canal gratuito de alertas;
6. remover bloqueio operacional de MFA (`MFA_ENCRYPTION_KEY` + promoção controlada da 0039) separadamente.

Nenhuma migration, limpeza, alteração de Cron ou operação remota integra esta política.
