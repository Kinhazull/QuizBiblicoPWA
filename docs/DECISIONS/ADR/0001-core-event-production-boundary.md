# ADR 0001 — Fronteira de produção e consumo de eventos do Core

Data: 21/07/2026  
Status: Aceita

## Contexto

Resultados de jogos e efeitos do Core pertencem a limites distintos. Confirmar uma partida sem registrar duravelmente o evento pode perder progressão; chamar serviços do Core diretamente acopla o jogo e permite efeitos parciais.

## Decisão

- O backend do jogo grava fato e outbox na mesma operação atômica do D1.
- A chave do evento é determinística e permanece igual em toda tentativa de entrega.
- O runtime oficial lê a outbox e usa somente o catálogo central de consumidores.
- Adaptadores de jogos não chamam Progress, Reward, Achievement, Mission ou Statistics.
- Consumidores validam envelope, produtor, usuário, organização, jogo, versão e critérios próprios antes de mutar seu domínio.
- `GAME_FINISHED` é o único fato canônico de conclusão, inclusive para o Quiz.
- O item de outbox é confirmado por checkpoint; não é removido antes da entrega durável.

## Estado após a Sprint 3.3

O contrato e os guardrails estão aprovados. A tabela `quiz_core_event_outbox` e sua inserção no mesmo `DB.batch` da conclusão oficial do Quiz foram implementadas. O item nasce em estado `pending`, com identidade determinística e envelope produzido pelo adaptador oficial.

O dispatcher oficial usa claim condicional com lease de 30 segundos, no máximo cinco tentativas e o mesmo backoff exponencial do Event Engine. Ele entrega o envelope exclusivamente ao runtime oficial e confirma a outbox somente depois da aceitação idempotente do evento.

Nesta fundação, a lista de consumidores é deliberadamente vazia. Portanto, o Event Engine persiste e valida o evento, mas Progress, Statistics, Missions, Achievements e Notifications não são executados.

## Consequências

- Uma falha secundária não reverte o resultado do jogo.
- Retry reutiliza o mesmo evento e não duplica efeitos.
- Novos jogos integram sem conhecer serviços internos.
- Ativar produtor sem outbox é uma violação arquitetural bloqueadora.
