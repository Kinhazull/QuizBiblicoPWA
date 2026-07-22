# Mission Service — implementação inicial

## Escopo

Esta vertical implementa catálogo versionado, atribuição diária, progresso idempotente, conclusão, expiração, resgate interno e consulta autenticada de Missões do Core Platform. Nenhum jogo — inclusive o Quiz Bíblico — emite progresso nesta etapa.

## Catálogo e períodos

`platform_mission_definitions` contém código estável, versão, apresentação, cadência, escopo, meta, unidade, critério, recompensa e janela de disponibilidade. Os escopos `global` e `game` são suportados. As cadências `daily` e `weekly` existem no modelo, mas somente missões diárias podem ser atribuídas agora; missões semanais permanecem previstas.

Uma missão diária usa a data civil da organização como `window_key` e expira no início do dia seguinte no fuso configurado. A versão ativa mais recente de cada definição é elegível. O catálogo inicia vazio: até uma definição ser cadastrada por uma futura operação administrativa controlada, a Home apresenta um estado vazio real.

## Persistência e estados

- `user_platform_missions` registra definição, usuário, organização, janela, progresso, estado e datas de atribuição, conclusão, resgate e expiração.
- `user_platform_mission_progress_events` usa `(assignment_id, event_id)` como chave idempotente e registra a aplicação de cada incremento.
- Estados válidos: `active`, `completed`, `claimed` e `expired`.
- Transições implementadas: `active → completed`, `completed → claimed` e `active → expired`.
- Uma missão concluída permanece resgatável; somente missões ainda ativas expiram.
- Leituras e mutações internas sempre exigem usuário ativo e o mesmo `organization_id`.

## Serviço e recompensas

`functions/_lib/platform-missions.ts` oferece:

- `getCurrentDailyMission`: expira registros vencidos e atribui, de modo idempotente, a missão diária quando necessário;
- `recordMissionProgress`: aceita somente eventos internos validados, incrementa uma vez por `eventId` e conclui ao atingir a meta;
- `completeMission`: aplica a transição de conclusão de forma idempotente;
- `claimMissionReward`: concede XP e moedas pelos ledgers oficiais com chaves idempotentes e então registra o resgate;
- `expireMissions`: encerra missões ativas vencidas somente para o usuário e a organização informados.

O contrato de recompensa inicial admite somente XP e moedas inteiros não negativos. Recompensas futuras exigirão tipos explícitos e validação própria.

## API e Home

`GET /api/platform/missions/current` exige sessão, usa `Cache-Control: no-store, private` e retorna somente a missão diária do usuário autenticado. É um GET idempotente com materialização controlada: pode expirar e atribuir a missão do próprio usuário, mas nunca altera registros de outra organização. Não existe endpoint público para progresso, conclusão ou resgate.

A Home consome esse endpoint. Ela não deriva missão de Jornada, tentativa ou Medalha do Quiz e não simula progresso quando o catálogo está vazio.

## Operação

A migration aditiva `0025_platform_missions.sql` cria três tabelas e quatro índices. Backup, exportação de privacidade, diagnóstico estrutural e limpeza controlada do piloto reconhecem os novos registros. Definições do catálogo são preservadas pela limpeza; atribuições e eventos de teste são removidos.

## Mission Consumer — Sprint 3.7D

`platform-mission-consumer.ts` é o consumidor oficial de `GAME_FINISHED` v2. Ele localiza apenas atribuições ativas do mesmo usuário e organização, resolve suas regras pelo catálogo oficial e registra incrementos através de `recordMissionProgress`.

O consumidor deriva diretamente do evento apenas partidas oficiais concluídas, perguntas respondidas, acertos e partidas perfeitas. Missões de XP, nível e dias ativos aguardam seus produtores autoritativos e não recebem progresso estimado. Filtros por jogo são respeitados pelo `gameFilter` do catálogo.

Cada par atribuição/evento é protegido pela unicidade já existente em `user_platform_mission_progress_events`; o Event Engine adiciona o checkpoint por consumidor e versão. Replays, retries e concorrência não duplicam progresso. Ao atingir a meta, o estado arquitetural `READY_TO_CLAIM` permanece persistido como `completed`, conforme o mapeamento compatível aprovado. Nenhuma recompensa é concedida e nenhum claim ou geração ocorre no consumidor.

Nenhuma migration remota, deploy, integração de jogo, notificação, animação ou pop-up foi executado nesta implementação.
