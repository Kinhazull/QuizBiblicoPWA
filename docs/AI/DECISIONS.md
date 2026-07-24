# Decisões operacionais sobre IA

Este documento registra decisões sobre o processo de colaboração com IA.

Decisões de produto e arquitetura permanecem no documento oficial:

`docs/PRODUCT/DECISION_LOG.md`

## DAI-001 — GitHub como memória operacional

**Status:** aceita

A pasta `docs/AI` é a memória operacional oficial para continuidade entre chats, contas e assistentes.

Conversas podem complementar o contexto, mas não substituem documentação versionada.

## DAI-002 — Divisão oficial de responsabilidades

**Status:** aceita

- ChatGPT: planejamento, arquitetura, auditoria, documentação, revisão e coordenação.
- Codex: implementação, testes, build, debug e refatoração.
- Usuário: aprovação, validação final, ações humanas e autorizações.

## DAI-003 — Uso econômico do Codex

**Status:** aceita

O Codex deve ser usado principalmente para trabalho que depende do ambiente local e da execução real.

Planejamento, documentação, auditoria e preparação de prompts devem ocorrer antes.

## DAI-004 — Gemini CLI fora do fluxo atual

**Status:** aceita

O Gemini CLI foi descartado temporariamente devido ao limite baixo do plano gratuito para o tamanho do projeto.

## DAI-005 — Roo Code e Qwen fora do fluxo atual

**Status:** aceita

Roo Code e Qwen foram retirados do fluxo oficial porque a configuração não foi concluída e não existe disponibilidade de tempo para isso agora.

## DAI-006 — Comunicação direta durante desenvolvimento

**Status:** aceita

Durante sprints, o ChatGPT deve definir claramente:

1. sua própria ação;
2. a ação do Codex;
3. a ação do usuário.

O formato deve ser operacional, sem ambiguidade ou sobreposição de responsabilidades.
