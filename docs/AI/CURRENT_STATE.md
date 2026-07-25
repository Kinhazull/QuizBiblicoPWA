# Estado atual e handoff operacional

> Atualizar ao final de toda sprint, correção crítica, mudança de prioridade ou descoberta relevante.

Última atualização inicial: **2026-07-24**

## Estado geral

O Conte os Feitos possui o Quiz Bíblico como primeiro módulo funcional e está em evolução para uma plataforma modular.

A pasta `docs/AI` passa a funcionar como memória operacional oficial entre chats, contas e assistentes.

## Prioridade atual

Consolidar o CF-POS v1.0 e garantir que toda nova conversa siga o protocolo de leitura, planejamento e divisão de responsabilidades.

## Estado técnico pendente de confirmação

Antes da próxima implementação:

- revisar a `main`;
- revisar commits e PRs recentes;
- confirmar a sprint ativa;
- validar o pipeline;
- confirmar problemas conhecidos.

## Hipótese operacional registrada

Foi relatado que, ao concluir o Quiz em produção:

- Medalhas legadas aparecem;
- XP permanece em zero;
- moedas permanecem em zero;
- estatísticas permanecem em zero;
- missões não avançam.

A hipótese é que o evento chega à outbox, mas o Scheduled Worker não chama o dispatcher automaticamente.

Essa hipótese deve ser validada no código e no histórico recente antes de qualquer implementação.

## Próxima ordem

### ChatGPT

- auditar a `main`;
- revisar o pipeline do GitHub Actions;
- validar a hipótese do Worker e da Outbox;
- preparar a próxima sprint técnica.

### Codex

Nenhuma implementação até a conclusão da auditoria.

### Usuário

- manter o CF-POS atualizado;
- abrir uma nova branch somente após a conclusão da auditoria;
- aprovar a próxima sprint técnica.

## Marcos recentes

### 2026-07-24

✅ CF-POS v1.0 implantado com sucesso.

- documentação operacional criada;
- protocolo de conversa oficializado;
- papéis ChatGPT/Codex/Usuário definidos;
- templates criados;
- histórico operacional iniciado;
- documentação versionada na branch principal.

Último commit:

67145b0 — docs: add CF-POS v1.0
