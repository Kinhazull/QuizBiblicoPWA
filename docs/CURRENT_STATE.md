# Estado atual e handoff operacional

> Atualizar ao final de toda sprint, correção crítica ou mudança de prioridade.
>
> Última atualização documental: 2026-07-24.

## Estado geral

A fundação da plataforma foi implementada e integrada. A página de Perfil também foi implementada, consumindo progresso, estatísticas, Conquistas e missão atual.

## Últimos marcos confirmados

- Quiz Core Adapter
- Transactional Outbox
- Dispatcher
- Statistics Service
- `GAME_FINISHED` v2
- Reward Consumer
- Catálogo e Consumer de Conquistas
- Alinhamento de estatísticas
- Sistema de missões
- Perfil da plataforma

Migrations `0023` a `0030` foram aplicadas remotamente no ciclo anterior e o pipeline estava verde no último handoff humano.

## Bloqueio prioritário

Em produção, ao concluir o Quiz:

- Medalhas legadas aparecem;
- XP permanece em zero;
- moedas permanecem em zero;
- estatísticas permanecem em zero;
- missões não avançam.

### Causa diagnosticada

O Quiz já emite `GAME_FINISHED` v2 e grava o evento em `quiz_core_event_outbox`.

O dispatcher e os consumidores existem, porém o Scheduled Worker executa apenas o processamento de premiações de Jornadas. Ele não chama automaticamente o dispatcher da outbox.

A outbox é processada apenas pelo endpoint administrativo manual.

## Próxima sprint recomendada

### Sprint 4.2A — Automatic Dispatcher

Objetivo:

- chamar o dispatcher da outbox no Scheduled Worker;
- preservar o processamento de premiações;
- isolar falhas entre as duas tarefas;
- preservar retry, lease, dead letter e idempotência;
- preservar o endpoint administrativo;
- adicionar ou atualizar testes;
- não fazer deploy;
- não criar migrations.

Branch prevista: `feature/automatic-quiz-outbox-dispatcher`

Commit previsto: `feat: automate quiz outbox dispatcher`

## Hardening posterior

- corrigir contraste do título “Sua jornada na plataforma”;
- impedir que falha em uma das quatro APIs derrube toda a seção do Perfil;
- adicionar teste real de renderização no navegador;
- revisar o estado visual responsivo.

## Regra de validação

Antes de implementar, confirmar no código da `main` que:

1. o scheduler ainda não chama o dispatcher;
2. o endpoint administrativo ainda é o único gatilho;
3. nenhuma branch ou PR mais recente já solucionou o bloqueio;
4. nomes de funções e arquivos continuam iguais.

Se o código divergir deste documento, o código e commits mais recentes prevalecem e este arquivo deve ser atualizado.
