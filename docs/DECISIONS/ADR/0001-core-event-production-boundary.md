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

## Estado nesta sprint

O contrato e os guardrails estão aprovados. A tabela e o adaptador de outbox serão implementados junto à integração do Quiz para participar corretamente da transação já existente. Nenhum produtor real está ativo nesta branch.

## Consequências

- Uma falha secundária não reverte o resultado do jogo.
- Retry reutiliza o mesmo evento e não duplica efeitos.
- Novos jogos integram sem conhecer serviços internos.
- Ativar produtor sem outbox é uma violação arquitetural bloqueadora.
