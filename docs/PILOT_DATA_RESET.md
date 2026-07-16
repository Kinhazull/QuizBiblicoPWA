# Limpeza dos dados competitivos antes do piloto

Esta operação remove dados de homologação da produção e preserva contas e o acervo. Ela é destrutiva, manual e não faz parte de push, deploy ou migration.

## Dados preservados

- organizações e grupos;
- contas, credenciais, sessões e códigos de recuperação;
- consentimentos legais, permissões e solicitações de privacidade;
- acervo de perguntas, alternativas, revisões e colaboradores;
- histórico de auditoria e histórico de migrations.

## Dados removidos

- Jornadas e suas cópias de perguntas;
- tentativas e respostas;
- temporadas, snapshots e premiações;
- Medalhas dos usuários e progresso de revisão derivado;
- comunicados, recibos de notificação e convites de teste;
- sugestões de IA, operações em lote e contadores temporários de abuso/login;
- checkpoints e marcadores do Worker de premiações.

O campo `question_bank.times_used` é zerado. Solicitações pendentes de sincronização de Medalhas recebem um marcador de conclusão antes da limpeza para não recriar dados pelo Cron. A auditoria registra a operação sem apagar o histórico anterior.

## Proteções

1. O workflow só existe em `workflow_dispatch` e somente na branch `main`.
2. Exige a confirmação `LIMPAR_DADOS_COMPETITIVOS_PRODUCAO`.
3. Exige as contagens exatas de contas e perguntas encontradas no Diagnóstico.
4. Executa dry-run e valida 23 migrations e todas as tabelas esperadas.
5. Exporta e criptografa um backup do D1 antes da escrita.
6. Envia todas as alterações em um único batch transacional do D1.
7. Verifica novamente contagens preservadas, tabelas limpas, fila de Medalhas e contadores do acervo.
8. Não publica Pages ou Worker e não aplica migrations.

## Como executar

1. Faça push deste workflow e aguarde **Quality and security** ficar verde.
2. Abra o aplicativo em **Painel → Diagnóstico** e anote os totais exatos de **Usuários** e **Banco de perguntas**.
3. No GitHub, abra **Actions → Reset production pilot data → Run workflow**.
4. Selecione `main` e preencha:
   - confirmação: `LIMPAR_DADOS_COMPETITIVOS_PRODUCAO`;
   - total exato de contas;
   - total exato de perguntas.
5. Execute uma única vez e aguarde o resumo verde.
6. Baixe o artifact criptografado `d1-before-pilot-reset-*` e guarde-o durante a homologação do reset.
7. No aplicativo, clique **Verificar novamente** no Diagnóstico.

## Resultado esperado

- contas e perguntas com as mesmas contagens anteriores;
- Jornadas, tentativas, temporadas, Medalhas e fila de processamento iguais a zero;
- Diagnóstico estrutural saudável;
- login das contas preservadas continua funcionando.

Se qualquer contagem não coincidir, o workflow falha antes da escrita. Não altere o script ou as contagens para forçar a operação; investigue primeiro.

