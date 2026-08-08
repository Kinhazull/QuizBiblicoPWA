# Contrato público de erros da API

As APIs modernas usam `functions/_lib/operational-observability.ts` como fonte compartilhada. Erros conhecidos podem manter um código de domínio permitido; erros inesperados nunca reutilizam a mensagem crua da exceção.

## Formato

```json
{
  "error": "codigo_publico_estavel",
  "category": "INTERNAL_ERROR",
  "message": "Mensagem segura.",
  "supportId": "SUP-..."
}
```

`supportId` é criado para falhas internas e de dependência. Ele é aleatório, não contém usuário, organização ou timestamp reversível e corresponde ao identificador do log interno.

Categorias oficiais: `DOMAIN_ERROR`, `VALIDATION_ERROR`, `AUTHENTICATION_ERROR`, `AUTHORIZATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `DEPENDENCY_FAILURE` e `INTERNAL_ERROR`.

Nunca podem aparecer na resposta SQL, stack trace, bindings, secrets, caminhos internos, mensagens cruas do D1/SQLite ou payload protegido. Novos endpoints modernos devem usar `publicError` ou `publicDomainError`; códigos de domínio precisam de allowlist explícita.

