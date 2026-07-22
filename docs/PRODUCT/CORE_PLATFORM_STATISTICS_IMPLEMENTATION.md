# Statistics Service — implementação inicial

## Escopo

Esta vertical implementa projeções globais e por jogo do Core Platform a partir do ledger oficial do Event Engine. Desde a Sprint 3.4, o Quiz Bíblico é o primeiro produtor conectado por outbox ao evento `GAME_FINISHED`. `rounds`, `attempts`, Ranking, Medalhas e tabelas legadas do Quiz não são consultados pelo serviço.

## Eventos consumidos

O consumidor oficial `platform-statistics`, versão `1`, processa somente contratos genéricos já aprovados:

- `DAILY_LOGIN`;
- `GAME_STARTED`;
- `GAME_FINISHED`;
- `QUESTION_ANSWERED`.

`GAME_FINISHED` é o evento canônico escolhido também para o Quiz. `QUIZ_FINISHED` foi removido do catálogo antes da existência de produtores reais, eliminando a possibilidade de dupla emissão.

O registro central de consumidores fica em `platform-event-consumers.ts`. O dispatcher do Quiz e produtores futuros usam `publishOfficialCoreEvent`, que mantém a API interna do Event Engine e aplica a lista oficial. Não existe endpoint público para publicar eventos ou incrementar estatísticas.

## Projeções criadas

A migration aditiva `0027_platform_statistics.sql` cria:

- `user_platform_statistics`: resumo global por usuário e organização;
- `user_platform_game_statistics`: métricas comuns por `gameId`;
- `user_platform_statistics_active_days`: dias civis de atividade no fuso da organização;
- `user_platform_game_difficulty_statistics`: estrutura reservada para dificuldade por jogo;
- `platform_statistics_event_checkpoints`: idempotência própria por `(event_id, consumer_version)`, permitindo evolução explícita do handler sem colisão de chave.

O checkpoint e os incrementos são gravados em um único `DB.batch` atômico. Se o Event Engine entregar novamente o mesmo evento, os contadores não são incrementados outra vez. Métricas derivadas são recalculadas após o batch, permitindo reparar uma interrupção sem repetir o efeito principal.

## Métricas globais

- sessões concluídas;
- jogos distintos utilizados;
- última atividade;
- dias ativos;
- sequência atual terminando no dia de atividade mais recente;
- melhor sequência diária;
- tempo total de jogo estruturalmente reservado.

XP, nível, moedas e Conquistas permanecem nos serviços proprietários e não são duplicados nesta projeção.

## Métricas por jogo

- sessões iniciadas e concluídas;
- perguntas respondidas;
- respostas corretas e incorretas;
- precisão derivada na leitura;
- melhor pontuação normalizada quando fornecida por `GAME_FINISHED`;
- última atividade;
- tempo total, média de tempo e dificuldade mais usada estruturalmente reservados.

O contrato genérico versão 1 não fornece duração nem dificuldade. O v2 acrescenta métricas de conclusão do Quiz, mas o Statistics Consumer mantém nesta sprint sua lógica anterior e continua sem estimar duração ou dificuldade. Ambos os contratos são aceitos; novas projeções dos campos v2 exigem decisão própria e versão compatível do consumidor.

## Consulta e Perfil

`GET /api/platform/statistics` exige sessão ativa, ignora qualquer identidade fornecida pelo cliente e retorna somente as projeções do usuário e da organização da sessão. Usuários sem eventos recebem um estado vazio seguro.

`GET /api/profile/me` inclui o mesmo resumo. O Perfil mostra somente sessões concluídas, jogos utilizados, dias ativos e sequência quando existe atividade confiável, preservando o layout atual.

## Reconstrução

`rebuildUserStatistics` identifica primeiro os eventos confirmados pelo recibo do Event Engine ou pelo checkpoint atômico já concluído pelo próprio consumidor. Depois, remove somente as projeções e checkpoints estatísticos do usuário e os recria em ordem. Essa dupla evidência permite recuperação segura quando o efeito foi persistido, mas houve falha antes da confirmação final do Event Engine. O ledger e a fonte da verdade dos jogos não são alterados.

Backup, exportação de privacidade, diagnóstico estrutural, limpeza local e reset controlado do piloto reconhecem as novas tabelas. O backup passa a declarar schema `28`.

## Integração operacional do Quiz

Uma conclusão oficial elegível persiste o resultado e a outbox atomicamente. `POST /api/admin/operations/quiz-outbox` exige papel administrativo, ignora seletores enviados pelo cliente e processa somente a organização da sessão. O lote padrão é 10; `QUIZ_OUTBOX_BATCH_LIMIT` permite configurá-lo entre 1 e 25.

O dispatcher usa o envelope persistido, o runtime oficial e o registro central de consumidores. A projeção mantém idempotência por `(event_id, consumer_version)`. Reentregas, concorrência e lease expirado não duplicam sessões nem melhor pontuação.

## Projeções oficiais para Conquistas

A migration aditiva `0030_achievement_statistics_projections.sql` acrescenta projeções explícitas para o catálogo oficial sem reinterpretar os contadores legados:

- `officialGamesCompleted`: somente `GAME_FINISHED` v2 com `status=completed` e `mode=official`;
- `questionsAnswered`: soma exclusivamente `GAME_FINISHED.questionsAnswered` dessas conclusões oficiais;
- `perfectGames`: `questionsAnswered > 0` e `correctAnswers == questionsAnswered`;
- `distinctOfficialPlayDaysUtc`: dias UTC distintos derivados exclusivamente de `completedAt`.

A tabela `user_platform_statistics_official_days_utc` materializa a unicidade por usuário, organização e dia UTC. A chave primária, o checkpoint e o `DB.batch` preservam idempotência em replay, retry e concorrência. O rebuild remove e recria também essa projeção a partir do ledger. Eventos v1 permanecem aceitos e preservam as métricas legadas, mas não fabricam valores ausentes no contrato antigo.

Backup, exportação de privacidade, diagnóstico estrutural, limpeza local e reset controlado reconhecem a nova tabela. A API adiciona os quatro campos ao resumo global sem renomear ou remover campos públicos existentes.

## Limites atuais

- não há estatísticas públicas nem comparação entre usuários;
- não existe endpoint cliente de mutação;
- não há cálculo a partir de tabelas legadas;
- não há duração ou dificuldade até um contrato genérico versionado fornecer esses campos;
- treino, partidas inválidas, abandonadas ou incompletas não podem emitir `GAME_FINISHED` como sessão válida.
- não existe agendamento automático do dispatcher nesta etapa;
- Progress, Reward, Missions, Achievements e Notifications não consomem eventos do Quiz.

Nenhuma migration remota, deploy ou alteração de produção foi executada nesta implementação.
