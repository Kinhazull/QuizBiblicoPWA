# Operação gratuita e durável

## Antes de cada publicação

1. Fazer backup D1 pelo painel administrativo e guardar o arquivo localmente.
2. Aplicar somente as novas migrações, em ordem. Alvo atual: `0016_runtime_hardening`.
3. Confirmar os bindings de produção no Cloudflare Pages: `DB` (D1) e `AI` (Workers AI, opcional).
4. Remover `BOOTSTRAP_SECRET` depois que a comunidade já estiver configurada.
5. Executar `pnpm run test`, `pnpm run lint` e `pnpm audit --prod`.
6. Publicar e abrir **Painel > Diagnóstico**; o estado esperado é `healthy`.
7. Testar login, uma resposta, retomada, ranking e instalação PWA.

## Controles de custo

- Não gravar telemetria a cada segundo ou clique.
- Atualizar presença de sessão no máximo uma vez a cada 15 minutos e somente na abertura do app.
- Manter paginação e limites em consultas administrativas.
- IA é opcional, limitada diariamente e sempre exige revisão humana.
- Não adicionar KV, R2, Queues, Durable Objects ou serviços externos sem uma necessidade medida.
- Revisar mensalmente uso de D1, Workers AI, requisições e armazenamento no painel Cloudflare.

## Rotina mensal

- Exportar e testar a leitura de um backup.
- Conferir tentativas abandonadas no Diagnóstico.
- Executar auditoria de dependências.
- Revisar administradores, líderes e permissões concedidas.
- Verificar erros estruturados nos logs da Cloudflare.
- Revogar sessões desconhecidas e códigos de convite antigos.
