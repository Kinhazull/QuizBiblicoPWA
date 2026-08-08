# Analytics da Plataforma

## Objetivo e fonte de dados

Analytics é uma leitura agregada por organização sobre dados operacionais já existentes. Não cria tracking paralelo, não envia dados a terceiros e não expõe usuário, e-mail, respostas ou payloads de partida.

Fontes: `generated_game_participations`, `platform_event_participations`, `generated_game_participation_usage`, eventos oficiais `GAME_FINISHED`, Biblioteca Universal, projeções de estatísticas, progresso e ledgers de XP/moedas. A organização é sempre derivada da sessão.

## Contrato

`GET /api/admin/platform-analytics?period=today|7d|30d` requer `analytics.view`. Períodos personalizados aceitam `period=custom&from=<epoch-ms>&to=<epoch-ms>`, limitados a 90 dias. A resposta usa `Cache-Control: no-store, private`.

O endpoint retorna visão geral, modos `FREE_PLAY`, `DAILY` e `EVENT`, sete jogos, Diário, Eventos, conteúdo, retenção e economia. Consultas são agregadas, parametrizadas, em quantidade constante e sem consultas por usuário.

## Semântica das métricas

- iniciada: participação com `started_at`;
- concluída: estado `FINISHED`;
- abandonada: estado `EXPIRED` após início;
- vitória/derrota: resultado persistido do Evento ou resultado oficial protegido de `GAME_FINISHED`;
- tempo médio: apenas participações com início e fim persistidos;
- usuário recorrente: ativo no período e com atividade anterior;
- conteúdo usado: item registrado em `generated_game_participation_usage` no período;
- moedas gastas: ledgers aplicados com origem `shop_purchase`.

Não interpretar `returningUsers` como retenção formal D1/D7. Abertura do Diário e conclusão integral de Evento estão marcadas como `unavailable`, pois não possuem projeção histórica confiável. Dificuldade/categoria/tema consumidos ficarão para evolução após validação do plano D1; nenhum dado é inferido.

## Performance D1

O serviço executa um conjunto fixo de consultas agregadas e não usa `IN` dinâmico. Os índices atuais iniciados por organização reduzem o domínio, mas os ledgers possuem somente índice por usuário/tempo. Antes de escala elevada, medir `EXPLAIN QUERY PLAN` em fixture representativa e considerar, mediante migration aprovada, índices `(organization_id, created_at)` para ledgers e `(organization_id, started_at, game_type, mode)` para participações. Nenhuma migration foi criada nesta sprint.

