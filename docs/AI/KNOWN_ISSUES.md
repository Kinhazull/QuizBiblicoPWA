# Problemas conhecidos

Este arquivo registra somente problemas correntes. Itens resolvidos permanecem no histórico operacional. A classificação completa de backlog está em `BACKLOG.md`.

## KI-008 — Aceite final público/mobile

**Status:** validação externa pendente
**Prioridade:** P1 / EXTERNAL_VALIDATION

Instalação, atualização entre deploys, background/foreground, bloqueio/encerramento, teclado virtual, recorte maskable e Web Vitals públicos precisam ser validados em Android físico e no domínio HTTPS final. Package ID/domínio dependem do dono; Data Safety, menores e licenças bíblicas exigem revisão humana/jurídica.

## KI-006 — Storage binário do Asset Registry

**Status:** preparado, não ativado
**Prioridade:** P2 / OPERATIONS

O Registry aceita URLs HTTPS controladas. Bucket R2, binding, upload e entrega autenticada não foram configurados remotamente. A migração visual integral da Memória depende dessa decisão ou de outra estratégia aprovada.

## KI-007 — Promoção da migration 0037

**Status:** pendente de processo operacional
**Prioridade:** P1 / OPERATIONS

A migration existe e foi validada localmente. Seu estado remoto não foi consultado na Sprint 25.0. A ativação em produção exige autorização, backup, `verify-promotable`, promoção controlada, `verify-final` e comparação de snapshot.

## KI-009 — Cobertura E2E cartesiana

**Status:** cobertura distribuída, centralização incompleta
**Prioridade:** P2 / TECH_DEBT

Há testes dos jogos e modos, mas a matriz parametrizada dos sete jogos × `FREE_PLAY`/`DAILY`/`EVENT` ainda não está totalmente centralizada. Isso aumenta o custo de provar regressão zero em mudanças compartilhadas.

## KI-010 — Ranking universal sem decisão

**Status:** requer decisão de produto e arquitetura
**Prioridade:** P2 / FEATURE

O ranking atual é histórico e específico do Quiz. Um ranking de plataforma não deve reutilizá-lo automaticamente; exige critérios comparáveis, privacidade, períodos, moderação e competição saudável.

## KI-005 — Sugestões com IA desativadas

**Status:** dormente
**Prioridade:** P3 / TECH_DEBT

A superfície permanece desativada e preservada para decisão posterior. Não é blocker da `v2.0.0`.
