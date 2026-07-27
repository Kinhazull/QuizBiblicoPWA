# Segurança e limites

Não executar sem autorização explícita:
- deploy;
- push;
- merge;
- migrations remotas;
- comandos destrutivos;
- limpeza de banco;
- alteração de secrets;
- alteração de configurações de produção.

Nunca acessar produção.

Mudanças em autenticação, autorização, economia, recompensas,
migrations ou Workers devem ser interrompidas para revisão humana
antes da implementação.

Não remover testes para fazer a implementação passar.
Não reduzir validações existentes.
Não substituir dados reais por mocks na aplicação.