# Reward Consumer + Progress Service

Status: implementado localmente na Sprint 3.5B  
Consumidor: `reward-progress`  
Versão do consumidor: `1`  
Evento elegível: `GAME_FINISHED` versão `2`

## Fronteira

O Reward Consumer valida e calcula a recompensa. Somente o Progress Service grava XP, moedas e a projeção de nível. O dispatcher conhece apenas o Event Engine e não contém regras de recompensa.

`GAME_FINISHED` v1 permanece aceito e processado pelo Statistics Service. Para Reward, ele é encerrado sem efeito e sem retry, deixando recibo auditável. Treino segue a mesma política sem recompensa.

## Política

XP por conclusão oficial: `20`. Desempenho: `floor(correctAnswers / questionsAnswered × 20)`. Partida perfeita: `+10`. Primeira partida oficial do dia UTC: `+10`. O máximo é 50 XP por partida ou 60 XP quando o bônus diário é aplicado.

Moedas: `2` pela conclusão, `+1` a partir de 70%, `+1` a partir de 90% e `+1` por perfeição, limitadas a `5`.

## Idempotência e atomicidade

- o recibo `(eventId, reward-progress, 1)` impede execução concorrente do mesmo consumidor;
- os IDs dos ledgers são hashes determinísticos do evento;
- o bônus diário é único por organização, usuário e data UTC;
- XP base, bônus diário, moedas e projeção são aplicados em um único `DB.batch`;
- falha em qualquer escrita reverte todo o lote;
- se o efeito for aplicado e a gravação do recibo falhar, o retry encontra os ledgers aplicados e não soma novamente;
- reuso do mesmo `eventId` com outro payload é recusado pelo fingerprint imutável do Event Engine.

Nenhuma tabela nova foi necessária: a implementação reutiliza `user_platform_progress`, `platform_xp_ledger`, `platform_coin_ledger` e os recibos do Event Engine.

## Fora do escopo

Missions, Achievements, Notifications, interface, regras do Quiz e novos contratos de evento não foram alterados. Não há migration remota, deploy ou agendamento novo.
