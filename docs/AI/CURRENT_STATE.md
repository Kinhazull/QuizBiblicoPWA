# Estado operacional corrente

**Status:** CURRENT — fonte oficial de verdade operacional
**Atualização:** 13/08/2026
**Roadmap canônico:** `docs/PRODUCT/ROADMAP.md`
**Snapshot de release:** `docs/PRODUCT/RELEASE_SNAPSHOT.md`

Auditorias e relatórios de fases anteriores são históricos. Em caso de divergência sobre o estado atual, este arquivo prevalece.

## Asset Pack v2

Waves 1–5 estão `DONE`: Brand/PWA, sete jogos, recompensas, colecionáveis e ilustrações de Sistema/Eventos/Progressão possuem registros centrais e consumidores reais com derivados leves. Emojis permanecem apenas como fallback/identificador compacto. Wave 6 (Onboarding) é `POST_RELEASE / EXTRA_RESERVED`. Wave 7 está `DONE` como auditoria/preparação de Store, sem declarar Google Play Ready.

## Baseline integrada

- versão local: `2.0.0-rc.1`;
- branch integrada: `main`;
- HEAD observado antes das alterações locais da 27.7.0/27.7.1: `11fd739b7824854890662d075f2e9c0311590b68`;
- migration local mais recente: `0039_administrative_mfa.sql`;
- a migration 0038 pertence ao schema moderno e não deve ser tratada como legado;
- o ledger remoto não pode ser inferido do Git. Seu estado atual **requer verificação operacional** pelo workflow oficial;
- não existe evidência canônica local suficiente para declarar uma pendência remota específica da 0037.

## Sprints

- 25.1–25.7: concluídas;
- 26.1 Central Administrativa: concluída;
- 26.2 Biblioteca Inteligente: concluída;
- 26.3 Editor Visual de Eventos: concluída;
- 26.4 Planejamento e Calendário Administrativo: concluída;
- 26.4.1 Release Truth e Integridade da Baseline: concluída;
- 26.5 Analytics 2.0: concluída;
- 26.6 Automação Administrativa: concluída;
- 27.1 Segurança e Contas: concluída;
- 27.1.1 MFA Administrativo: implementação concluída; `MFA_ENCRYPTION_KEY` está presente e cifrado no Pages, sem valor exposto. A migration 0039 e o compare estrutural remoto estão verificados; MFA ainda não foi validado por enrollment/smoke funcional produtivo.
- 27.2 Operação e Recuperação: **DONE**; chave de backup provisionada/custodiada e restore remoto comprovado em D1 isolado com dataset sintético.
- 27.3 Retirada do Legado: concluída localmente; navegação moderna desacoplada de Jornada/Medalhas e de entradas administrativas históricas, sem remoção de dados/APIs.
- 27.3.1 Sustentabilidade Operacional e Custo Zero: concluída localmente; política e orçamento versionado criados, classificados como `ZERO-COST PLAUSIBLE, MEASUREMENT REQUIRED`.
- 27.4 Qualidade Real, CI e PWA: concluída localmente; suíte PWA production-like e gate manual implementados. Android físico/Web Vitals públicos permanecem validações humanas pré-RC.
- 27.5 Conteúdo, Arte e Licenças: concluída; proveniência e readiness documentados. Asset Pack v2 Waves 1–5 integrado, Wave 6 pós-release e Wave 7 auditada.
- 27.6 Jurídico e Google Play: concluída como auditoria/readiness; aprovação jurídica e publicação Play permanecem humanas/externas.
- 27.7.0 Release Readiness Final: concluída com decisão `READY_FOR_27_7_1`.
- 27.7.1 Fechamento dos blockers internos: concluída localmente; 27.7.2 é a próxima etapa operacional.
- 27.7.2B.1 Backup-only: modo operacional local implementado no reconciliador, com job de migration inacessível em `backup_only`; o backup produtivo ainda não foi executado e a 0039 continua pendente conforme a verificação remota 27.7.2A.
- 27.7.2B Backup pré-migration: `DONE / PRE_MIGRATION_BACKUP_VERIFIED` no run `31742051309`; artifact cifrado retido por 7 dias e job de migration `SKIPPED` naquele run.
- 27.7.2C.1 Secret MFA: `DONE / PRODUCTION_PRESENT`; existência verificada somente como secret cifrado no ambiente production de `quizbiblicopwa`, sem leitura do valor. A listagem de deployments agora registra produção no SHA `11c2377`, posterior ao provisionamento; enrollment/smoke MFA continuam pendentes.
- 27.7.2C.2–C.4 Migration 0039: `0039_PRODUCTION_VERIFIED`; aplicada exclusivamente pelo run `31748776445`, com ledger 40/0039, `verify-final`, `quick_check`, FKs e compare estrutural remoto aprovados. O compare corrigido classificou a produção como `EXPECTED_0039_ONLY`, sem drift, remoção ou regressão de linhas.
- ajuste pós-27.6: controlador pessoa física e `suporteconteosfeitos@gmail.com` definidos; CPF/endereço residencial não serão publicados e eventual endereço físico segue sujeito à revisão jurídica.
- ajuste pós-27.6: público-alvo formal da v2 definido como adolescentes e adultos; crianças ficaram fora do público-alvo. Tratamento jurídico de adolescentes/acesso incidental infantil permanece pendente e contas supervisionadas são pós-release.
- ajuste pós-27.6: v2 sem exclusão automática por inatividade; matriz técnica preliminar de retenção definida e possível processamento internacional reconhecido. Prazos/mecanismos jurídicos e qualquer automação permanecem pendentes.

## Capacidades atuais

| Domínio | Estado |
|---|---|
| Plataforma participante | Home, Perfil 2.0, catálogo, Recompensas, Loja, Inventário e Notificações implementados. |
| Jogos e modos | Sete jogos em `FREE_PLAY`, `DAILY` e `EVENT`, com Loader/Providers universais. |
| Core Platform | Progress, Reward, Statistics, Achievements, Missions e Event Engine persistentes e idempotentes. |
| Economia e coleções | Economia 2.0, cosméticos, propriedade, equipamentos e coleções implementados. |
| Engajamento | Daily 2.0, recompensas, missões, conquistas e engajamento integrado implementados. |
| Ranking | **Ranking Universal moderno implementado**. Estruturas históricas do ranking do Quiz são legado distinto. |
| CMS e curadoria | CMS Universal, publicação, governança editorial, conteúdo oficial e Curadoria 25.7 concluídos. |
| Biblioteca | Biblioteca Inteligente, Catálogo Elegível, Gerador e sinais editoriais implementados. |
| Eventos | Editor Visual, reservas, lifecycle e experiência participante implementados. |
| Planejamento | Calendário e agenda administrativos implementados sobre fontes existentes. |
| Administração | Central Administrativa e Analytics 2.0 implementados. Placeholders vazios de Progressão/Economia e links do CMS antigo foram retirados; áreas especializadas só serão retomadas se tiverem objetivo distinto de Analytics. |
| Operação | Reconciliação, backup cifrado com chave dedicada/checksum, restore local e remoto isolado, diagnósticos, observabilidade e runbooks estão implementados; heartbeat e alertas externos permanecem evolução futura. |
| Sustentabilidade | Política canônica e orçamento configurável existem; consumo real e quotas vigentes dependem de revisão manual dos painéis Cloudflare/GitHub. |
| PWA/mobile | Artifact production-like validado com SW real, cache, offline e update em desktop/mobile emulado; Android físico ainda exige validação humana. |

## Invariantes

- CMS Universal é a fonte oficial de conteúdo publicado.
- O cliente não concede XP, moedas, estatísticas, missões ou conquistas.
- Ranking Universal é plataforma moderna; Medalhas e ranking histórico do Quiz permanecem conceitos separados.
- O nome técnico histórico `journey-awards` é preservado por segurança operacional.
- Push na `main` executa qualidade e gera artefato; não promove produção automaticamente.
- Promoção de produção é manual, explícita, vinculada ao SHA e ao artefato validados.
- Commit, push, deploy, migration e tag exigem autorização específica.

## Riscos correntes

- PWA/Android físico e Web Vitals públicos não validados;
- licenças bíblicas, tratamento jurídico de adolescentes/acesso infantil incidental e Data Safety aguardam revisão humana/jurídica;
- textos ACF/Almeida completos e quatro derivados foram removidos da árvore ativa da v2; não havia consumidor runtime. O histórico Git não foi reescrito e eventual purge permanece decisão jurídica;
- as 984 perguntas e os 380 conteúdos oficiais têm proveniência interna declarada pelo proprietário (`AI_ASSISTED`, com curadoria humana); a lacuna CSV→CMS é de rastreabilidade, não de autoria externa;
- os 16 colecionáveis funcionais usam derivados oficiais do Asset Pack v2; os IDs históricos permanecem intactos, `frame-aliance → frame-covenant` e `frame-real → frame-royal` são aliases exclusivamente visuais, e emojis permanecem apenas como fallback;
- Asset Registry ainda depende de URLs externas e precisa ser conciliado com CSP futura;
- APIs, dados e rotas diretas históricas permanecem por compatibilidade, mas Jornada, Medalhas e CMS antigo não fazem parte da navegação moderna;
- matriz técnica de retenção por domínio está definida, mas prazos jurídicos, implementação, orçamento comercial e canal externo de alertas ainda precisam de decisão humana; a chave de backup `v1` já está provisionada e custodiada;
- Cron não possui heartbeat persistido; sua última execução depende dos logs e sinais indiretos;
- estado remoto de migrations requer verificação operacional antes de qualquer promoção.
- documentos públicos atuais são drafts técnicos; a aprovação jurídica histórica cobre apenas o piloto v1, não a v2/Google Play;
- Google Play permanece bloqueado por domínio, package ID, assinatura/DAL/AAB, target SDK vigente, Data Safety/classificação e Android físico.
## Asset Pack v2 — Wave 3

Recompensas e progressão visual usam o registro compartilhado `RewardArt`, com derivados leves para moeda, XP, nível, conquistas, Daily e os três baús. Valores, barras, estados, economia e contratos de API permanecem funcionais e inalterados.
