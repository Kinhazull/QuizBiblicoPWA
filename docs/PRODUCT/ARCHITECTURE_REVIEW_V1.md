# Architecture Review v1

Data da revisão: **21/07/2026**  
Branch revisada: **feature/platform-foundation**  
Natureza: **revisão somente de leitura**

## Resumo executivo

A fundação apresenta boa separação entre o Quiz Bíblico legado e o Core Platform, persistência majoritariamente aditiva, APIs autenticadas somente de leitura e mecanismos consistentes de idempotência. Progress, Achievement, Mission, Event Engine e Statistics possuem testes comportamentais e limites explícitos; nenhum produtor real do Quiz foi conectado prematuramente.

Entretanto, a fundação ainda não deve receber a integração real do Quiz sem fechar decisões e lacunas específicas:

1. o escopo oficial de `RELEASE_V1_SCOPE.md` classifica progressão, missões, recompensas e Conquistas como adiados, embora as migrations `0023`–`0027` e suas interfaces já estejam na branch;
2. não existe ainda um limite transacional/outbox entre a persistência do fato no jogo e a publicação do evento;
3. falta escolher um único contrato de término do Quiz entre `GAME_FINISHED` e `QUIZ_FINISHED`;
4. o checkpoint próprio do Statistics Service não suporta corretamente uma nova versão do mesmo consumidor;
5. o Event Engine não possui rotina operacional de retry/dead letter; a retomada hoje depende de uma nova chamada para o mesmo evento;
6. Mission e Achievement ainda não são consumidores oficiais do Event Engine, e Reward/Notification ainda não foram implementados como serviços do Core.

**Conclusão executiva:** a arquitetura está pronta para iniciar a reconstrução interna do Quiz, preservar seu domínio e construir o adaptador de integração. Ela ainda não está pronta para ativar emissão real de eventos ou recompensas do Quiz até os pré-requisitos obrigatórios deste documento serem resolvidos.

## Resolução — Architecture Alignment de 21/07/2026

As pendências obrigatórias desta revisão foram encerradas antes da integração do Quiz:

- o escopo v1.0 passou a reconhecer a fundação persistente, mantendo a integração dos jogos desativada;
- `GAME_FINISHED` foi escolhido como único evento canônico de conclusão;
- outbox transacional e fronteira exclusiva de consumidores oficiais foram formalizadas no ADR 0001;
- o checkpoint de Statistics passou a usar `(event_id, consumer_version)`;
- o Event Engine ganhou retomada operacional limitada, backoff exponencial e `dead_letter` na quinta falha;
- a expiração de Missões foi isolada por usuário e organização;
- contratos legados em minúsculas foram substituídos pelo envelope canônico.

O registro histórico abaixo permanece inalterado como evidência do diagnóstico que originou as correções.

## Escopo e evidências analisadas

Documentos confrontados:

- `ROADMAP.md`;
- `RELEASE_V1_SCOPE.md`;
- `CORE_PLATFORM_ARCHITECTURE.md`;
- `CORE_PLATFORM_EVENT_ENGINE.md`;
- `GAME_INTEGRATION_CONTRACT.md`;
- `CORE_PLATFORM_PROGRESS_IMPLEMENTATION.md`;
- `CORE_PLATFORM_ACHIEVEMENT_IMPLEMENTATION.md`;
- `CORE_PLATFORM_MISSION_IMPLEMENTATION.md`;
- `CORE_PLATFORM_EVENT_ENGINE_IMPLEMENTATION.md`;
- `CORE_PLATFORM_STATISTICS_IMPLEMENTATION.md`.

Implementação confrontada:

- `functions/_lib/platform-progress.ts`;
- `functions/_lib/platform-achievements.ts`;
- `functions/_lib/platform-missions.ts`;
- `functions/_lib/platform-event-catalog.ts`;
- `functions/_lib/platform-event-engine.ts`;
- `functions/_lib/platform-event-consumers.ts`;
- `functions/_lib/platform-event-runtime.ts`;
- `functions/_lib/platform-statistics.ts`;
- `functions/api/platform/**`;
- `functions/api/profile/me.ts`;
- migrations `0023` a `0027`;
- diagnóstico, backup, privacidade, limpeza e testes relacionados ao Core.

## 1. Arquitetura

### Aderência confirmada

| Decisão arquitetural | Evidência | Avaliação |
| --- | --- | --- |
| Servidor como fonte da verdade | Concessões e mutações existem apenas em módulos internos; APIs públicas do Core são de leitura. | Aderente. |
| Quiz preservado como domínio próprio | Nenhum serviço do Core consulta `rounds` ou `attempts` para produzir progressão, missão, conquista ou estatística. | Aderente. |
| Medalhas separadas de Conquistas | `user_badges` permanece legado; Conquistas usam `platform_achievement_definitions` e `user_platform_achievements`. | Aderente. |
| Progressão global separada da pontuação | XP/moedas usam ledgers próprios e nível é derivado por `quadratic-v1`. | Aderente. |
| Idempotência no servidor | Ledgers usam `event_id`; Missões usam `(assignment_id,event_id)`; Event Engine usa recibos por consumidor; Statistics possui checkpoint próprio. | Aderente, com ressalva de versão em Statistics. |
| Isolamento por organização | Serviços validam usuário ativo junto ao `organization_id`; APIs derivam identidade da sessão. | Aderente, exceto expiração global de Missões. |
| Projeções reconstruíveis | Statistics reconstrói projeções a partir do ledger e checkpoints confirmados. | Aderente. |
| Nenhum produtor real antecipado | `publishOfficialCoreEvent` existe, mas Quiz e autenticação ainda não o chamam. | Aderente. |

### Responsabilidades sobrepostas

#### Progress, XP e Reward no mesmo módulo

`platform-progress.ts` atualmente:

- mantém o saldo consolidado;
- calcula nível;
- grava o ledger de XP;
- grava o ledger de moedas;
- executa as concessões.

Na arquitetura aprovada, XP Service, Reward Service e User Progress Service possuem responsabilidades distintas. A união atual é aceitável como modular monolith inicial, mas precisa ser registrada explicitamente como decisão temporária. Sem isso, o módulo tende a acumular regras de recompensa, saldo, curva e orquestração.

#### Mission chama Progress diretamente

`claimMissionReward` chama `grantXp` e `grantCoins` diretamente. Isso preserva idempotência, mas contorna o Reward Service previsto. Antes de recompensas gerais entrarem em produção, deve existir:

- Reward Service explícito; ou
- ADR declarando que `platform-progress.ts` representa temporariamente Reward + XP + Progress, com limites e plano de extração.

#### Achievement não avalia critérios

`unlockAchievement` valida definição, usuário e escopo, mas recebe o código da Conquista já escolhido pelo chamador. Atualmente isso é seguro porque não existe endpoint público de desbloqueio. Ao integrar eventos, o Achievement Service deve se tornar consumidor oficial e avaliar critérios versionados; um adaptador de jogo não deve escolher arbitrariamente a conquista a conceder.

#### Mission não valida o evento no ledger

`recordMissionProgress` recebe `eventId` e quantidade de um chamador interno, mas não verifica se o evento pertence ao ledger oficial, ao usuário, à organização, ao tipo e ao jogo esperados pelo critério. Isso é aceitável enquanto não há produtores reais, porém precisa ser substituído por consumo do Event Engine antes da integração do Quiz.

### Serviço fazendo mais do que deveria

O principal caso é Mission Service, que atualmente:

- atribui e expira missões;
- registra progresso;
- conclui;
- concede XP e moedas;
- marca resgate.

A concessão deveria ser delegada ao Reward Service. Os demais serviços mantêm limites adequados.

## 2. Event Engine

### Eventos atuais

O catálogo atual é suficiente para validar o motor e integrar futuramente um primeiro jogo simples:

- autenticação: `USER_REGISTERED`, `USER_LOGGED_IN`, `DAILY_LOGIN`;
- jogos: `GAME_STARTED`, `GAME_FINISHED`, `QUESTION_ANSWERED`, `QUIZ_FINISHED`;
- plataforma: `XP_GRANTED`, `LEVEL_UP`, `ACHIEVEMENT_UNLOCKED`, eventos de Missão e Recompensa.

Contudo, o contrato versão 1 de `GAME_FINISHED` contém somente `status` e `score`. Ele não transporta:

- modo da sessão;
- duração confiável;
- dificuldade;
- métricas comuns adicionais;
- motivo de inelegibilidade ou contexto competitivo.

Por isso, o Statistics Service mantém tempo e dificuldade em `0`/`null`. Antes de integrar o Quiz ou novos jogos, deve ser aprovada uma nova versão de payload ou um evento específico que forneça apenas as métricas realmente necessárias.

### Eventos potencialmente redundantes

#### `GAME_FINISHED` e `QUIZ_FINISHED`

Os dois representam o término do Quiz. A documentação já proíbe dupla emissão, mas a escolha ainda não foi tomada. Deve ser definido um único fato canônico:

- preferencialmente `GAME_FINISHED` com contrato comum versionado e extensão mínima; ou
- `QUIZ_FINISHED` como especialização, com adaptador explícito e deduplicação.

Manter ambos sem decisão cria risco de duplicar estatísticas, missões e recompensas.

#### `XP_GRANTED` e `REWARD_GRANTED`

Não são necessariamente redundantes se formarem uma cadeia causal:

`REWARD_GRANTED` descreve a concessão de uma recompensa; `XP_GRANTED` descreve a gravação efetiva no ledger de XP. Essa distinção deve ser documentada no contrato do Reward Service antes de ambos serem emitidos.

### Consistência do contrato

Pontos consistentes:

- nomes em `UPPER_SNAKE_CASE`;
- versão separada do tipo;
- rejeição de campos desconhecidos;
- allowlist de produtor e serviço;
- `eventId` imutável com fingerprint;
- limites de payload;
- recibo `(eventId,consumerId,handlerVersion)`;
- ausência de endpoint público de publicação.

Inconsistências documentais:

- `CORE_PLATFORM_ARCHITECTURE.md` ainda apresenta exemplos legados como `game.completed.v1`, `xp.granted.v1` e `schemaVersion`, enquanto o contrato implementado usa tipo em maiúsculas e campo `version`;
- o mesmo documento descreve `sourceId` e `gameId` como campos diretos, enquanto a implementação canônica os coloca em `source`;
- `CORE_PLATFORM_EVENT_ENGINE.md` permite conceitualmente `userId=null` para eventos organizacionais, mas a migration e o tipo atual exigem usuário. Como todos os eventos do MVP são pessoais, o correto é documentar essa limitação até existir um caso real;
- Achievement ainda retorna `achievement.unlocked.v1`, contrato preparatório não conectado ao catálogo `ACHIEVEMENT_UNLOCKED`.

### Retry, ordem e retomada

O MVP implementa lease e estado `retryable_failed`, mas:

- não possui scheduler ou operação interna que busque recibos vencidos/falhos;
- não aplica backoff;
- nunca promove automaticamente para `dead_letter`;
- depende da republicação do mesmo evento para tentar novamente;
- não implementa outbox transacional no produtor.

Essas limitações estão parcialmente documentadas, porém são bloqueios para conectar um produtor real que prometa efeitos secundários confiáveis.

### Registro oficial de consumidores

Somente `platform-statistics` está no registro oficial. Mission, Achievement, Progress/Reward e Notification aparecem como consumidores planejados nos documentos, mas ainda não estão conectados. Isso não é defeito do MVP, desde que nenhum produtor real seja ativado antes dessas integrações explícitas.

`publishCoreEvent` continua exportado e aceita uma lista arbitrária de consumidores. Não há endpoint público, portanto não existe exposição externa, mas futuros produtores devem usar exclusivamente `publishOfficialCoreEvent`. Convém tornar essa regra verificável por teste/arquitetura para evitar bypass acidental do registro central.

## 3. Persistência

### Caráter aditivo

As migrations do Core Platform são aditivas:

- `0023_platform_user_progress.sql`;
- `0024_platform_achievements.sql`;
- `0025_platform_missions.sql`;
- `0026_platform_event_engine.sql`;
- `0027_platform_statistics.sql`.

Elas apenas criam tabelas e índices. Não contêm `DROP`, `DELETE`, `TRUNCATE` ou alteração destrutiva.

No histórico completo do projeto existe `DROP INDEX` em `0016_runtime_hardening.sql`. Trata-se de ajuste anterior da v1.0 do Quiz, não de remoção de tabela ou dado e não foi introduzido pela fundação modular. Portanto, a afirmação correta é: **as novas migrations do Core são exclusivamente aditivas; o histórico total contém uma substituição controlada de índice**.

### Tabelas e índices

Não foram encontrados nomes duplicados ou índices funcionalmente idênticos entre `0023` e `0027`.

Algumas estruturas semelhantes são intencionais:

- ledger do Event Engine registra entrega geral;
- `user_platform_mission_progress_events` garante idempotência do efeito de Missão;
- `platform_statistics_event_checkpoints` garante atomicidade própria da projeção estatística.

Essa duplicação de confirmação é defensiva e coerente com consumidores idempotentes.

### Problema de versionamento no checkpoint estatístico

`platform_statistics_event_checkpoints` usa `event_id` como chave primária única, embora possua `consumer_version`. Se `platform-statistics` evoluir de handler 1 para handler 2, o Event Engine permite novo recibo por versão, mas o checkpoint estatístico rejeitará a nova linha por conflito no mesmo `event_id` e não aplicará a nova projeção.

Antes da primeira publicação da migration `0027`, a chave conceitual deve ser revisada para `(event_id,consumer_version)` ou para outra identidade explícita do consumidor. Depois de publicada, a correção exigirá migration adicional.

### Estruturas reservadas sem fonte atual

`user_platform_game_difficulty_statistics`, `total_play_time_ms` e `timed_sessions` foram criados antes de existir evento que os alimente. Isso não causa inconsistência e evita uma migration imediata, mas aumenta a superfície operacional. Há duas opções válidas antes da primeira publicação:

1. manter as estruturas e registrar formalmente que são reservas de schema; ou
2. removê-las da migration ainda não publicada e criá-las quando o contrato v2 for aprovado.

Não há ganho material em mantê-las sem uma decisão documentada.

### Catálogos globais e organizações

Definições de Achievement e Mission são globais, enquanto desbloqueios e atribuições são organizacionais. O backup por organização inclui novamente os catálogos globais completos. Isso é funcional, mas a estratégia de restauração deve definir como reconciliar catálogos globais sem duplicar ou sobrescrever versões já existentes.

## 4. APIs

### Endpoints existentes

| Endpoint | Método | Natureza | Avaliação |
| --- | --- | --- | --- |
| `/api/platform/progress` | GET | Leitura autenticada | Coerente. |
| `/api/platform/achievements` | GET | Leitura autenticada | Coerente. |
| `/api/platform/missions/current` | GET | Consulta com atribuição/expiração | Semântica exige revisão. |
| `/api/platform/statistics` | GET | Leitura autenticada | Coerente. |
| `/api/profile/me` | GET/PATCH | Composição de perfil e atualização limitada | Coerente, com possível duplicação de leitura. |

Todas as APIs do Core derivam usuário e organização da sessão e usam `Cache-Control: no-store, private`. Não existe endpoint público para:

- conceder XP ou moedas;
- desbloquear Conquista;
- avançar ou concluir Missão;
- publicar evento;
- incrementar estatísticas.

### GET de Missão possui efeitos de escrita

`GET /api/platform/missions/current` chama `getCurrentDailyMission`, que:

- expira Missões;
- cria uma atribuição diária quando necessário.

Get-or-create idempotente pode ser uma decisão válida, mas deve ser documentado porque GET deixa de ser estritamente somente leitura. Além disso, `expireMissions` atualiza todas as missões vencidas de todas as organizações a cada consulta de qualquer usuário. Não há exposição de dados, porém há mutação cruzada entre organizações e custo de escrita desnecessário.

Recomendação: limitar a expiração ao usuário/organização consultados ou movê-la para rotina operacional; manter a atribuição idempotente claramente documentada.

### Redundância aparente

`/api/profile/me` agrega progressão, resumo de Conquistas e Statistics, enquanto endpoints dedicados também existem. Essa sobreposição é aceitável como endpoint de composição para a tela Perfil, mas a política deve ser clara:

- telas compostas usam o endpoint agregador;
- telas detalhadas usam endpoints dedicados;
- uma mesma tela não deve chamar ambos para o mesmo dado.

Sem essa regra, a Home e o Perfil podem duplicar consultas ao D1.

### Endpoints privados

As mutações internas já não estão expostas. `publishCoreEvent`, `grantXp`, `grantCoins`, `unlockAchievement`, `recordMissionProgress` e `claimMissionReward` são funções internas. Devem permanecer sem rota pública quando novos jogos forem integrados.

## 5. Segurança

### Controles aprovados

- identidade e organização derivadas da sessão nos endpoints;
- consultas parametrizadas;
- validação de usuário ativo nas mutações internas;
- allowlist de produtores e jogos no Event Engine;
- payload fechado, versionado e limitado;
- ausência de segredos nos erros do consumidor;
- ausência de endpoints cliente para mutações de Core;
- `no-store, private` nas leituras autenticadas;
- idempotência nos ledgers e consumidores;
- Quiz ainda não pode conceder progresso global.

### Modificação exclusiva do servidor

O cliente não consegue, pelas rotas existentes:

- alterar XP, moedas ou nível;
- conceder recompensas;
- avançar Missões;
- desbloquear Conquistas;
- publicar eventos;
- modificar projeções estatísticas.

O risco futuro está nos chamadores internos. Antes da integração, todo chamador deve receber contexto derivado do registro persistido e não reutilizar `userId`, `organizationId`, score, duração ou modo fornecidos pelo navegador.

### Isolamento organizacional

O isolamento é consistente nas consultas e gravações pessoais. A exceção arquitetural é `expireMissions`, que executa atualização global sem filtro organizacional. A operação é determinística e não revela dados, mas viola o princípio de que uma solicitação de um tenant não deve causar manutenção nos registros de outro.

Catálogos globais de Missões e Conquistas são uma decisão válida, porém essa natureza global precisa ser explicitada nos documentos de domínio e restauração.

### Processamento duplicado

As proteções atuais são fortes:

- `eventId` global e fingerprint imutável;
- recibo por consumidor e versão;
- ledgers com `event_id` único;
- progresso de Missão único por atribuição/evento;
- desbloqueio único por usuário/código/escopo;
- checkpoint estatístico próprio.

Riscos residuais:

- dupla emissão `GAME_FINISHED` + `QUIZ_FINISHED` para o mesmo fato;
- nova versão de Statistics bloqueada pela chave atual do checkpoint;
- produtores usando `publishCoreEvent` diretamente com lista incompleta;
- eventos derivados preparatórios em formato legado e novo formato ao mesmo tempo;
- ausência de outbox/checkpoint no produtor entre persistência do jogo e publicação.

## 6. Performance

### Consultas adequadas ao estágio atual

- leituras são filtradas por usuário e organização;
- migrations criam índices para os principais caminhos de catálogo, usuário, status, retry e tempo;
- operações idempotentes usam constraints e `DB.batch` em vez de leitura seguida de escrita não protegida;
- estado vazio não cria linha de progresso;
- Event Engine limita payload e executa poucos consumidores no MVP.

### Pontos de otimização

#### Expiração global em cada leitura de Missão

`expireMissions` pode produzir uma escrita global em todo carregamento da Home. Mesmo apoiada por índice `(state,expires_at)`, essa operação crescerá com todas as organizações. Deve ser escopada ou agendada antes de Missões reais.

#### Sequência estatística recalculada por histórico completo

Após cada evento, Statistics lê todos os dias ativos do usuário para recalcular sequências. O custo cresce com o tempo de uso. Para o início é pequeno, mas deve evoluir para atualização incremental ou consulta limitada quando a base crescer.

#### Reconstrução estatística sequencial

`rebuildUserStatistics` reaplica eventos um a um e recalcula derivados após cada evento. Em históricos extensos, o custo tende a crescer mais que linearmente. A reconstrução deve ser uma operação administrativa limitada, paginada e com cálculo derivado realizado uma vez ao final.

#### Dispatcher síncrono

Cada consumidor adiciona leituras e escritas sequenciais à publicação. A abordagem é adequada ao MVP, mas não deve crescer indefinidamente dentro da resposta da partida. Antes de vários consumidores reais, é necessário orçamento de operações, timeout e estratégia de processamento posterior.

#### Perfil composto

`/api/profile/me` consulta preferências, estatísticas legadas, pódios, progresso, Conquistas e Statistics. As consultas do Core são executadas sequencialmente. As leituras independentes podem ser paralelizadas ou consolidadas em uma política de composição antes de volume maior.

#### Catálogo de Conquistas

`listAchievements` usa CTE, subconsultas de versão e histórico por usuário. Os índices atuais atendem o piloto, mas a consulta deve ser medida quando o catálogo possuir muitas versões. Não há evidência atual de gargalo.

## 7. Documentação

### Pontos fortes

- responsabilidades e limites de domínio estão amplamente descritos;
- cada vertical possui documento de implementação;
- Event Engine documenta idempotência, falha e extensibilidade;
- contrato de integração de jogos estabelece ciclo de sessão e resultado normalizado;
- separação entre Medalhas e Conquistas está consistente;
- ausência de integração do Quiz é explicitada em todas as verticais;
- migrations e impactos operacionais estão registrados.

### Inconsistências

1. `RELEASE_V1_SCOPE.md` adia progressão, Missões, recompensas e Conquistas, mas a branch já implementa essas estruturas e interfaces.
2. `CORE_PLATFORM_ARCHITECTURE.md` usa nomenclatura de evento anterior ao contrato canônico do Event Engine.
3. `CORE_PLATFORM_ARCHITECTURE.md` lista XP e Conquistas dentro de Statistics, enquanto a implementação corretamente evita duplicá-los.
4. `CORE_PLATFORM_EVENT_ENGINE.md` ainda está com status de proposta, embora o MVP esteja implementado.
5. `GAME_INTEGRATION_CONTRACT.md` está como proposta para aprovação e ainda não possui decisão registrada.
6. `CORE_PLATFORM_ACHIEVEMENT_IMPLEMENTATION.md` menciona evento legado minúsculo, sem registrar claramente o adaptador futuro para `ACHIEVEMENT_UNLOCKED`.
7. Natureza global dos catálogos de Missões e Conquistas não está suficientemente explícita no modelo de domínio e na estratégia de restauração.
8. O comportamento de escrita idempotente de `GET /api/platform/missions/current` não está descrito como decisão de API.
9. A união temporária entre XP, moedas, Reward e User Progress não possui ADR.
10. Não há decisão final sobre retenção de eventos, backoff, limite de tentativas e dead letter.

### Decisões ainda não registradas

- versão oficial da próxima release que conterá o Core persistente;
- evento canônico de término do Quiz;
- outbox/checkpoint do produtor no D1;
- política de retry e dead letter;
- Reward Service real ou modular monolith temporário;
- política de versionamento/reprocessamento de consumidores;
- contrato v2 para duração, modo e dificuldade;
- retenção e anonimização do ledger de eventos;
- estratégia de restauração dos catálogos globais;
- política para eventos organizacionais sem usuário.

## 8. Pendências classificadas

### Obrigatórias para v1.0

Estas pendências são obrigatórias **caso a nova fundação seja incluída na release chamada v1.0**. A alternativa válida é manter o Core fora da v1.0, conforme o escopo atual, e publicá-lo em versão posterior.

| Pendência | Motivo | Critério de fechamento |
| --- | --- | --- |
| Reconciliar escopo e implementação | `RELEASE_V1_SCOPE.md` adia exatamente os recursos implementados em `0023`–`0027`. | Decisão formal: excluir Core persistente da v1.0 ou aprovar novo escopo/versão. |
| Corrigir identidade versionada do checkpoint estatístico antes de publicar `0027` | A PK apenas por `event_id` impede handler futuro. | Chave suporta evento + consumidor/versão e teste de reprocessamento. |
| Definir outbox/checkpoint atômico do produtor | Sem ele, o jogo pode persistir resultado e perder a emissão. | Fato e evento gravados atomicamente ou checkpoint durável comprovado. |
| Definir evento canônico de conclusão do Quiz | Dois eventos podem representar o mesmo término. | Escolha documentada e teste impedindo dupla emissão. |
| Implementar retomada operacional do Event Engine | `retryable_failed` não é reprocessado sem nova publicação. | Retry controlado, limite, backoff e dead letter observáveis. |
| Corrigir expiração global de Missões se Missões forem publicadas | Uma leitura de um tenant atualiza registros de todos. | Expiração escopada ou rotina operacional separada. |
| Conectar mutações somente por consumidores oficiais se houver produtor real | Mission/Achievement aceitam chamadas internas ainda não vinculadas ao ledger. | Consumidores validam evento, usuário, organização, jogo e critério. |

### Recomendada para v1.1

| Pendência | Benefício |
| --- | --- |
| Implementar Reward Service ou ADR do módulo combinado | Evita acoplamento crescente entre Mission e Progress. |
| Alinhar toda nomenclatura documental ao Event Engine canônico | Remove ambiguidade de tipo, versão e source. |
| Definir contrato v2 de `GAME_FINISHED` | Permite tempo, modo e dificuldade sem dados inventados. |
| Otimizar sequência e reconstrução de Statistics | Controla custo com histórico longo. |
| Definir política de endpoint agregador versus dedicado | Evita consultas duplicadas na Home e no Perfil. |
| Paralelizar leituras independentes do Perfil | Reduz latência do endpoint composto. |
| Documentar/restaurar catálogos globais | Evita conflito em backup por organização. |
| Definir retenção do ledger e payloads de privacidade | Controla crescimento e minimização de dados. |
| Restringir o uso de `publishCoreEvent` ao runtime oficial | Evita consumidores omitidos acidentalmente. |
| Formalizar status aprovado dos documentos já implementados | Mantém governança coerente. |

### Apenas melhoria futura

| Melhoria | Observação |
| --- | --- |
| Suporte a eventos organizacionais sem `userId` | Implementar somente quando surgir caso real. |
| Fila externa ou processamento distribuído | Desnecessário para o estágio atual; preservar API interna. |
| Sequence monotônico por agregado | Útil apenas quando houver dependência real de ordem. |
| Estatísticas de dificuldade e tempo | Ativar após contrato de evento aprovado. |
| Interface administrativa de reconstrução | Pode aguardar volume e necessidade operacional. |
| Métricas e observabilidade detalhadas por consumidor | Evoluir junto ao uso real do Event Engine. |
| Extração física de cada serviço em módulos separados | O modular monolith atual é adequado enquanto limites forem respeitados. |

## 9. Conclusão

### A fundação está pronta?

**Sim, com condicionantes.** A fundação está pronta para iniciar a reconstrução do Quiz enquanto essa reconstrução:

- preserva `rounds`, `attempts`, Jornadas, Ranking e Medalhas;
- mantém o Quiz como fonte da verdade de suas partidas;
- não publica ainda eventos reais para o Core;
- cria o adaptador de integração atrás de uma fronteira interna;
- define o resultado normalizado e seus testes antes da emissão;
- não concede XP, moedas, Missões ou Conquistas a partir do cliente.

### A fundação está pronta para conectar o Quiz ao Core?

**Ainda não.** Antes da ativação devem ser fechados:

1. decisão de escopo e versão da release;
2. contrato canônico de conclusão;
3. outbox/checkpoint do produtor;
4. retry operacional do Event Engine;
5. versionamento correto do checkpoint de Statistics;
6. consumidores oficiais e regras de Reward/Mission/Achievement;
7. testes de integração do fluxo completo sem usar dados legados como fonte do Core.

### Parecer final

A direção arquitetural é consistente, segura e extensível. Não há necessidade de reescrever a fundação. Os problemas encontrados são principalmente lacunas de integração, governança de versão e alguns limites operacionais que foram deliberadamente deixados fora dos MVPs.

O próximo passo recomendado não é implementar mais funcionalidades compartilhadas. É realizar uma etapa curta de **Architecture Alignment**, resolvendo as pendências obrigatórias, e então iniciar a reconstrução do Quiz em duas fases:

1. reconstrução preservando integralmente o comportamento e a persistência atuais;
2. integração com o Core por adaptador versionado, somente depois dos contratos e mecanismos de recuperação estarem aprovados.

Nenhum código, API, teste ou migration foi alterado nesta revisão.
