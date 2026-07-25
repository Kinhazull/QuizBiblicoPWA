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
- revisar commits e PRs;
- validar ou corrigir este handoff;
- preparar uma sprint pequena e objetiva.

### Codex

Nenhuma ação antes da confirmação do escopo.

### Usuário

- copiar o CF-POS para o repositório;
- criar branch documental;
- fazer commit;
- enviar ao GitHub;
- informar quando estiver disponível.
