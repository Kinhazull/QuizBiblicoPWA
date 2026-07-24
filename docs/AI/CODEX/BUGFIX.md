# Prompt-base para correção de bug no Codex

## Objetivo

Investigue e corrija somente o bug descrito.

## Sintoma

[DESCREVER]

## Comportamento esperado

[DESCREVER]

## Contexto mínimo

Leia:

- `docs/AI/AGENTS.md`
- `docs/AI/CURRENT_STATE.md`
- arquivos diretamente relacionados ao sintoma

## Procedimento

1. Reproduzir ou confirmar a causa.
2. Registrar a causa raiz.
3. Implementar a menor correção segura.
4. Adicionar ou atualizar teste de regressão.
5. Executar validações proporcionais ao risco.

## Restrições

- Não refatorar áreas não relacionadas.
- Não alterar arquitetura sem autorização.
- Não fazer deploy, push, merge ou migration remota.
- Não mascarar erro apenas na interface.
- Não reduzir validações.

## Relatório final

- causa raiz;
- correção;
- testes;
- arquivos alterados;
- riscos;
- rollback.
