# Implementação do Event Engine do Core Platform

Status: MVP implementado localmente  
Modo de execução: síncrono  
Migration: `0026_platform_event_engine.sql`

## Objetivo entregue

O MVP implementa o contrato aprovado em `CORE_PLATFORM_EVENT_ENGINE.md` sem integrar prematuramente o Quiz ou expor uma API de publicação ao navegador. Produtores futuros usarão exclusivamente `publishOfficialCoreEvent`; a função de baixo nível permanece interna ao motor e aos testes de isolamento.

## Componentes

### Catálogo versionado

`functions/_lib/platform-event-catalog.ts` contém os tipos oficiais, a versão aceita, o tipo e serviço produtor autorizado e o esquema mínimo de cada payload. Campos inesperados, versões desconhecidas, produtores incompatíveis e jogos ainda não publicados são recusados.

O único `gameId` autorizado neste MVP é `quiz-biblico`. Isso não ativa emissão pelo Quiz; apenas reserva seu contrato. Novos jogos precisam ser publicados no catálogo de produto e adicionados explicitamente ao catálogo de eventos.

### Ledger de eventos

`core_platform_events` mantém o envelope validado, payload mínimo, origem, rastreabilidade, fingerprint imutável e estado agregado. `event_id` é globalmente único. Reutilizar o mesmo ID com conteúdo diferente resulta em `event_id_conflict`.

### Recibos por consumidor

`core_platform_event_processing` usa a chave:

```text
(event_id, consumer_id, handler_version)
```

Cada consumidor possui estado próprio. O processamento usa lease curto, escrita condicional e retomada de `retryable_failed` ou lease vencido. `retryOfficialCoreEvents` busca entregas vencidas em lote limitado, respeita backoff exponencial e move a quinta falha para `dead_letter`. Uma falha não desfaz o fato produtor nem repete consumidores já concluídos.

### Dispatcher síncrono

O dispatcher:

1. valida envelope, payload, produtor, timestamp, usuário e organização;
2. persiste ou recupera o mesmo evento;
3. seleciona consumidores por tipo;
4. adquire um recibo idempotente;
5. executa cada consumidor de forma independente;
6. grava sucesso ou falha recuperável;
7. atualiza o estado agregado.

Não há fila externa, Worker adicional, endpoint público, timer ou processamento remoto nesta etapa.

O registro oficial atual executa `platform-statistics`, `reward-progress`, `platform-achievements` e `platform-missions`, todos na versão de handler `1`. `publishOfficialCoreEvent` aplica exclusivamente esse registro central. Adaptadores de jogo não recebem consumidores arbitrários e não gravam diretamente em Progress, Reward, Achievement, Mission ou Statistics.

Para `GAME_FINISHED` v2, a ordem do registro é uma dependência explícita: Statistics materializa projeções, Reward aplica o progresso da partida, Achievement avalia essas duas fontes e Mission aplica somente critérios derivados diretamente do evento. Antes de avaliar, Achievement confirma os recibos concluídos das versões esperadas de Statistics e Reward; uma falha anterior o mantém em retry em vez de consolidar uma avaliação incompleta.

## Garantias e limites

- servidor permanece como única origem de eventos;
- payload máximo: 8 KiB; envelope máximo: 16 KiB;
- timestamps futuros aceitam somente tolerância explícita de cinco minutos;
- usuário deve estar ativo e pertencer à organização informada;
- o D1 usa prepared statements e constraints para convergência concorrente;
- os ledgers de XP/moedas, missão e conquista mantêm sua idempotência de domínio;
- a conclusão do recibo ocorre depois do efeito do consumidor. Portanto, consumidores futuros **devem** manter sua própria chave idempotente, pois uma interrupção entre efeito e recibo pode causar nova entrega;
- não há ordem global. Dependências continuam expressas por eventos derivados e `causationId`;
- o Quiz é o primeiro produtor conectado por outbox; outros jogos permanecem desconectados até integração formal.

## Operação

- backup administrativo inclui eventos e recibos da organização;
- exportação de privacidade inclui eventos associados ao usuário;
- diagnóstico verifica estrutura, índices e processamentos falhos ou com lease vencido;
- limpeza do piloto e limpeza local removem eventos antes dos domínios preservados;
- nenhuma migration remota é aplicada por esta implementação.

## Evolução compatível

A API interna do motor permanece estável quando a execução migrar para outbox ou outra infraestrutura. A futura camada deverá ler o mesmo envelope e produzir os mesmos recibos, sem mudar consumidores. O adaptador do Quiz não poderá depender da função de baixo nível.

### Limite do produtor

A estratégia oficial é outbox transacional no D1. A Sprint 3.2 criou `quiz_core_event_outbox` e passou a inserir o `GAME_FINISHED` normalizado no mesmo `DB.batch` que conclui uma tentativa oficial do Quiz.

A Sprint 3.3 adicionou o dispatcher da outbox. Registros `pending`, `retryable_failed` vencidos ou `processing` com lease expirado são reivindicados por atualização condicional, recebem lease de 30 segundos e são entregues exclusivamente ao Event Engine. A política é compartilhada com o motor: cinco tentativas, backoff exponencial de 5 segundos limitado a 5 minutos e `dead_letter` na quinta falha. O erro persistido é um código sanitizado.

Na Sprint 3.4, o dispatcher passou a publicar por `publishOfficialCoreEvent`. O dispatcher nunca informa consumidores; o registro central controla a seleção e suas versões. A outbox somente vira `delivered` quando o retorno agregado do Event Engine é `completed`.

Na Sprint 3.5A, `GAME_FINISHED` ganhou o contrato v2. Novos resultados oficiais do Quiz carregam `mode`, `correctAnswers`, `questionsAnswered`, `completedAt`, `attemptId` e `gameVersion`, além de `status` e `score`. O catálogo mantém validação exata e compatibilidade integral com v1. A outbox aceita ambas as versões e o dispatcher preserva a versão armazenada. Statistics usa os campos v2 nas projeções oficiais e preserva as métricas legadas para v1.

O acionamento operacional é um POST administrativo, com rate limit, auditoria, lote conservador e isolamento pela organização obtida da sessão. Não existe agendamento automático. Statistics, Reward/Progress, Achievement e Mission estão conectados; Notification permanece desconectado.

Antes de ampliar os efeitos do Core ainda é necessário:

1. registrar qualquer novo consumidor somente em sua sprint aprovada;
2. definir política operacional de retenção de itens entregues e dead letter;
3. adicionar reprocessamento administrativo específico de dead letter;
4. conectar execução agendada somente após decisão operacional explícita.

## Testes comportamentais

`tests/integration/platform-event-engine.integration.test.mjs` cobre:

- persistência e despacho para consumidores independentes;
- repetição e concorrência com um único efeito;
- conflito de `eventId` imutável;
- rejeição de produtor, jogo, payload, timestamp e acesso entre organizações;
- checkpoint de falha e reprocessamento sem repetir consumidor concluído;
- ausência de endpoint público de publicação.
