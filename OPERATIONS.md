# Operação gratuita e durável

O procedimento completo de publicação está em [RELEASE.md](RELEASE.md). A arquitetura está em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) e o ciclo competitivo em [docs/JOURNEY_LIFECYCLE.md](docs/JOURNEY_LIFECYCLE.md).

## Antes de cada publicação

1. Fazer backup D1 pelo painel administrativo e guardar o arquivo localmente.
2. Confirmar que a GitHub Action **Quality and security** terminou com sucesso.
3. Confirmar os bindings de produção: `DB` no Pages e no Worker de premiações. O binding `AI` pode permanecer, mas o recurso está desativado por feature flag.
4. Confirmar que `BOOTSTRAP_SECRET` não está configurado depois da inicialização da comunidade.
5. Abrir **Painel → Diagnóstico**; o estado esperado é `healthy`, com fila de medalhas zerada.
6. Testar login, uma resposta, retomada, ranking, logout e instalação PWA.

## Deploy automatizado

- O deploy Git nativo do Cloudflare Pages está desativado. Não o reative.
- Um push na `main` só chega à produção pelo fluxo **Quality and security**: qualidade → E2E → Pages → Worker.
- O job do Pages publica o artefato testado e confirma que `/api/auth/me` responde pela Pages Function. Depois, o job do Worker publica `quiz-biblico-journey-awards` com seu Cron.
- A configuração versionada está em `workers/journey-awards/wrangler.jsonc`; os scripts estão no `package.json`.
- O pipeline usa concorrência exclusiva para impedir dois deploys simultâneos em produção.

### Único passo manual inevitável

No repositório GitHub, criar uma vez o secret de Actions `CLOUDFLARE_API_TOKEN`. O token deve ficar restrito à conta do projeto e possuir somente as permissões necessárias:

- **Workers Scripts: Edit**;
- **D1: Edit**.

O Account ID e o Database ID já estão no `wrangler.jsonc`; não são segredos. Nunca adicione o token ao repositório.

Depois de uma alteração na infraestrutura, confira em **Cloudflare → Workers & Pages → quiz-biblico-journey-awards → Settings → Triggers → Cron Triggers** a expressão `* * * * *`. O Cron é publicado pelo pipeline; não deve ser cadastrado manualmente.

## Encerramento automático e medalhas

- O Cron roda a cada minuto e busca apenas Jornadas vencidas ainda não processadas.
- O schema deve estar reconciliado até `0022_release_hardening.sql` antes do deploy; o pipeline normal nunca aplica migrations.
- Checkpoints por Jornada e participante tornam a retomada idempotente; reexecuções não duplicam medalhas nem auditoria.
- O Worker usa o mesmo D1 `quiz-biblico-db` do Pages, sem alterar a hospedagem do aplicativo.

O plano gratuito não oferece alerta de exceção por Worker no catálogo atual. Durante o piloto, confira diariamente o Diagnóstico e a área Observability conforme [docs/OPERATIONS_JOURNEY_AWARDS.md](docs/OPERATIONS_JOURNEY_AWARDS.md).

## Controles de custo

- Não gravar telemetria a cada segundo ou clique.
- Atualizar presença de sessão no máximo uma vez a cada 15 minutos e somente na abertura do app.
- Manter paginação e limites em consultas administrativas.
- IA está desativada por feature flag; uma futura reativação deverá manter limite diário e revisão humana.
- Não adicionar KV, R2, Queues, Durable Objects ou serviços externos sem uma necessidade medida.
- Revisar mensalmente uso de D1, Workers AI, requisições e armazenamento no painel Cloudflare.

## Rotina mensal

- Exportar e testar a leitura de um backup.
- Conferir tentativas abandonadas no Diagnóstico.
- Executar auditoria de dependências.
- Revisar administradores, líderes e permissões concedidas.
- Verificar erros estruturados nos logs da Cloudflare.
- Revogar sessões desconhecidas e códigos de convite antigos.
