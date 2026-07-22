# Core Platform Achievements Catalog

Status: Approved

Catalog version: 1

Scope: Global platform achievements

Last updated: 2026-07-21

## 1. Purpose

This document is the single source of truth for the global achievements available in version 1 of the Conte os Feitos platform.

Achievement names, descriptions, criteria, rarity, visibility and rewards must not be duplicated or independently redefined by consumers.

Game-specific achievements are outside the scope of this catalog.

---

## 2. General rules

### 2.1 Logical identity

Each achievement has a permanent `achievementId`.

The logical identity of a user unlock is:

`organizationId + userId + achievementId`

An achievement can be unlocked only once by the same user inside the same organization.

### 2.2 Data sources

Achievement evaluation may use only official Core projections and services:

- Platform Statistics;
- Platform Progress.

Achievement evaluation must never query internal game-domain tables such as:

- attempts;
- rounds;
- answers;
- questions;
- Quiz-specific persistence.

### 2.3 Event trigger

Version 1 of the Achievement Consumer is triggered by:

- `GAME_FINISHED` version 2;
- official completed games only.

`GAME_FINISHED` version 1 must be accepted by the Event Engine but ignored by the Achievement Consumer as successfully completed and ineligible.

Training games must also be ignored without retry.

### 2.4 Evaluation order

For `GAME_FINISHED` version 2, the official consumer order is:

1. Platform Statistics;
2. Reward and Progress;
3. Achievements.

This guarantees that achievement criteria are evaluated using projections that already include the current completed game and the resulting progress.

### 2.5 Unlock and reward atomicity

An achievement unlock and its corresponding XP and coin reward form one logical operation.

The implementation must guarantee:

- one unlock;
- one reward;
- replay safety;
- retry safety;
- concurrency safety;
- no partial XP-only or coin-only reward.

Rewards must be applied through Platform Progress. The Achievement Service must not update balances or levels directly.

### 2.6 Visibility

Supported values:

- `visible`: shown before and after unlock;
- `hidden`: hidden while locked and revealed after unlock.

Visibility affects presentation only. It must not change evaluation or reward behavior.

### 2.7 Scope

All achievements in catalog version 1 use:

`scope: global`

Their criteria aggregate official activity across all compatible games in the Conte os Feitos platform.

---

## 3. Rarity rewards

| Rarity | XP | Coins |
| --- | ---: | ---: |
| bronze | 50 | 10 |
| silver | 150 | 30 |
| gold | 300 | 60 |
| legendary | 600 | 120 |

Rewards are granted once, at the first successful unlock.

---

## 4. Metric definitions

### `officialGamesCompleted`

Total number of official games completed by the user across the platform.

### `questionsAnswered`

Total number of questions answered in official completed games.

For `GAME_FINISHED` version 2, the current event contributes its `questionsAnswered` value through Platform Statistics.

### `perfectGames`

Total number of official completed games where:

`correctAnswers === questionsAnswered`

and:

`questionsAnswered > 0`

### `distinctOfficialPlayDaysUtc`

Number of distinct UTC calendar dates on which the user completed at least one official game.

The date is derived from the event's `completedAt`.

Multiple games completed on the same UTC date count as one day.

This metric is cumulative and does not represent a consecutive streak.

### `level`

Current level derived exclusively by Platform Progress.

The Achievement Consumer must not calculate or update level independently.

---

## 5. Achievement catalog

### 5.1 First Steps

```yaml
achievementId: first_steps
catalogVersion: 1
name: Primeiros Passos
description: Conclua sua primeira partida oficial.
category: first_steps
rarity: bronze
visibility: visible
scope: global
criterion:
  metric: officialGamesCompleted
  operator: greater_than_or_equal
  target: 1
reward:
  xp: 50
  coins: 10
```

### 5.2 Welcome to the Journey

```yaml
achievementId: level_5
catalogVersion: 1
name: Bem-vindo à Jornada
description: Alcance o nível 5 na plataforma.
category: progression
rarity: silver
visibility: visible
scope: global
criterion:
  metric: level
  operator: greater_than_or_equal
  target: 5
reward:
  xp: 150
  coins: 30
```

### 5.3 Apprentice of the Word

```yaml
achievementId: word_apprentice
catalogVersion: 1
name: Aprendiz da Palavra
description: Responda 100 perguntas em partidas oficiais.
category: knowledge
rarity: bronze
visibility: visible
scope: global
criterion:
  metric: questionsAnswered
  operator: greater_than_or_equal
  target: 100
reward:
  xp: 50
  coins: 10
```

### 5.4 Scholar

```yaml
achievementId: word_scholar
catalogVersion: 1
name: Estudioso
description: Responda 1.000 perguntas em partidas oficiais.
category: knowledge
rarity: silver
visibility: visible
scope: global
criterion:
  metric: questionsAnswered
  operator: greater_than_or_equal
  target: 1000
reward:
  xp: 150
  coins: 30
```

### 5.5 Master of the Scriptures

```yaml
achievementId: word_master
catalogVersion: 1
name: Mestre das Escrituras
description: Responda 10.000 perguntas em partidas oficiais.
category: knowledge
rarity: gold
visibility: visible
scope: global
criterion:
  metric: questionsAnswered
  operator: greater_than_or_equal
  target: 10000
reward:
  xp: 300
  coins: 60
```

### 5.6 Perfect Aim

```yaml
achievementId: perfect_first
catalogVersion: 1
name: Mira Perfeita
description: Conclua uma partida oficial sem errar nenhuma pergunta.
category: precision
rarity: bronze
visibility: hidden
scope: global
criterion:
  metric: perfectGames
  operator: greater_than_or_equal
  target: 1
reward:
  xp: 50
  coins: 10
```

### 5.7 Excellence

```yaml
achievementId: perfect_10
catalogVersion: 1
name: Excelência
description: Conclua 10 partidas oficiais perfeitas.
category: precision
rarity: silver
visibility: visible
scope: global
criterion:
  metric: perfectGames
  operator: greater_than_or_equal
  target: 10
reward:
  xp: 150
  coins: 30
```

### 5.8 Flawless

```yaml
achievementId: perfect_100
catalogVersion: 1
name: Impecável
description: Conclua 100 partidas oficiais perfeitas.
category: precision
rarity: gold
visibility: visible
scope: global
criterion:
  metric: perfectGames
  operator: greater_than_or_equal
  target: 100
reward:
  xp: 300
  coins: 60
```

### 5.9 Persistent

```yaml
achievementId: persistent_10
catalogVersion: 1
name: Perseverante
description: Conclua 10 partidas oficiais.
category: persistence
rarity: bronze
visibility: visible
scope: global
criterion:
  metric: officialGamesCompleted
  operator: greater_than_or_equal
  target: 10
reward:
  xp: 50
  coins: 10
```

### 5.10 Veteran

```yaml
achievementId: persistent_100
catalogVersion: 1
name: Veterano
description: Conclua 100 partidas oficiais.
category: persistence
rarity: silver
visibility: visible
scope: global
criterion:
  metric: officialGamesCompleted
  operator: greater_than_or_equal
  target: 100
reward:
  xp: 150
  coins: 30
```

### 5.11 Legend

```yaml
achievementId: persistent_1000
catalogVersion: 1
name: Lenda
description: Conclua 1.000 partidas oficiais.
category: persistence
rarity: legendary
visibility: visible
scope: global
criterion:
  metric: officialGamesCompleted
  operator: greater_than_or_equal
  target: 1000
reward:
  xp: 600
  coins: 120
```

### 5.12 Faithful for Seven Days

```yaml
achievementId: active_7_days
catalogVersion: 1
name: Fiel por 7 Dias
description: Jogue oficialmente em 7 dias diferentes.
category: frequency
rarity: silver
visibility: visible
scope: global
criterion:
  metric: distinctOfficialPlayDaysUtc
  operator: greater_than_or_equal
  target: 7
reward:
  xp: 150
  coins: 30
```

### 5.13 Consistency

```yaml
achievementId: active_30_days
catalogVersion: 1
name: Constância
description: Jogue oficialmente em 30 dias diferentes.
category: frequency
rarity: gold
visibility: visible
scope: global
criterion:
  metric: distinctOfficialPlayDaysUtc
  operator: greater_than_or_equal
  target: 30
reward:
  xp: 300
  coins: 60
```

### 5.14 Tireless

```yaml
achievementId: active_100_days
catalogVersion: 1
name: Incansável
description: Jogue oficialmente em 100 dias diferentes.
category: frequency
rarity: legendary
visibility: visible
scope: global
criterion:
  metric: distinctOfficialPlayDaysUtc
  operator: greater_than_or_equal
  target: 100
reward:
  xp: 600
  coins: 120
```

## 6. Catalog evolution

The following fields are immutable after an achievement is released:

- `achievementId`;
- logical meaning of the criterion;
- scope.

Names, descriptions and presentation metadata may evolve without changing the achievement identity.

Any incompatible criterion change requires:

- a new achievement ID; or
- a new catalog version with an explicit compatibility decision.

New achievements may be added additively.

Released achievement IDs must never be reused for a different criterion.

## 7. Version 1 exclusions

Catalog version 1 does not include:

- game-specific achievements;
- consecutive-day streak achievements;
- ranking achievements;
- social achievements;
- Mission-based achievements;
- manually granted achievements;
- repeatable achievements;
- tiered rewards after the initial unlock;
- notifications or visual presentation rules.
