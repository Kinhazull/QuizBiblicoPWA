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

Desde a Sprint 24.4, cada operação registra início, conclusão, duração e quantidade processada. Falhas recebem `supportId`, código seguro e alerta pelo sink `log-only`. O resumo final do ciclo informa quantidade processada e falhas sem registrar SQL, payload ou identificadores pessoais.
