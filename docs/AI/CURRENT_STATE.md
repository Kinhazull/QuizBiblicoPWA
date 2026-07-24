# Estado atual e handoff operacional

> Atualizar este documento ao final de toda sprint, correção crítica, mudança de prioridade ou descoberta relevante.
>
> Última atualização inicial: 2026-07-24.

## Estado geral

O Conte os Feitos possui o Quiz Bíblico como primeiro módulo funcional e está em processo de evolução para uma plataforma modular.

A documentação existente já cobre arquitetura, operação, testes, roadmap, linguagem do produto e colaboração com IA.

A pasta `docs/AI` foi criada para funcionar como memória operacional entre chats, contas e assistentes.

## Prioridade atual

Consolidar o novo fluxo de trabalho:

1. ChatGPT faz análise, planejamento, auditoria e documentação.
2. Codex é usado principalmente para implementação, testes, build e debug.
3. O usuário executa e autoriza ações humanas, incluindo merge, deploy, migrations e validações finais.
4. Toda conversa de desenvolvimento deve indicar claramente quem executa cada ação.

## Estado técnico a confirmar

Antes de iniciar qualquer nova implementação:

- verificar a `main`;
- verificar commits e PRs recentes;
- validar se o roadmap atual continua correto;
- confirmar se existe alguma sprint já aberta;
- confirmar se o bloqueio descrito no chat ainda existe no código.

## Bloqueio técnico citado no último contexto

Foi relatado que, em produção, ao concluir o Quiz:

- Medalhas legadas aparecem;
- XP permanece em zero;
- moedas permanecem em zero;
- estatísticas permanecem em zero;
- missões não avançam.

A hipótese registrada foi que o evento é gravado na outbox, mas o Scheduled Worker não chama automaticamente o dispatcher.

### Regra de validação

Essa informação deve ser tratada como **hipótese operacional pendente de confirmação no código e no histórico recente**.

Nenhuma implementação deve começar sem validar:

1. se o dispatcher ainda não é chamado pelo scheduler;
2. se o endpoint administrativo ainda é o único gatilho;
3. se nenhuma branch ou PR recente já corrigiu o problema;
4. se os nomes de funções e arquivos continuam iguais.

## Próxima ação recomendada

### ChatGPT

- auditar a `main`;
- revisar commits e PRs recentes;
- confirmar ou corrigir este handoff;
- preparar uma sprint pequena e objetiva.

### Codex

Nenhuma ação até que o escopo seja confirmado.

### Usuário

- adicionar os arquivos de `docs/AI`;
- criar branch documental;
- fazer commit;
- enviar para o GitHub;
- informar quando a documentação estiver disponível no repositório.

## Pendências documentais

- adicionar `docs/AI` ao índice do `README.md`;
- referenciar `docs/AI/AGENTS.md` em `docs/PRODUCT/AI_COLLABORATION.md`;
- confirmar se `DECISIONS.md` deve complementar ou apenas apontar para o Decision Log oficial;
- iniciar o histórico mensal.
