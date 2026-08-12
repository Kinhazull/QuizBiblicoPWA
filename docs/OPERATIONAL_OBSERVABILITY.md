# Observabilidade operacional

## Componentes compartilhados

- `operational-observability.ts`: supportId, contrato de erro, logging estruturado e `OperationalAlertSink`.
- `operational-health.ts`: grupos e checks somente leitura do diagnóstico administrativo.
- `operational-thresholds.mjs`: fonte única dos thresholds técnicos.
- `operational-schema-contract.mjs`: schema, índices e triggers esperados.

O sink padrão é `log-only`. Email, webhook ou monitoramento externo poderão implementar o mesmo contrato futuramente, sem alterar produtores e sem exigir segredo nesta fase.

Não existe heartbeat persistido do Cron. Por isso o grupo `WORKER` retorna `UNKNOWN` para a última execução, mesmo quando sinais indiretos estão saudáveis. Logs confirmam execuções; backlog, retries e reservas detectam efeitos, mas não provam pontualidade sem acesso aos logs. Persistir heartbeat exige decisão explícita e migration aditiva futura.

## Logs permitidos

Os logs podem conter timestamp, nível, operação, componente, supportId, código público, gameType, mode, eventId não sensível, duração, resultado, retryable e contagens técnicas. Email, nome, senha/token, sessão, resposta correta, payload de jogo, SQL integral e conteúdo privado são proibidos.

## Health unificado

`GET /api/admin/health` exige `reports.view`, respeita a organização autenticada e não escreve. O bloco `operational` agrega `HEALTHY`, `DEGRADED`, `CRITICAL` ou `UNKNOWN` para DATABASE, MIGRATIONS, CMS, UNIVERSAL_LIBRARY, GENERATOR, EVENTS, OUTBOX, EVENT_ENGINE, WORKER, ECONOMY e PRIVACY.

Os sinais incluem projeções ausentes/divergentes, catálogo mínimo, distribuição diária do Quiz, seleções incompletas, participações antigas em `STARTED`, histórico ausente, Eventos/reservas inconsistentes, backlog/dead letters e consumers falhos. O health nunca cria seleção, publica conteúdo, libera reserva ou reprocessa evento.

## Thresholds v1

- participação `STARTED`: degradada após 2 horas;
- Outbox: degradada em 10 itens ou 15 minutos; crítica em 100 itens ou 60 minutos;
- Event Engine: degradado com 5 falhas; crítico com 25;
- catálogo mínimo: 5 itens para Quiz e 1 para cada outro jogo;
- Quiz Diário: ao menos 2 EASY, 2 MEDIUM e 1 HARD.

São thresholds técnicos, não prazos legais. Alterações devem ocorrer somente na fonte compartilhada e incluir teste.

## Monitoramento externo recomendado

Sem contratar SaaS nesta sprint, os sinais mínimos futuros são:

- aplicação pública respondendo por HTTPS;
- `/api/auth/me` respondendo 401 sem sessão, provando Pages Functions sem expor dados;
- endpoint `fetch` do Worker respondendo com `no-store`;
- alerta por ausência do Cron quando houver heartbeat confiável;
- abertura diária da Central/Health até existir alerta proativo.

Detecção interna cobre schema/ledger, catálogo, seleções, reservas, Outbox e consumers. Alerta externo/proativo continua pendente e deve respeitar o objetivo de custo zero.

O restore remoto isolado da Sprint 27.2 foi aprovado e não depende de alerta externo. Heartbeat persistido do Cron, monitor externo e alerta proativo permanecem melhorias operacionais futuras, não blockers de conclusão da 27.2.
