# Achievement Service — implementação inicial

## Escopo

Esta vertical implementa a persistência, o desbloqueio idempotente e a consulta autenticada das Conquistas gerais da plataforma. Nenhum jogo está integrado e nenhuma Conquista é cadastrada automaticamente nesta etapa.

## Separação de domínios

- `user_badges` e `/api/badges` continuam exclusivos das Medalhas competitivas das Jornadas do Quiz Bíblico.
- `platform_achievement_definitions` e `user_platform_achievements` pertencem ao Achievement Service do Core Platform.
- Uma Conquista não altera ranking, tentativa, Jornada ou Medalha.

## Persistência

### Catálogo versionado

`platform_achievement_definitions` armazena código estável, versão, apresentação, escopo, critério e estado. O catálogo admite escopo `global` e prepara escopo `game`, mas nenhum jogo o utiliza nesta etapa.

Uma nova versão pode substituir a definição ativa sem invalidar um desbloqueio anterior do mesmo código.

### Desbloqueios

`user_platform_achievements` registra usuário, organização, definição cumprida, código estável, escopo, evento de origem e data. A unicidade `(user_id, achievement_code, scope_key)` garante um desbloqueio permanente por usuário e escopo, independentemente de novas versões da definição.

## Serviço

`functions/_lib/platform-achievements.ts` oferece:

- `listAchievements`: lista a versão ativa mais recente de cada definição e o estado do usuário;
- `getAchievementSummary`: retorna total, desbloqueadas e pendentes;
- `unlockAchievement`: valida usuário, organização, definição e escopo, persistindo de forma idempotente.

O serviço prepara o envelope canônico `ACHIEVEMENT_UNLOCKED` versão `1` somente quando uma nova linha foi persistida. Não o publica nesta etapa; a publicação futura ocorrerá exclusivamente por consumidor oficial, preservando `causationId` e evitando contratos paralelos.

Critérios secretos, nome real e ícone ficam ocultos na consulta até o desbloqueio.

## Interfaces

- `GET /api/platform/achievements` exige sessão e retorna catálogo e resumo com `Cache-Control: no-store, private`.
- `GET /api/profile/me` inclui somente o resumo necessário ao Perfil.
- O Perfil apresenta a quantidade de Conquistas desbloqueadas no bloco de progresso da plataforma.

Não existe endpoint público de desbloqueio. Jogos futuros deverão chamar o serviço apenas após validação de evento pelo servidor.

## Operação

A migration `0024_platform_achievements.sql` é aditiva. Backup, diagnóstico estrutural e limpeza de dados do piloto reconhecem as novas tabelas. Definições do catálogo são preservadas na limpeza; desbloqueios de teste são removidos.

Nenhuma migration remota, deploy, integração de jogo, notificação, pop-up, animação ou recompensa foi executada nesta implementação.
