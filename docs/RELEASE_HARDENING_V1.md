# Release Hardening v1.0

## Gate automatizado

`push main -> lint/build/testes/audit -> E2E -> Pages -> Worker`.

Antes do primeiro uso, execute uma vez em **Actions** o workflow **Configure gated Pages deployment**, na branch `main`, digitando `DESATIVAR_DEPLOY_AUTOMATICO_PAGES`. Ele apenas desativa o deploy Git direto do Pages e confirma o estado; não publica código.

Depois disso, nunca use “Retry deployment” diretamente no Pages para contornar uma CI vermelha.

## Banco

A migration `0022_release_hardening.sql` cria somente o índice da fila de medalhas. Execute o workflow manual **Reconcile production D1 migrations**. Ele faz dry-run, backup criptografado, aplica apenas a migration pendente e valida preservação.

## Freeze

O candidato só pode ser promovido ao piloto quando:

- CI e E2E estiverem verdes;
- diagnóstico administrativo estiver saudável;
- fila do Cron estiver zerada;
- checklist legal estiver assinado;
- Lighthouse/Core Web Vitals tiverem sido medidos em aparelho real;
- restauração do backup tiver sido exercitada em banco isolado.

## Limitações conscientemente aceitas

- A CSP ainda precisa permitir estilos inline exigidos pelo artefato estático atual do Next.js. Remover `unsafe-inline` sem nonces ou hashes quebraria a hidratação; a redução fica condicionada a uma mudança arquitetural testada, não ao piloto.
- A suíte automatizada cobre axe em desktop e mobile emulado. Lighthouse e Core Web Vitals de campo devem ser medidos no aparelho e na rede reais usados pelo piloto.
- Alertas do Worker exigem a escolha humana de um destinatário no painel Cloudflare; o runbook descreve a configuração única.
