# Problemas conhecidos

Este arquivo registra apenas problemas correntes. Itens resolvidos permanecem no histórico operacional.

## KI-001 — Pipeline falhava no audit

**Status:** resolvido
**Origem:** 24/07/2026

As dependências corrigíveis foram atualizadas e a exceção transitiva sem correção compatível foi limitada ao GHSA específico no gate do pnpm. Qualquer outro advisory alto ou crítico continua bloqueando a qualidade.

## KI-002 — Ferramentas operacionais anteriores à Fase 4

**Status:** aberto
**Prioridade:** alta
**Sprint prevista:** 24.1

Backup, restauração, diagnóstico e limpeza do piloto precisam ser reconciliados com as estruturas até a migration 0036.

## KI-003 — Ciclo de vida e privacidade dos novos dados

**Status:** aberto
**Prioridade:** alta
**Sprint prevista:** 24.2

Exportação, anonimização e retenção precisam abranger seleções, participações, Eventos, economia e dados operacionais do Core.

## KI-004 — Legado ainda ativo

**Status:** controlado
**Prioridade:** média
**Sprint prevista:** 24.3

Jornadas, Ranking, Medalhas, fallback do Quiz e Worker histórico permanecem deliberadamente disponíveis até que seus gates de saída sejam comprovados.

## KI-005 — Sugestões com IA desativadas

**Status:** dormente
**Prioridade:** baixa
**Decisão prevista:** 24.3 ou posterior

A flag está desativada; a página redireciona; o endpoint retorna `feature_disabled`; tabela e documentação foram preservadas.
