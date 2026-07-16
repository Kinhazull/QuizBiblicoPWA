# Reconciliação segura das migrations do D1

Este procedimento registra o histórico legado já verificado e aplica somente a migration atualmente pendente. Ele não publica o Pages, não publica o Worker e não recria tabelas antigas.

## Estado reconciliado em produção

- Migrations registradas: `0000` até `0022`.
- Migrations pendentes: **nenhuma**.
- Total final esperado no histórico: **23 migrations**.
- Novo índice esperado: `audit_action_entity_time_idx`.

Esse estado foi confirmado pelo workflow manual e pelo Diagnóstico em 16/07/2026. A documentação abaixo é histórica e serve para auditoria; não execute novamente a reconciliação sem uma migration futura e uma revisão específica do script.

## Pré-requisitos no GitHub

1. O secret `CLOUDFLARE_API_TOKEN` deve existir em **Settings → Secrets and variables → Actions**.
2. O token precisa ter acesso à conta configurada e permissão de escrita no D1.
3. Execute o workflow pela branch `main`.
4. Recomenda-se exigir aprovação no environment `production`.

## Como foi executado

1. Abra **Actions** no repositório.
2. Escolha **Reconcile production D1 migrations**.
3. Clique em **Run workflow** e selecione `main`.
4. Digite exatamente:

   ```text
   RECONCILIAR_MIGRATIONS_PRODUCAO
   ```

5. Aguarde o resumo verde confirmar 23 migrations e o índice novo.

O workflow validou o schema antes de escrever, produziu backup confidencial criptografado e interromperia diante de divergências. Não repita depois do sucesso: a execução seguinte deve falhar com segurança porque não há migration pendente.

## Registro da ordem usada no release hardening

1. Os arquivos de infraestrutura foram publicados no GitHub.
2. O workflow aplicou exclusivamente a `0022` após dry-run e backup.
3. O resumo confirmou 23 migrations e preservação das estruturas anteriores.
4. Os jobs de implantação foram reexecutados e concluídos com sucesso.

O deploy automatizado do Pages e do Worker valida o histórico final antes de publicar.
