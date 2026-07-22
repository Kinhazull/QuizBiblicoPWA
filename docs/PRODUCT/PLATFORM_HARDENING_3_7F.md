# Platform Hardening — Sprint 3.7F

Data: **21/07/2026**

Branch: **feature/platform-foundation**

Natureza: **hardening sem novas funcionalidades, APIs, serviços ou migrations**

## Escopo revisado

A revisão cruzou Statistics, Reward, Achievement, Mission, Progress, Event Engine, catálogo de eventos, registro oficial de consumidores, ledgers e documentação de implementação. Também foram pesquisados TODOs/FIXMEs/HACKs no código executável e referências históricas incompatíveis com as sprints concluídas.

## Inconsistências encontradas e corrigidas

1. **Dependência de Achievement não era protegida contra falha parcial.** Achievement consulta Statistics e Progress, mas o Event Engine continuava os demais consumidores quando Statistics ou Reward falhava. Isso poderia concluir a avaliação com projeções antigas e perder um desbloqueio. O consumidor agora exige recibos concluídos de `platform-statistics:1` e `reward-progress:1`; sem eles, entra em retry seguro.
2. **Retry usava ordem alfabética acidental.** Entregas vencidas do mesmo evento podiam reprocessar Achievement antes de Statistics. O retry agora preserva a ordem explícita do registro oficial, sem alterar a política de lease, backoff, limite ou dead letter.
3. **Conclusão de missão estava separada do batch de progresso.** Incremento, marcação idempotente e transição para `completed` agora compartilham o mesmo `DB.batch`, evitando uma meta persistida como atingida enquanto a missão permanecia ativa após falha intermediária.
4. **Missão sem recompensa não podia ser resgatada.** O contrato já permitia XP e moedas zero, mas o Progress Service exigia soma positiva. O claim sem recompensa agora conclui sem criar linhas vazias nos ledgers.
5. **Payload v2 duplicado.** Reward e Mission mantinham tipos locais equivalentes. `GameFinishedV2Payload` passou a ser compartilhado pelo catálogo oficial de eventos.
6. **Constantes de Statistics eram privadas, ao contrário dos demais consumidores.** ID e versão agora são exportados e usados pela verificação explícita de dependências, reduzindo strings paralelas.
7. **Documentação descrevia consumidores e integrações anteriores.** Os documentos de Event Engine, Statistics, Mission, Generator e arquitetura foram alinhados ao registro atual e ao contrato v2.

## Garantias verificadas

- Consumer versions atuais: `platform-statistics:1`, `reward-progress:1`, `platform-achievements:1` e `platform-missions:1`.
- Idempotência do Event Engine: `(event_id, consumer_id, handler_version)`.
- Statistics: `(event_id, consumer_version)` e projeções em batch.
- Reward: IDs determinísticos `reward-xp`, `reward-coins` e `reward-daily`.
- Achievement: unicidade do desbloqueio e ledgers `achievement-xp`/`achievement-coins` no mesmo batch.
- Mission: `(assignment_id,event_id)` para progresso e ledgers `mission-xp`/`mission-coins` para claim.
- O Quiz continua isolado por outbox; nenhum consumidor consulta tabelas internas do jogo.
- Nenhum TODO, FIXME ou HACK executável obsoleto foi encontrado.
- Nenhuma API, migration, serviço, tabela ou funcionalidade foi criada.

## Débitos técnicos restantes

- O dispatcher da outbox continua dependente de acionamento administrativo; agendamento é uma decisão operacional futura já documentada.
- `GAME_FINISHED` ainda não fornece duração e dificuldade genéricas, portanto Statistics mantém essas projeções vazias em vez de estimá-las.
- Os eventos derivados `XP_GRANTED`, `ACHIEVEMENT_UNLOCKED`, `MISSION_PROGRESS` e correlatos estão catalogados, mas sua publicação encadeada permanece deliberadamente fora desta sprint.
- O estado arquitetural `READY_TO_CLAIM` continua persistido como `completed` por compatibilidade com a migration já existente.

## Riscos antes da Release Candidate

Não restou risco conhecido de duplicação ou perda silenciosa nos caminhos revisados. O risco residual é operacional: dead letters exigem observação e reprocessamento administrativo, e o dispatcher não é automático. Antes da Release Candidate, o ambiente alvo ainda precisa aplicar, por processo controlado, as migrations aditivas já existentes da branch; esta sprint não executou migration remota nem deploy.

## Validação executada

- TypeScript (`tsc --noEmit`): aprovado.
- Lint: aprovado sem erros.
- Build de produção: aprovado, incluindo typecheck e geração das 49 páginas estáticas.
- Testes focados de Event Engine, Achievement e Mission: 32 aprovados.
- Suíte completa (`test:all`): 113 aprovados.
- Playwright: 29 aprovados e 1 execução redundante intencionalmente ignorada; o contrato com backend real roda uma vez no Chromium e os cenários responsivos permanecem nos dois projetos.
- `git diff --check`: aprovado; somente avisos informativos de normalização LF/CRLF no Windows.
