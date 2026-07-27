# Qualidade

Toda alteração deve:
- usar TypeScript de forma consistente;
- preservar acessibilidade;
- preservar responsividade;
- tratar loading, vazio e erro;
- incluir ou atualizar testes;
- evitar duplicação;
- manter funções pequenas;
- preservar contratos de API;
- manter operações idempotentes quando necessário.

Ao finalizar, executar:
1. pnpm run lint
2. pnpm run test:quick
3. pnpm run test:integration
4. pnpm run build
5. git diff --check