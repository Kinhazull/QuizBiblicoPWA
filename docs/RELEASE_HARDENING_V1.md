# Release Hardening v1.0

## Gate automatizado

`push main -> lint/build/testes/audit -> E2E -> Pages -> Worker`.

Antes do primeiro uso, execute uma vez em **Actions** o workflow **Configure gated Pages deployment**, na branch `main`, digitando `DESATIVAR_DEPLOY_AUTOMATICO_PAGES`. Ele apenas desativa o deploy Git direto do Pages e confirma o estado; não publica código.

Depois disso, nunca use “Retry deployment” diretamente no Pages para contornar uma CI vermelha.

## Banco — concluído

A migration `0022_release_hardening.sql` foi aplicada pelo workflow manual **Reconcile production D1 migrations**. O estado validado em 16/07/2026 contém 23 migrations e 29/29 estruturas essenciais. Não repita o workflow de reconciliação: sem migration pendente, ele deve falhar de forma segura.

## Freeze

O candidato só pode ser promovido ao piloto quando:

- CI e E2E estiverem verdes;
- diagnóstico administrativo estiver saudável;
- fila do Cron estiver zerada;
- checklist legal estiver aprovado para o escopo pretendido;
- Lighthouse/Core Web Vitals tiverem sido medidos em aparelho real;
- restauração do backup tiver sido exercitada em banco isolado.

Em 16/07/2026, CI/E2E, diagnóstico, fila do Cron, checklist legal do piloto e medições em aparelho real foram confirmados. A aprovação registrada cobre somente o piloto controlado de 5–10 usuários. O exercício operacional de restauração em D1 isolado continua sendo uma verificação independente da restauração automatizada em SQLite.

## Limitações conscientemente aceitas

- A CSP ainda precisa permitir estilos inline exigidos pelo artefato estático atual do Next.js. Remover `unsafe-inline` sem nonces ou hashes quebraria a hidratação; a redução fica condicionada a uma mudança arquitetural testada, não ao piloto.
- A suíte automatizada cobre axe em desktop e mobile emulado. As medições em aparelho real foram aprovadas para o piloto; devem ser repetidas antes de abertura pública ou após mudanças relevantes.
- O catálogo atual do plano gratuito não oferece alerta de exceção por Worker. Durante o piloto, o monitoramento é feito pelo Diagnóstico e pela Observability, conforme o runbook.
- Melhorias não bloqueantes estão registradas em `BACKLOG.md` e não ampliam o escopo aprovado.
