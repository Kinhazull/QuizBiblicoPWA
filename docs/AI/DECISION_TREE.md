# Árvore de decisão

## Entrada

### É um bug?

- **Sim**
  - impacto crítico em produção? → `HOTFIX`
  - caso contrário → `BUGFIX`

### É uma nova funcionalidade?

- **Sim**
  - muda arquitetura? → `RFC` + decisão formal
  - exige migration? → separar migration da feature quando possível
  - caso simples → `FEATURE`

### É uma refatoração?

- comportamento deve permanecer idêntico;
- baseline e testes são obrigatórios.

### É documentação?

- ChatGPT ou Codex pode preparar, revisar e validar;
- commit e publicação seguem a autorização da tarefa;
- documentação corrente deve distinguir estado atual de histórico.

### É deploy?

- verificar CI;
- verificar aprovação;
- exigir autorização explícita.

### É migration?

- revisar compatibilidade;
- backup/rollback;
- autorização explícita;
- nunca executar automaticamente.
