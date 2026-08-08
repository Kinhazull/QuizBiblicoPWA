# ImportaÃ§Ã£o universal de conteÃºdo

`POST /api/admin/content/import` aceita `JSON` e CSV UTF-8 simples. O JSON Ã© uma lista de itens com `externalId`, `gameType`, `status`, `metadata` e `payload`. O CSV usa colunas equivalentes; `tags` sÃ£o separadas por `|` e `payload` contÃ©m JSON.

O endpoint exige autenticaÃ§Ã£o e `content.manage`, usa a organizaÃ§Ã£o da sessÃ£o e nunca aceita organizaÃ§Ã£o escolhida pelo cliente.

Dry-run Ã© o padrÃ£o e nÃ£o escreve. A aplicaÃ§Ã£o exige a confirmaÃ§Ã£o textual `IMPORTAR_CONTEUDO_UNIVERSAL`. Todo item passa pelo Schema Registry e validaÃ§Ã£o editorial; o processamento reutiliza lotes D1 e IDs estÃ¡veis derivados do `externalId`.

O relatÃ³rio informa encontrados, vÃ¡lidos, invÃ¡lidos, duplicados, publicÃ¡veis, drafts, descartados e erros seguros por item. ReexecuÃ§Ãµes compatÃ­veis sÃ£o idempotentes; conflitos de mesmo ID com payload diferente nÃ£o sobrescrevem dados.

Importadores do Quiz legado e da base oficial permanecem ativos durante sua janela de compatibilidade.
