# Mission Catalog V1

Status: **Aprovado**

Catalog version: **1**

Scope: **Core Platform e Quiz Bíblico**
Last updated: **2026-07-21**

Este documento é a fonte oficial das missões V1 do **Conte os Feitos**. Regras, critérios, pesos e recompensas não devem ser duplicados ou redefinidos pelo Mission Generator ou pelo Mission Consumer.

O catálogo é declarativo. Sua aprovação não cria código, persistência, atribuições ou recompensas. A futura representação executável deverá ser derivada integralmente deste documento e validada por contrato.

## 1. Contrato do catálogo

Cada missão possui:

- `missionId`: identidade lógica permanente e única;
- `type`: `permanent`, `daily`, `weekly` ou `event`;
- `scope`: `global` ou `game`;
- `pool`: conjunto usado na seleção;
- `weight`: peso inteiro dentro do pool; `0` indica atribuição não aleatória;
- `difficulty`: `easy`, `medium`, `hard` ou `expert`;
- `visibility`: `visible` ou `hidden`;
- `cooldown`: duração ISO 8601 ou `once` para missão permanente não repetível;
- `target`: métrica, operador e valor da meta;
- `reward`: XP e moedas concedidos uma única vez no resgate;
- `gameFilter`: lista de `gameId` oficiais aceitos; lista vazia representa qualquer jogo compatível;
- `season`: identidade de temporada/campanha ou `null` quando independente.

O catálogo V1 utiliza somente `operator: greater_than_or_equal`. Todas as metas são avaliadas no servidor por Statistics, Progress e eventos oficiais autorizados. Recompensas de missão, conquista ou ajuste administrativo não contam para `gameplayXpEarned` e não podem gerar progresso recursivo.

## 2. Política de recompensas

As faixas evitam que uma missão recorrente ultrapasse uma Conquista equivalente. O valor exato de cada entrada permanece explícito no catálogo.

| Tipo | Dificuldade | XP de referência | Moedas de referência |
| --- | --- | ---: | ---: |
| `daily` | `easy` | 15 | 3 |
| `daily` | `medium` | 25 | 5 |
| `daily` | `hard` | 40 | 8 |
| `daily` | `expert` | 60 | 12 |
| `weekly` | `easy` | 50 | 10 |
| `weekly` | `medium` | 80 | 16 |
| `weekly` | `hard` | 120 | 24 |
| `weekly` | `expert` | 180 | 36 |
| `permanent` | `easy` | 40 | 8 |
| `permanent` | `medium` | 100 | 20 |
| `permanent` | `hard` | 200 | 40 |
| `permanent` | `expert` | 400 | 80 |

Missões `event` não possuem faixa V1. Cada campanha futura exigirá aprovação de temporada, orçamento e recompensas antes de entrar no catálogo.

## 3. Pools e pesos

| Pool | Tipo | Escopo | Seleção | Soma dos pesos |
| --- | --- | --- | --- | ---: |
| `permanent_global_foundation` | `permanent` | global | Atribuição por elegibilidade; não aleatória | 0 |
| `daily_global_core` | `daily` | global | Uma candidata global por janela diária | 100 |
| `daily_quiz_core` | `daily` | Quiz | Uma candidata do Quiz por janela diária quando o jogo estiver habilitado | 100 |
| `weekly_global_core` | `weekly` | global | Uma candidata global por janela semanal | 100 |
| `weekly_quiz_core` | `weekly` | Quiz | Uma candidata do Quiz por janela semanal quando o jogo estiver habilitado | 100 |

O peso é relativo somente dentro do próprio pool. O Generator futuro não pode somar pesos entre pools nem usar o peso como recompensa. Cooldown, jogo habilitado, temporada, visibilidade e elegibilidade são aplicados antes do sorteio determinístico.

## 4. Missões globais

### 4.1 Nível 3

```yaml
missionId: permanent_global_level_3
type: permanent
scope: global
pool: permanent_global_foundation
weight: 0
difficulty: medium
visibility: visible
cooldown: once
target: { metric: level, operator: greater_than_or_equal, value: 3 }
reward: { xp: 100, coins: 20 }
gameFilter: []
season: null
```

### 4.2 Nível 5

```yaml
missionId: permanent_global_level_5
type: permanent
scope: global
pool: permanent_global_foundation
weight: 0
difficulty: hard
visibility: visible
cooldown: once
target: { metric: level, operator: greater_than_or_equal, value: 5 }
reward: { xp: 200, coins: 40 }
gameFilter: []
season: null
```

### 4.3 Sete dias ativos

```yaml
missionId: permanent_global_active_days_7
type: permanent
scope: global
pool: permanent_global_foundation
weight: 0
difficulty: medium
visibility: visible
cooldown: once
target: { metric: distinctOfficialPlayDaysUtc, operator: greater_than_or_equal, value: 7 }
reward: { xp: 100, coins: 20 }
gameFilter: []
season: null
```

### 4.4 Partida do dia

```yaml
missionId: daily_global_games_1
type: daily
scope: global
pool: daily_global_core
weight: 30
difficulty: easy
visibility: visible
cooldown: P2D
target: { metric: officialGamesCompletedInWindow, operator: greater_than_or_equal, value: 1 }
reward: { xp: 15, coins: 3 }
gameFilter: []
season: null
```

### 4.5 Dez perguntas no dia

```yaml
missionId: daily_global_questions_10
type: daily
scope: global
pool: daily_global_core
weight: 30
difficulty: easy
visibility: visible
cooldown: P2D
target: { metric: questionsAnsweredInWindow, operator: greater_than_or_equal, value: 10 }
reward: { xp: 15, coins: 3 }
gameFilter: []
season: null
```

### 4.6 Trinta XP de jogo no dia

```yaml
missionId: daily_global_gameplay_xp_30
type: daily
scope: global
pool: daily_global_core
weight: 25
difficulty: medium
visibility: visible
cooldown: P3D
target: { metric: gameplayXpEarnedInWindow, operator: greater_than_or_equal, value: 30 }
reward: { xp: 25, coins: 5 }
gameFilter: []
season: null
```

### 4.7 Partida perfeita no dia

```yaml
missionId: daily_global_perfect_1
type: daily
scope: global
pool: daily_global_core
weight: 15
difficulty: hard
visibility: hidden
cooldown: P4D
target: { metric: perfectGamesInWindow, operator: greater_than_or_equal, value: 1 }
reward: { xp: 40, coins: 8 }
gameFilter: []
season: null
```

### 4.8 Cinco partidas na semana

```yaml
missionId: weekly_global_games_5
type: weekly
scope: global
pool: weekly_global_core
weight: 30
difficulty: easy
visibility: visible
cooldown: P14D
target: { metric: officialGamesCompletedInWindow, operator: greater_than_or_equal, value: 5 }
reward: { xp: 50, coins: 10 }
gameFilter: []
season: null
```

### 4.9 Cinquenta perguntas na semana

```yaml
missionId: weekly_global_questions_50
type: weekly
scope: global
pool: weekly_global_core
weight: 30
difficulty: medium
visibility: visible
cooldown: P14D
target: { metric: questionsAnsweredInWindow, operator: greater_than_or_equal, value: 50 }
reward: { xp: 80, coins: 16 }
gameFilter: []
season: null
```

### 4.10 Duzentos XP de jogo na semana

```yaml
missionId: weekly_global_gameplay_xp_200
type: weekly
scope: global
pool: weekly_global_core
weight: 20
difficulty: medium
visibility: visible
cooldown: P14D
target: { metric: gameplayXpEarnedInWindow, operator: greater_than_or_equal, value: 200 }
reward: { xp: 80, coins: 16 }
gameFilter: []
season: null
```

### 4.11 Duas partidas perfeitas na semana

```yaml
missionId: weekly_global_perfect_2
type: weekly
scope: global
pool: weekly_global_core
weight: 10
difficulty: hard
visibility: hidden
cooldown: P21D
target: { metric: perfectGamesInWindow, operator: greater_than_or_equal, value: 2 }
reward: { xp: 120, coins: 24 }
gameFilter: []
season: null
```

### 4.12 Três dias ativos na semana

```yaml
missionId: weekly_global_active_days_3
type: weekly
scope: global
pool: weekly_global_core
weight: 10
difficulty: medium
visibility: visible
cooldown: P14D
target: { metric: distinctOfficialPlayDaysUtcInWindow, operator: greater_than_or_equal, value: 3 }
reward: { xp: 80, coins: 16 }
gameFilter: []
season: null
```

## 5. Missões do Quiz Bíblico

Todas as entradas desta seção usam o `gameId` oficial `quiz-biblico`. O Mission Consumer futuro avaliará apenas eventos oficiais compatíveis e não consultará `rounds`, `attempts`, respostas ou qualquer tabela interna do Quiz.

### 5.1 Sete acertos no dia

```yaml
missionId: daily_quiz_correct_7
type: daily
scope: game
pool: daily_quiz_core
weight: 35
difficulty: easy
visibility: visible
cooldown: P2D
target: { metric: correctAnswersInWindow, operator: greater_than_or_equal, value: 7 }
reward: { xp: 15, coins: 3 }
gameFilter: [quiz-biblico]
season: null
```

### 5.2 Dez perguntas respondidas no dia

```yaml
missionId: daily_quiz_questions_10
type: daily
scope: game
pool: daily_quiz_core
weight: 35
difficulty: easy
visibility: visible
cooldown: P2D
target: { metric: questionsAnsweredInWindow, operator: greater_than_or_equal, value: 10 }
reward: { xp: 15, coins: 3 }
gameFilter: [quiz-biblico]
season: null
```

### 5.3 Uma partida oficial do Quiz no dia

```yaml
missionId: daily_quiz_official_games_1
type: daily
scope: game
pool: daily_quiz_core
weight: 25
difficulty: easy
visibility: visible
cooldown: P2D
target: { metric: officialGamesCompletedInWindow, operator: greater_than_or_equal, value: 1 }
reward: { xp: 15, coins: 3 }
gameFilter: [quiz-biblico]
season: null
```

### 5.4 Nove acertos no dia

```yaml
missionId: daily_quiz_correct_9
type: daily
scope: game
pool: daily_quiz_core
weight: 5
difficulty: hard
visibility: hidden
cooldown: P4D
target: { metric: correctAnswersInSingleGame, operator: greater_than_or_equal, value: 9 }
reward: { xp: 40, coins: 8 }
gameFilter: [quiz-biblico]
season: null
```

### 5.5 Trinta e cinco acertos na semana

```yaml
missionId: weekly_quiz_correct_35
type: weekly
scope: game
pool: weekly_quiz_core
weight: 30
difficulty: medium
visibility: visible
cooldown: P14D
target: { metric: correctAnswersInWindow, operator: greater_than_or_equal, value: 35 }
reward: { xp: 80, coins: 16 }
gameFilter: [quiz-biblico]
season: null
```

### 5.6 Cinquenta perguntas do Quiz na semana

```yaml
missionId: weekly_quiz_questions_50
type: weekly
scope: game
pool: weekly_quiz_core
weight: 30
difficulty: medium
visibility: visible
cooldown: P14D
target: { metric: questionsAnsweredInWindow, operator: greater_than_or_equal, value: 50 }
reward: { xp: 80, coins: 16 }
gameFilter: [quiz-biblico]
season: null
```

### 5.7 Cinco partidas oficiais do Quiz na semana

```yaml
missionId: weekly_quiz_official_games_5
type: weekly
scope: game
pool: weekly_quiz_core
weight: 30
difficulty: medium
visibility: visible
cooldown: P14D
target: { metric: officialGamesCompletedInWindow, operator: greater_than_or_equal, value: 5 }
reward: { xp: 80, coins: 16 }
gameFilter: [quiz-biblico]
season: null
```

### 5.8 Três partidas perfeitas do Quiz na semana

```yaml
missionId: weekly_quiz_perfect_3
type: weekly
scope: game
pool: weekly_quiz_core
weight: 10
difficulty: expert
visibility: hidden
cooldown: P21D
target: { metric: perfectGamesInWindow, operator: greater_than_or_equal, value: 3 }
reward: { xp: 180, coins: 36 }
gameFilter: [quiz-biblico]
season: null
```

## 6. Cooldown e janelas

- `once` impede uma nova atribuição permanente depois da primeira conclusão/resgate.
- `P2D`, `P3D` e `P4D` reduzem repetição de missões diárias sem bloquear a rotação do pool.
- `P14D` impede a repetição da mesma missão em semanas consecutivas.
- `P21D` reserva desafios raros por pelo menos três semanas.
- cooldown começa no resgate; se a missão expirar sem conclusão, começa na expiração.
- o relógio e as chaves de janela são definidos pelo servidor.
- uma missão em cooldown tem peso efetivo zero antes do sorteio.

## 7. Filtros por jogo

- `gameFilter: []` aceita qualquer jogo publicado que emita os eventos e métricas exigidos.
- `gameFilter: [quiz-biblico]` aceita somente eventos cujo envelope oficial possua esse `gameId`.
- missões com `scope: game` exigem filtro não vazio.
- jogos planejados ou em desenvolvimento não são elegíveis para geração.
- o filtro é aplicado antes do peso e não pode ser substituído pelo cliente.
- adicionar um jogo futuro exige primeiro atualizar `GAME_CATALOG.md` e depois criar nova versão ou entradas aditivas neste catálogo.

## 8. Temporadas e eventos

Todas as missões V1 possuem `season: null`; nenhuma afeta Temporadas, Rankings ou Medalhas do Quiz. O tipo `event` permanece suportado pela arquitetura, porém o catálogo V1 não contém missão de evento ativa. Uma campanha futura deverá declarar `season`, período, pool, orçamento e política de expiração em revisão própria.

## 9. Métricas e dependências futuras

As métricas com sufixo `InWindow` representam apenas eventos oficiais dentro da janela materializada da missão. Elas não autorizam novas projeções nesta sprint.

- `level` vem do Progress Service;
- `gameplayXpEarnedInWindow` considera somente XP originado por jogos e exclui missões, conquistas e ajustes;
- partidas, perguntas, acertos, perfeição e dias ativos vêm do Statistics Service ou do evento oficial após a ordem de consumidores ser aprovada;
- `correctAnswersInSingleGame` é avaliado no evento elegível atual;
- missões globais agregam apenas jogos cujo contrato ofereça a métrica necessária;
- ausência de métrica confiável torna a missão inelegível; não é permitido estimar ou consultar tabelas internas do jogo.

## 10. Regras de evolução

1. `missionId` nunca pode ser reutilizado para outro objetivo.
2. Alterar critério, meta, tipo, escopo, recompensa, cooldown, pool, filtro ou temporada exige nova versão formal antes da implementação.
3. Alterações de texto sem mudança semântica podem preservar a identidade.
4. O Mission Generator e o Mission Consumer devem derivar suas regras deste catálogo.
5. Missões já atribuídas preservam a versão materializada.
6. Entradas novas podem ser adicionadas de forma aditiva.
7. Remoção interrompe apenas novas atribuições e não apaga histórico.
8. Recompensa é concedida somente via Progress Service, uma vez por atribuição.

## 11. Exclusões da V1

Este catálogo não implementa nem autoriza:

- Mission Generator;
- Mission Consumer;
- Scheduler;
- endpoints públicos de progresso ou recompensa;
- missões sociais, competitivas ou baseadas em Ranking;
- missões de evento sem campanha aprovada;
- integração direta com persistência interna de jogos;
- alteração de Jornada, Medalha, Temporada ou Conquista.
