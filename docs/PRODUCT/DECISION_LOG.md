# Registro de decisões

As decisões são aditivas. Se uma decisão mudar, uma nova entrada deve registrar a substituição e seus motivos, sem apagar o histórico anterior.

## 2026-07-18 — Fundação modular aprovada

**Status:** aceita.

### Contexto

O Conte os Feitos iniciou como Quiz Bíblico PWA e concluiu o piloto técnico `v1.0.0`. A evolução seguinte transforma o produto em plataforma modular de Jogos e Desafios Bíblicos, preservando o Quiz validado.

### Decisões

1. **Marca e produto:** Conte os Feitos é a marca; Jogos e Desafios Bíblicos é o produto atual da futura plataforma cristã modular.
2. **Primeiro módulo:** o Quiz Bíblico permanece como primeiro módulo funcional.
3. **Jornada:** pertence exclusivamente ao Quiz Bíblico.
4. **Medalhas:** permanecem premiações competitivas das Jornadas.
5. **Conquistas:** serão objetivos gerais da plataforma e não substituem Medalhas.
6. **Temporadas futuras:** afetarão apenas desbloqueáveis e colecionáveis gerais, salvo nova decisão formal. As Temporadas já existentes do Quiz permanecem no domínio do Quiz.
7. **Conteúdo:** os jogos continuarão utilizando conteúdo amplo de toda a Bíblia.
8. **Persistência:** novos módulos não reutilizarão `rounds` e `attempts` sem decisão formal.
9. **Fonte da verdade:** pontuação, progressão, moedas, recompensas e desbloqueáveis persistentes permanecem sob validação do servidor.
10. **Estabilidade:** a `main` e a tag `v1.0.0` representam a versão estável do piloto; implementações futuras ocorrem em branch própria.
11. **Roadmap:** a numeração oficial é Módulo 0 a Módulo 10. Shell, catálogo, Home modular e integração do Quiz são subdivisões do Módulo 2.

### Consequências

- O Módulo 1 não deve iniciar antes da aprovação desta fundação documental.
- Os primeiros trabalhos do Módulo 2 podem ser realizados sem migrations.
- A criação do núcleo de progressão e sua persistência pertence ao Módulo 3.
- Mudanças de banco ou compartilhamento de domínios exigem nova entrada neste registro.

### Baseline da decisão

- Referência: `v1.0.0`, commit `92b7249`.
- Branch de preparação: `feature/platform-foundation`.
- Baseline: instalação congelada, lint, build e suíte `test:all` aprovados antes das alterações documentais.

## 2026-07-21 — Architecture Alignment antes da integração do Quiz

**Status:** aceita.

### Decisões

1. `GAME_FINISHED` é o único evento canônico de conclusão de jogo, inclusive para o Quiz; `QUIZ_FINISHED` foi retirado antes de qualquer produtor real.
2. O Quiz futuro persistirá resultado e outbox no mesmo limite atômico. Sem outbox/checkpoint durável, a emissão não será ativada.
3. Adaptadores de jogos publicam apenas pelo runtime oficial e nunca chamam diretamente serviços mutáveis do Core.
4. Consumidores oficiais são a única fronteira autorizada para progresso, recompensas, Conquistas, Missões e Estatísticas derivados de jogos.
5. O Event Engine executa no máximo cinco tentativas, com backoff exponencial e `dead_letter`; a rotina interna de retomada não exige republicação externa.
6. Checkpoints de Statistics são identificados por evento e versão do consumidor.
7. A materialização diária por GET de Missão é aceita como operação idempotente, mas toda expiração é isolada por usuário e organização.
8. `platform-progress.ts` representa temporariamente XP Service, ledger de moedas e User Progress em um modular monolith. Reward permanece uma fronteira conceitual; novos tipos de recompensa exigem extração ou nova ADR.
9. As migrations `0023`–`0027` continuam aditivas e ainda não publicadas. A fundação persistente passa a fazer parte do escopo técnico da plataforma v1.0, mas não autoriza integração do Quiz nesta sprint.

### Consequências

- A integração do Quiz deverá implementar a outbox e testes atômicos antes de publicar eventos.
- `GAME_FINISHED` versão `1` permanece aceito como contrato legado mínimo. A Sprint 3.5A aprovou a versão `2` para novos eventos do Quiz com modo, acertos, total de perguntas, conclusão, tentativa e versão do jogo; duração e dificuldade continuam fora do contrato.
- Notification Service, integração real de Mission/Achievement e recompensas acionadas por jogos continuam fora desta sprint.
