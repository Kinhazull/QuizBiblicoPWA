# Mission Generator — implementação da Sprint 3.7C

## Escopo

O Mission Generator é um seletor interno, puro e determinístico. Ele deriva candidatos da representação executável de `MISSION_CATALOG.md` e produz blueprints de `Player Missions` em estado arquitetural `AVAILABLE`.

Nesta sprint o Generator não persiste atribuições, não acompanha progresso, não consome eventos, não concede recompensas, não agenda janelas e não expõe API pública.

## Seleção

- filtra os tipos `daily`, `weekly` e `permanent` solicitados;
- separa candidatos por pool e retorna no máximo uma missão de cada pool;
- aplica jogos habilitados, dificuldade, temporada, cooldown, missões existentes e IDs já atribuídos antes do peso;
- usa os pesos somente dentro de cada pool;
- usa seleção determinística baseada em seed, organização, usuário, janela e pool;
- trata missões permanentes de peso zero com pesos iguais, pois são atribuídas por elegibilidade;
- produz `generationKey` estável para a mesma identidade de geração.

O filtro de jogo aceita uma missão de escopo `game` somente quando ao menos um `gameId` da definição está habilitado. Missões globais permanecem independentes de jogo. Entradas `event` não são selecionadas nesta sprint.

## Cooldown e duplicidade

Cooldowns ISO `P<n>D` usam o instante confiável informado pelo chamador interno. `once` torna a missão permanentemente inelegível depois do primeiro registro resolvido. O Generator também recusa pools já presentes e identidades de missão existentes, impedindo duplicidade dentro e entre chamadas preparatórias.

O serviço não consulta histórico por conta própria. Uma futura camada de aplicação será responsável por fornecer histórico e missões existentes a partir da persistência oficial e materializar o resultado de maneira transacional.

## Catálogo executável

`platform-mission-catalog.ts` é a representação estruturada das 20 entradas aprovadas em `MISSION_CATALOG.md`. Um contrato futuro deverá continuar verificando a equivalência integral entre documentação e runtime sempre que o catálogo evoluir.

## Limites desta sprint no momento da entrega

- o Mission Consumer ainda não existia nesta entrega; ele foi implementado posteriormente na Sprint 3.7D;
- nenhuma missão é gravada em `user_platform_missions` pelo Generator;
- não existe Scheduler;
- não existe integração com o Quiz ou outro jogo;
- Progress, Reward, Achievement e Statistics não foram alterados;
- não foi criada migration, API ou operação administrativa.
