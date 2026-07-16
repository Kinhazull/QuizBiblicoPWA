# Reconciliação segura das migrations do D1

Este procedimento corrige exclusivamente o histórico remoto de migrations do banco
`quiz-biblico-db`. Ele não publica o Pages, não publica o Worker e não recria tabelas
legadas.

## Pré-requisitos no GitHub

1. O repositório deve possuir o secret `CLOUDFLARE_API_TOKEN` em
   **Settings → Secrets and variables → Actions**.
2. O token precisa ter acesso à conta Cloudflare configurada no projeto e permissão
   de escrita no D1.
3. O workflow deve ser executado pela branch `main`.
4. Recomenda-se configurar proteção e aprovação manual no environment
   **production**, em **Settings → Environments → production**. O workflow funciona
   sem essa regra adicional, mas a aprovação protege melhor operações futuras.

## Como executar pelo navegador

1. Abra o repositório `Kinhazull/QuizBiblicoPWA` no GitHub.
2. Acesse **Actions**.
3. Selecione **Reconcile production D1 migrations**.
4. Clique em **Run workflow**.
5. Confirme que a branch selecionada é `main`.
6. No campo solicitado, digite exatamente:

   ```text
   RECONCILIAR_MIGRATIONS_PRODUCAO
   ```

7. Clique em **Run workflow** novamente.
8. Acompanhe o job **Validate, back up and reconcile D1** até o final.

Não execute novamente se a primeira execução terminar com sucesso. Uma repetição
falhará de forma segura porque o banco já terá as 22 migrations registradas.

## Ordem das proteções

Antes da primeira escrita, o workflow:

1. exige a confirmação textual exata;
2. confirma o secret da Cloudflare;
3. instala somente as dependências travadas no lockfile;
4. valida todas as tabelas, índices e colunas esperados do schema legado;
5. valida que o histórico está vazio ou já contém exatamente `0000`–`0020`;
6. valida que existem exatamente os arquivos locais `0000`–`0021`;
7. rejeita comandos destrutivos ou de alteração de dados na migration `0021`;
8. cria uma fotografia das estruturas e contagens existentes;
9. exporta o D1 remoto completo;
10. criptografa o backup com AES-256/PBKDF2 usando o secret já existente como
    material protegido e elimina o SQL em texto aberto;
11. armazena somente o backup criptografado e a fotografia como artifact.

Somente depois dessas etapas ele:

1. registra `0000`–`0020` no ledger, sem executar novamente seus SQLs;
2. confirma que somente `0021_award_job_checkpoints.sql` permanece pendente;
3. aplica a migration `0021` pelo Wrangler;
4. exige exatamente 22 registros no histórico;
5. exige a nova tabela e seu índice;
6. confirma que todas as estruturas anteriores continuam idênticas;
7. confirma que nenhuma tabela anterior perdeu linhas.

Qualquer divergência encerra o workflow com erro. Não há comando de deploy nesse
workflow.

## Backup

O artifact `d1-production-backup-<run-id>` contém:

- `d1-production-backup.sql.enc`: exportação completa do D1 criptografada;
- `d1-before.json`: estruturas e contagens anteriores à reconciliação.

Artifacts herdam as permissões de acesso do repositório e expiram após 7 dias. Como
proteção adicional, nenhum SQL em texto aberto é enviado ao GitHub. O arquivo usa
AES-256-CBC, PBKDF2 e 200.000 iterações. Ele somente pode ser descriptografado com o
mesmo valor de `CLOUDFLARE_API_TOKEN` usado na execução. Se o token for rotacionado,
preserve o valor anterior em local seguro até o artifact expirar ou deixe o backup
expirar sem baixá-lo. O backup continua sendo confidencial e não deve ser commitado.

## Resultado esperado

O resumo final da execução deve confirmar:

- histórico `0000`–`0020` reconciliado;
- `0021` aplicada;
- total de 22 migrations;
- tabela `round_award_participant_processing` existente;
- estruturas e contagens anteriores preservadas;
- nenhum deploy realizado.

## Em caso de falha

Não tente corrigir o ledger manualmente. Preserve o artifact da execução e revise a
primeira etapa que falhou. Se a falha ocorrer depois da criação do backup, o artifact
continua disponível. Se ocorrer antes, nenhuma escrita terá sido iniciada.
