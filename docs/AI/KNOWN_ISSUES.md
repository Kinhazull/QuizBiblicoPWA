# Problemas conhecidos

## KI-001 — Pipeline falha no audit

**Status:** aberto  
**Prioridade:** alta  
**Data:** 2026-07-24

### Sintoma

O GitHub Actions falha em `pnpm audit --audit-level=high`.

### Impacto

Commits exclusivamente documentais também ficam com pipeline vermelho.

### Evidência inicial

Foram observadas vulnerabilidades moderadas e altas, incluindo dependências transitivas.

### Próxima ação

Criar sprint de hardening de dependências.

### Regras

- não atualizar dependências às cegas;
- identificar dependência raiz;
- atualizar lockfile;
- executar lint, build e testes;
- registrar mudanças incompatíveis;
- não misturar com feature.
