# Conte os Feitos v1.0.0 — piloto controlado

Primeira versão formal do **Conte os Feitos**, aprovada para piloto controlado com 5–10 usuários.

## Principais recursos

- Jornadas bíblicas oficiais e de treino;
- tentativas com tempo e pontuação validados no servidor;
- Ranking semanal, geral, por temporada e categorias;
- Medalhas e processamento automático após o encerramento;
- retomada segura de partidas;
- acervo, importação e revisão colaborativa de perguntas;
- painel administrativo, diagnóstico, relatórios e auditoria;
- PWA instalável com recuperação amigável de conexão;
- autenticação, convites, recuperação de conta e controles de privacidade.

## Integridade e operação

- pipeline de qualidade, navegador, Pages e Worker condicionado a testes;
- Cloudflare Pages, D1 e Worker de premiações com Cron;
- migrations reconciliadas e schema de produção saudável;
- dados competitivos de homologação removidos antes do piloto;
- contas e acervo de perguntas preservados;
- backup pré-limpeza disponível no artifact privado da execução correspondente;
- checklist legal aprovado somente para piloto controlado.

## Escopo

Esta versão **não representa abertura pública irrestrita**. A expansão além do piloto exige nova revisão legal, operacional e de capacidade.

## Documentação operacional

- [Processo oficial de release](../RELEASE.md)
- [Operação do Cron de premiações](OPERATIONS_JOURNEY_AWARDS.md)
- [Checklist legal](LEGAL_RELEASE_CHECKLIST.md)
- [Limpeza pré-piloto](PILOT_DATA_RESET.md)
- [Estratégia de testes](TESTING.md)
