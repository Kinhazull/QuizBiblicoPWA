# Padrão de prompts para o Codex

Todo prompt deve conter:

1. objetivo;
2. estado inicial;
3. arquivos permitidos;
4. arquivos protegidos;
5. invariantes;
6. restrições;
7. critérios de aceite;
8. validações;
9. rollback;
10. relatório final.

## Regras

- usar verbos de ação;
- evitar “melhore o projeto”;
- evitar “leia tudo”;
- limitar escopo;
- indicar o que não fazer;
- separar investigação de implementação;
- exigir evidência dos comandos executados;
- exigir declaração de testes não executados.

## Formato final esperado

- inspecionado;
- alterado;
- comandos;
- resultados;
- testes não executados;
- riscos;
- rollback;
- próximos passos.
