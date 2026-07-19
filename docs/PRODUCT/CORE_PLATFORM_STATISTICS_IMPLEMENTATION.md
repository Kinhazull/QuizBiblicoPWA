# Statistics Service — implementação inicial

## Escopo

Esta vertical implementa projeções globais e por jogo do Core Platform a partir do ledger oficial do Event Engine. Nenhum jogo — inclusive o Quiz Bíblico — foi integrado como produtor nesta sprint. `rounds`, `attempts`, Ranking, Medalhas e tabelas legadas do Quiz não são consultados pelo serviço.

## Eventos consumidos

O consumidor oficial `platform-statistics`, versão `1`, processa somente contratos genéricos já aprovados:

- `DAILY_LOGIN`;
- `GAME_STARTED`;
- `GAME_FINISHED`;
- `QUESTION_ANSWERED`.

`QUIZ_FINISHED` não é consumido. A futura integração do Quiz deverá ser aprovada formalmente e escolher um único contrato de conclusão, sem dupla emissão.

O registro central de consumidores fica em `platform-event-consumers.ts`. Produtores futuros devem usar `publishOfficialCoreEvent`, que mantém a API interna do Event Engine e aplica a lista oficial. Não existe endpoint público para publicar eventos ou incrementar estatísticas.

## Projeções criadas

A migration aditiva `0027_platform_statistics.sql` cria:

- `user_platform_statistics`: resumo global por usuário e organização;
- `user_platform_game_statistics`: métricas comuns por `gameId`;
- `user_platform_statistics_active_days`: dias civis de atividade no fuso da organização;
- `user_platform_game_difficulty_statistics`: estrutura reservada para dificuldade por jogo;
- `platform_statistics_event_checkpoints`: idempotência própria do consumidor.

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

O contrato genérico versão 1 não fornece duração nem dificuldade. Por isso, essas métricas permanecem `0` ou `null`; o serviço não estima valores. Uma futura versão de evento deverá ser aprovada antes de preenchê-las.

## Consulta e Perfil

`GET /api/platform/statistics` exige sessão ativa, ignora qualquer identidade fornecida pelo cliente e retorna somente as projeções do usuário e da organização da sessão. Usuários sem eventos recebem um estado vazio seguro.

`GET /api/profile/me` inclui o mesmo resumo. O Perfil mostra somente sessões concluídas, jogos utilizados, dias ativos e sequência quando existe atividade confiável, preservando o layout atual.

## Reconstrução

`rebuildUserStatistics` identifica primeiro os eventos confirmados pelo recibo do Event Engine ou pelo checkpoint atômico já concluído pelo próprio consumidor. Depois, remove somente as projeções e checkpoints estatísticos do usuário e os recria em ordem. Essa dupla evidência permite recuperação segura quando o efeito foi persistido, mas houve falha antes da confirmação final do Event Engine. O ledger e a fonte da verdade dos jogos não são alterados.

Backup, exportação de privacidade, diagnóstico estrutural, limpeza local e reset controlado do piloto reconhecem as novas tabelas. O backup passa a declarar schema `28`.

## Limites atuais e integração futura do Quiz

- não há produtor real conectado;
- não há estatísticas públicas nem comparação entre usuários;
- não existe endpoint cliente de mutação;
- não há cálculo a partir de tabelas legadas;
- não há duração ou dificuldade até um contrato genérico versionado fornecer esses campos;
- a futura integração do Quiz deve filtrar modos e estados no servidor antes de emitir o evento genérico escolhido;
- treino, partidas inválidas, abandonadas ou incompletas não podem emitir `GAME_FINISHED` como sessão válida.

Nenhuma migration remota, deploy ou alteração de produção foi executada nesta implementação.
