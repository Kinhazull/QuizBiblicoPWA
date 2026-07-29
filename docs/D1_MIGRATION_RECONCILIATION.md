# Promoção segura das migrations do D1

O workflow manual **Reconcile production D1 migrations** promove migrations
oficiais pendentes sem publicar o Pages ou o Worker.

## Proteções

Antes de escrever, o workflow:

1. exige a confirmação `RECONCILIAR_MIGRATIONS_PRODUCAO`;
2. aceita execução somente pela `main` e pelo environment `production`;
3. valida que o histórico remoto é um prefixo exato e ordenado do catálogo local;
4. valida o schema correspondente às migrations que já estão aplicadas;
5. cria snapshot de integridade e backup remoto criptografado;
6. repete o preflight imediatamente antes da escrita.

Após aplicar somente o sufixo pendente, o workflow:

1. executa `db:reconcile-migrations:verify-final`;
2. confirma que o histórico e o schema correspondem ao estado final local;
3. verifica que tabelas e objetos preexistentes não mudaram;
4. verifica que nenhuma tabela perdeu linhas.

Qualquer divergência interrompe a execução. O workflow não reconcilia
automaticamente históricos vazios ou divergentes.

## Pré-requisitos no GitHub

1. O secret `CLOUDFLARE_API_TOKEN` deve existir em
   **Settings → Secrets and variables → Actions**.
2. O token precisa ter acesso à conta configurada e permissão de escrita no D1.
3. A migration deve estar revisada, versionada e presente na `main`.
4. O environment `production` deve manter a aprovação operacional adotada pelo projeto.

## Como promover uma nova migration

1. Confirme que a migration aditiva foi integrada à `main`.
2. Abra **Actions**.
3. Escolha **Reconcile production D1 migrations**.
4. Clique em **Run workflow** e selecione `main`.
5. Digite exatamente:

   ```text
   RECONCILIAR_MIGRATIONS_PRODUCAO
   ```

6. Aguarde o resumo confirmar o preflight, backup, aplicação, `verify-final`
   e preservação dos dados.
7. Somente depois do sucesso, execute ou reexecute o workflow de deploy.

Se não houver migration pendente, o workflow falha antes do backup e de
qualquer escrita. Não é necessário nem recomendado executá-lo em todo push.

## Separação entre migration e deploy

- O workflow manual promove migrations.
- O workflow **Quality and security** não aplica migrations.
- Os deploys de Pages e Worker continuam executando `verify-final` e só
  prosseguem quando o banco remoto já está no estado esperado.
