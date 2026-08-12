# Platform Analytics 2.0

**Status:** implementado localmente na Sprint 26.5

## Contrato

Analytics é uma projeção administrativa, somente leitura, agregada por organização. A API exige `analytics.view`, responde `no-store, private`, não inclui nomes, e-mails, respostas ou payloads individuais e não concede progresso.

## Períodos e comparação

- `today`: início do dia na timezone da organização até agora;
- `7d` e `30d`: janelas móveis;
- anterior: intervalo imediatamente precedente com a mesma duração;
- diferença: `atual - anterior`;
- variação: `(atual - anterior) / anterior × 100`;
- quando o anterior é zero, a variação percentual é `null`.

## Métricas e fontes

| Área | Métrica | Fonte |
|---|---|---|
| Visão geral | usuários, partidas iniciadas/concluídas | participações geradas e de Eventos |
| Tendência | ativos, iniciadas, concluídas, Daily, XP e saldo líquido | participações e ledgers, agrupados por dia UTC |
| Daily | abertura, início, 3/7 e 7/7 | `DAILY_OPENED` e participações DAILY |
| Retenção | novos, recorrentes, taxa de retorno | usuários e dias ativos |
| Jogos | jogadores, início, conclusão, abandono, vitória | participações dos sete jogos |
| Dificuldade | amostra e conclusão por dificuldade editorial | uso da participação + `content_items` |
| Conteúdo | mais/menos usados, nunca usados, frequência | Biblioteca e usage ledger |
| Economia | XP, emissão/gasto de moedas, compras e origens | ledgers de XP/moedas |
| Eventos | participantes, sessões, jogos e recompensas | Eventos, participações e reward ledger |

## Definições

- recorrente: usuário ativo no período com atividade anterior ao início;
- taxa de retorno: recorrentes ÷ (novos + recorrentes);
- conclusão por dificuldade: participações concluídas ÷ participações expostas à dificuldade;
- amostra mínima de dificuldade: 10 participações;
- baixo uso não significa baixa qualidade;
- score bruto nunca é comparado entre jogos.

## Limitações explícitas

- conclusão integral de Evento não possui projeção canônica; uma partida não é tratada como Evento concluído;
- moedas bloqueadas pelo teto FREE_PLAY não são persistidas e não são inferidas;
- desempenho por conteúdo não é exibido quando uma conclusão abrange vários conteúdos;
- séries usam buckets UTC; o recorte `today` usa a timezone da organização;
- filtros cruzados por modo/jogo/Evento foram adiados porque conteúdo, retenção e economia não possuem atribuição uniforme para um filtro global seguro.

## Performance

Consultas são SQL agregadas, limitadas a 90 dias, sem N+1, sem listas `IN` dinâmicas e com orçamento constante de até 31 statements para período atual, anterior e tendências. Não há leitura ilimitada de eventos nem agregação primária no cliente.
