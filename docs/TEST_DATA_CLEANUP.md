# Limpeza segura de dados de teste

A rotina opera **somente sobre um arquivo SQLite local informado explicitamente**. Ela não se conecta ao D1 remoto e não é executada por migration, build ou deploy.

Primeiro gere e confira o relatório:

`node scripts/cleanup-test-data.mjs --dry-run --db caminho/local.sqlite --organization ORG_ID --preserve-admin ADMIN_ID`

Para executar em uma cópia local, forneça também um backup existente:

`node scripts/cleanup-test-data.mjs --execute --db caminho/local.sqlite --organization ORG_ID --preserve-admin ADMIN_ID --backup caminho/backup.sqlite`

O administrador principal, a organização e as perguntas não arquivadas são preservados. Rodadas, tentativas, respostas, temporadas, premiações, notificações, convites, usuários de teste, sugestões de IA e perguntas arquivadas são removidos na transação. Nunca execute diretamente contra produção sem revisar o dry-run e possuir backup.
