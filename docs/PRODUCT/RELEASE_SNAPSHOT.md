# Snapshot de release e Go/No-Go

**Status:** CURRENT  
**Data:** 12/08/2026

## Identificação

- versão: `2.0.0-rc.1`;
- branch integrada: `main`;
- HEAD integrado antes das alterações locais da Sprint 26.4.1: `2b8fd2fd35e86296a938ce1364b72b007803de79`;
- alterações desta sprint: locais e não commitadas;
- migration local mais recente: `0039_administrative_mfa.sql`;
- ledger/schema remoto: **DESCONHECIDO — requer verificação operacional** pelo reconciliador oficial.

## Entregas concluídas

- Fases 1–5 e Sprints 25.1–25.7;
- Central Administrativa, Biblioteca Inteligente, Editor Visual de Eventos e Planejamento/Calendário;
- sete jogos, CMS/Biblioteca/Gerador/Loader e modos FREE_PLAY/DAILY/EVENT;
- Progress, Reward, Statistics, Achievements, Missions, Economia 2.0, Coleções, Perfil 2.0 e Ranking Universal.
- navegação participante e administrativa sem atalhos para Jornada, Medalhas, Analytics do Quiz ou CMS antigo; rotas históricas compatíveis redirecionam para equivalentes modernos.
- política de sustentabilidade e orçamento operacional versionado concluídos; capacidade em usuários aguarda quotas externas e medição real.
- suíte PWA Release separada valida artifact avançado, SW real, manifest, cache seguro, fallback offline e atualização em Chromium desktop/mobile emulado.

## Bloqueadores humanos

- licenças de textos/assets e revisão jurídica;
- revisão humana das citações bíblicas; textos ACF/Almeida integrais e derivados foram removidos da árvore ativa, e eventual purge histórico permanece decisão jurídica;
- arte final autoral/licenciada para os 16 colecionáveis atualmente representados por emoji;
- privacidade de menores, termos e Data Safety;
- decisões de domínio/package ID e publicação Google Play;
- responsável e canal de alertas operacionais.
- quotas vigentes dos planos Cloudflare/GitHub e aprovação da retenção por domínio.

## Bloqueadores técnicos/externos

- Android físico e Web Vitals públicos; PWA production-like automatizada está aprovada localmente;
- restore local e remoto isolado integralmente comprovados com dataset sintético;
- Asset Registry/hospedagem/CSP;
- decisão sobre manter ou substituir o perfil público legado; o atalho administrativo foi retirado, mas rota e API permanecem protegidas por organização e privacidade;
- confirmação operacional do ledger remoto;
- primeira execução validada do workflow manual de promoção.

## Gate de promoção

1. push na `main` executa Quality e Browser Smoke, sem deploy;
2. Quality produz artefato nomeado pelo SHA;
3. proprietário inicia `Promote verified build to production` informando SHA, run ID e `PROMOVER_PRODUCAO`;
4. workflow confirma SHA pertencente à `main`, proveniência do artefato, Worker, auto-deploy desativado e migrations;
5. Pages recebe o `out` verificado, passa smoke e somente então o Worker do mesmo SHA é publicado.

## Decisão atual

**NO-GO para release pública final.** A baseline é tecnicamente candidata, mas os bloqueadores humanos e validações externas acima ainda precisam ser fechados. Analytics 2.0 não faz parte deste snapshot e ainda não foi iniciado.

## Conteúdo e assets — Sprint 27.5

- 380 conteúdos oficiais revalidados por schema/contratos sem alteração editorial em massa;
- Wordle usa exclusivamente palavras `PUBLISHED` do CMS da organização e não depende dos JSON bíblicos em runtime;
- manifesto de proveniência e checklist humano criados;
- imagens da Memória permanecem `POST_RELEASE_ONLY`;
- nenhum blocker técnico novo; o Go/No-Go continua dependente de revisão bíblica/licenças, Asset Registry e arte final dos colecionáveis.

## Isolamento de textos completos — pós-27.6

- as 984 perguntas e os 380 conteúdos oficiais foram preservados com proveniência interna declarada (`AI_ASSISTED`, `HUMAN_CURATED`);
- seis arquivos com textos bíblicos integrais ou derivados foram removidos da árvore ativa;
- scripts antigos permanecem somente como evidência histórica e não fazem parte do release;
- não houve reescrita do histórico Git, alteração do CMS ou mudança funcional.

## Jurídico e Google Play — Sprint 27.6

- inventário de privacidade reconciliado com 70 tabelas até 0039;
- exportação e revogação de sessões estão implementadas; anonimização depende de resolução administrativa; contas inativas não possuem política automática;
- documentos públicos existentes continuam drafts técnicos; aprovação histórica vale somente para o piloto v1;
- TWA/Bubblewrap é a estratégia recomendada após estabilizar a PWA, sem package ID, domínio, assinatura ou AAB definidos;
- matriz Data Safety foi preparada somente como insumo técnico;
- decisão permanece `NO-GO`: há `LEGAL_BLOCKER` e `PLAY_STORE_BLOCKER`, não regressão técnica nova.
- controlador pessoa física e contato institucional estão definidos; contato pessoal anterior foi retirado das superfícies jurídicas, sem publicar CPF ou endereço residencial.
- público-alvo da v2 definido como adolescentes e adultos; crianças não são público-alvo formal. Faixas Play e tratamento jurídico de adolescentes/acesso infantil incidental seguem pendentes; contas infantis/supervisionadas são pós-release.
- v2 não excluirá contas automaticamente por inatividade; pedido de exclusão existente permanece. Matriz técnica preliminar e possibilidade de processamento internacional estão reconhecidas, sem limpeza implementada ou mecanismo jurídico presumido.

## Segurança de contas — Sprint 27.1

- rehash oportunista de credenciais legadas, recuperação single-use e rate limits sensíveis foram implementados localmente;
- TOTP administrativo, recovery codes MFA e autoridade owner foram implementados localmente; falta provisionar o segredo, promover a migration 0039 e validar a operação;
- decisão permanece **NO-GO** para abertura pública de contas privilegiadas até esses itens serem tratados.

## Operação e recuperação — Sprint 27.2

- workflows de escrita remota passaram a exigir chave de backup independente e checksum do artifact cifrado;
- exercício local comprovou integridade, FKs, ledger 0039, MFA, progresso/economia e Outbox após restauração;
- exercício remoto isolado confirmou `quick_check = ok`, FKs, 40 migrations até 0039 e preservação do dataset sintético; o D1 descartável foi excluído;
- `D1_BACKUP_ENCRYPTION_KEY` v1 está provisionada no Environment `production` e custodiada externamente;
- runbooks de deploy, migration, perda de dados, Cron/consumers e segredos foram consolidados;
- heartbeat persistido e alerta proativo permanecem ações futuras, mas não blockers da Sprint 27.2. Restore real de produção só deve ocorrer diante de incidente e autorização, nunca preventivamente.
