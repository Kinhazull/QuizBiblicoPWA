# Implementação do Event Engine do Core Platform

Status: MVP implementado localmente  
Modo de execução: síncrono  
Migration: `0026_platform_event_engine.sql`

## Objetivo entregue

O MVP implementa o contrato aprovado em `CORE_PLATFORM_EVENT_ENGINE.md` sem integrar prematuramente o Quiz ou expor uma API de publicação ao navegador. Produtores futuros usarão a função interna `publishCoreEvent`; consumidores são objetos independentes registrados pelo chamador e recebem somente eventos aos quais se inscreveram.

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

Cada consumidor possui estado próprio. O processamento usa lease curto, escrita condicional e retomada de `retryable_failed` ou lease vencido. Uma falha não desfaz o fato produtor nem repete consumidores já concluídos.

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

O primeiro consumidor oficial foi registrado na vertical do Statistics Service. `publishOfficialCoreEvent` aplica o registro central sem conectar qualquer produtor real; `publishCoreEvent` permanece disponível para testes isolados e evolução interna compatível.

## Garantias e limites

- servidor permanece como única origem de eventos;
- payload máximo: 8 KiB; envelope máximo: 16 KiB;
- timestamps futuros aceitam somente tolerância explícita de cinco minutos;
- usuário deve estar ativo e pertencer à organização informada;
- o D1 usa prepared statements e constraints para convergência concorrente;
- os ledgers de XP/moedas, missão e conquista mantêm sua idempotência de domínio;
- a conclusão do recibo ocorre depois do efeito do consumidor. Portanto, consumidores futuros **devem** manter sua própria chave idempotente, pois uma interrupção entre efeito e recibo pode causar nova entrega;
- não há ordem global. Dependências continuam expressas por eventos derivados e `causationId`;
- não há produtor conectado nesta sprint; o ledger permanece vazio até uma integração formal.

## Operação

- backup administrativo inclui eventos e recibos da organização;
- exportação de privacidade inclui eventos associados ao usuário;
- diagnóstico verifica estrutura, índices e processamentos falhos ou com lease vencido;
- limpeza do piloto e limpeza local removem eventos antes dos domínios preservados;
- nenhuma migration remota é aplicada por esta implementação.

## Evolução compatível

A API interna `publishCoreEvent(env, event, consumers)` permanece válida quando a execução migrar para uma fila baseada em D1 ou outra infraestrutura. A futura camada assíncrona deverá ler o mesmo envelope e produzir os mesmos recibos, sem mudar produtores ou consumidores.

Antes de conectar um produtor real ainda é necessário:

1. definir o limite transacional/outbox do fluxo produtor;
2. registrar consumidores reais e suas chaves idempotentes de domínio;
3. definir política de retenção e dead letter;
4. adicionar reprocessamento administrativo auditado;
5. aprovar a integração específica do jogo ou serviço.

## Testes comportamentais

`tests/integration/platform-event-engine.integration.test.mjs` cobre:

- persistência e despacho para consumidores independentes;
- repetição e concorrência com um único efeito;
- conflito de `eventId` imutável;
- rejeição de produtor, jogo, payload, timestamp e acesso entre organizações;
- checkpoint de falha e reprocessamento sem repetir consumidor concluído;
- ausência de endpoint público de publicação.
