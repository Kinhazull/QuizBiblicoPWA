# Reconciliação agendada de Eventos

O Worker operacional existente executa `reconcilePlatformEvents()` em tarefa independente das premiações, outbox e retries do Core.

A operação:

- encontra Eventos `SCHEDULED`/`ACTIVE` com janela encerrada;
- transiciona idempotentemente para `FINISHED`;
- expira participações `CREATED`/`STARTED`;
- expira seleções do Evento;
- libera reservas;
- devolve conteúdo a `AVAILABLE` apenas quando nenhuma outra reserva válida existir.

Cada operação do cron possui log próprio e tratamento independente. Uma falha não impede a execução das demais; o ciclo é marcado como falho ao final para observabilidade e retry seguro.
