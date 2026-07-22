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

## Estado após a Sprint 3.4

O contrato e os guardrails estão aprovados. A tabela `quiz_core_event_outbox` e sua inserção no mesmo `DB.batch` da conclusão oficial do Quiz foram implementadas. O item nasce em estado `pending`, com identidade determinística e envelope produzido pelo adaptador oficial.

O dispatcher oficial usa claim condicional com lease de 30 segundos, no máximo cinco tentativas e o mesmo backoff exponencial do Event Engine. Ele entrega o envelope exclusivamente ao runtime oficial e confirma a outbox somente depois da aceitação idempotente do evento.

O Statistics Service versão 1 é o primeiro consumidor oficial de `GAME_FINISHED`. O dispatcher publica pelo runtime oficial, e somente o registro central decide os consumidores aplicáveis. A outbox só é confirmada como `delivered` quando o Event Engine conclui todos os consumidores selecionados.

`GAME_FINISHED` v1 continua aceito para eventos já persistidos. A partir da Sprint 3.5A, o adaptador do Quiz produz v2 para fatos novos e a mesma outbox transporta as duas versões sem reescrever fatos antigos. A identidade determinística do evento permanece inalterada.

A execução operacional está disponível por um endpoint POST administrativo, limitado à organização da sessão, com lote padrão de 10 e máximo configurável de 25. Não existe agendamento automático nesta etapa. Progress, Reward, Missions, Achievements e Notifications permanecem desconectados.

## Consequências

- Uma falha secundária não reverte o resultado do jogo.
- Retry reutiliza o mesmo evento e não duplica efeitos.
- Novos jogos integram sem conhecer serviços internos.
- Ativar produtor sem outbox é uma violação arquitetural bloqueadora.
