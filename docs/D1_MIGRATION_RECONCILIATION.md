# Reconciliação segura das migrations do D1

Este procedimento registra o histórico legado já verificado e aplica somente a migration atualmente pendente. Ele não publica o Pages, não publica o Worker e não recria tabelas antigas.

## Estado esperado nesta versão

- Migrations já registradas: `0000` até `0021`.
- Única migration pendente: `0022_release_hardening.sql`.
- Total final esperado no histórico: **23 migrations**.
- Novo índice esperado: `audit_action_entity_time_idx`.

## Pré-requisitos no GitHub

1. O secret `CLOUDFLARE_API_TOKEN` deve existir em **Settings → Secrets and variables → Actions**.
2. O token precisa ter acesso à conta configurada e permissão de escrita no D1.
3. Execute o workflow pela branch `main`.
4. Recomenda-se exigir aprovação no environment `production`.

## Como executar

1. Abra **Actions** no repositório.
2. Escolha **Reconcile production D1 migrations**.
3. Clique em **Run workflow** e selecione `main`.
4. Digite exatamente:

   ```text
   RECONCILIAR_MIGRATIONS_PRODUCAO
   ```

5. Aguarde o resumo verde confirmar 23 migrations e o índice novo.

O workflow sempre valida o schema antes de escrever, produz backup confidencial criptografado e interrompe diante de divergências. Não repita depois do sucesso: a execução seguinte deve falhar com segurança porque não haverá migration pendente.

## Ordem segura do primeiro release hardening

1. Publicar os arquivos de infraestrutura no GitHub.
2. Executar este workflow para aplicar a `0022`.
3. Confirmar o resumo de sucesso.
4. Reexecutar os jobs de implantação que tenham sido bloqueados pelo pré-requisito de migration.

O deploy automatizado do Pages e do Worker valida o histórico final antes de publicar.
