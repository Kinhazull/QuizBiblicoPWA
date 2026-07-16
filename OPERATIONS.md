# Operação gratuita e durável

## Antes de cada publicação

1. Fazer backup D1 pelo painel administrativo e guardar o arquivo localmente.
2. Confirmar que a GitHub Action **Quality and security** terminou com sucesso.
3. Confirmar os bindings de produção no Cloudflare Pages: `DB` (D1) e `AI` (Workers AI, opcional).
4. Remover `BOOTSTRAP_SECRET` depois que a comunidade já estiver configurada.
5. Abrir **Painel → Diagnóstico**; o estado esperado é `healthy`.
6. Testar login, uma resposta, retomada, ranking e instalação PWA.

## Deploy automatizado

- O Cloudflare Pages continua publicando o aplicativo pelo fluxo já existente.
- Após a qualidade passar em um push na `main`, o job **Deploy journey awards Worker** prepara idempotentemente a tabela no mesmo D1 e publica o Worker `quiz-biblico-journey-awards` com seu Cron.
- A configuração versionada está em `workers/journey-awards/wrangler.jsonc`; os scripts estão no `package.json`.
- O pipeline usa concorrência exclusiva para impedir dois deploys simultâneos em produção.

### Único passo manual inevitável

No repositório GitHub, criar uma vez o secret de Actions `CLOUDFLARE_API_TOKEN`. O token deve ficar restrito à conta do projeto e possuir somente as permissões necessárias:

- **Workers Scripts: Edit**;
- **D1: Edit**.

O Account ID e o Database ID já estão no `wrangler.jsonc`; não são segredos. Nunca adicionar o token ao repositório.

Depois do primeiro pipeline verde, conferir em **Cloudflare → Workers & Pages → quiz-biblico-journey-awards → Settings → Triggers → Cron Triggers** a expressão `*/5 * * * *`. O Cron é publicado pelo pipeline; não deve ser cadastrado manualmente.

## Encerramento automático e medalhas

- O Cron roda a cada cinco minutos e busca apenas Jornadas vencidas ainda não processadas.
- `drizzle/0019_round_award_processing.sql` usa `IF NOT EXISTS`, portanto sua preparação automática pode ser repetida com segurança.
- Cada Jornada encerrada recebe um marcador em `round_award_processing`; reexecuções não duplicam medalhas nem auditoria.
- O Worker usa o mesmo D1 `quiz-biblico-db` do Pages, sem alterar a hospedagem do aplicativo.

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
