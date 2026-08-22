# Estado operacional corrente

**Status:** CURRENT — fonte oficial de verdade operacional
**Atualização:** 22/08/2026
**Roadmap canônico:** `docs/PRODUCT/ROADMAP.md`
**Snapshot de release:** `docs/PRODUCT/RELEASE_SNAPSHOT.md`

Auditorias e relatórios de fases anteriores são históricos. Em caso de divergência sobre o estado atual, este arquivo prevalece.

## Asset Pack v2

Waves 1–5 estão `DONE`: Brand/PWA, sete jogos, recompensas, colecionáveis e ilustrações de Sistema/Eventos/Progressão possuem registros centrais e consumidores reais com derivados leves. Emojis permanecem apenas como fallback/identificador compacto. Wave 6 (Onboarding) é `POST_RELEASE / EXTRA_RESERVED`. Wave 7 está `DONE` como auditoria/preparação de Store, sem declarar Google Play Ready.

## Baseline integrada

- versão local: `2.0.0-rc.1`;
- branch integrada: `main`;
- HEAD/`origin/main` do repositório documentado: `09950e31e322940120a6efe4e4b12b07de77d293`;
- último runtime com Release Truth formalmente documentado: `7921a0576dacba02720a3fcac871b6afe4412ed0`; alterações posteriores somente se tornam baseline pública após novo Quality, promoção manual e smoke;
- migration local mais recente: `0039_administrative_mfa.sql`;
- a migration 0038 pertence ao schema moderno e não deve ser tratada como legado;
- ledger remoto verificado: 40 migrations, última `0039_administrative_mfa.sql`, zero pendências;
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
- 27.1.1 MFA Administrativo: implementação e smoke produtivo controlado concluídos; `MFA_ENCRYPTION_KEY` permanece cifrado e não foi exposto. Enrollment pela UI, TOTP, sessão `mfa_verified`, novo login, rejeição de replay e geração protegida de recovery codes foram comprovados em produção.
- 27.2 Operação e Recuperação: **DONE**; chave de backup provisionada/custodiada e restore remoto comprovado em D1 isolado com dataset sintético.
- 27.3 Retirada do Legado: concluída localmente; navegação moderna desacoplada de Jornada/Medalhas e de entradas administrativas históricas, sem remoção de dados/APIs.
- 27.3.1 Sustentabilidade Operacional e Custo Zero: concluída localmente; política e orçamento versionado criados, classificados como `ZERO-COST PLAUSIBLE, MEASUREMENT REQUIRED`.
- 27.4 Qualidade Real, CI e PWA: concluída localmente; suíte PWA production-like e gate manual implementados. Android físico/Web Vitals públicos permanecem validações humanas pré-RC.
- 27.5 Conteúdo, Arte e Licenças: concluída; proveniência e readiness documentados. Asset Pack v2 Waves 1–5 integrado, Wave 6 pós-release e Wave 7 auditada.
- 27.6 Jurídico e Google Play: concluída como auditoria/readiness; aprovação jurídica e publicação Play permanecem humanas/externas.
- 27.7.0 Release Readiness Final: concluída com decisão `READY_FOR_27_7_1`.
- 27.7.1 Fechamento dos blockers internos: concluída localmente.
- 27.7.2 Preparação de Produção: `DONE / REMOTE_VERIFIED`; backup, 0039, Pages Release Truth, Worker, MFA funcional, Operational Health, conteúdo, economia e Outbox foram comprovados. A próxima etapa é 27.7.3 — RC Final.
- 27.7.2B.1 Backup-only: modo operacional implementado no reconciliador, com job de migration inacessível em `backup_only`; o backup produtivo foi posteriormente executado e comprovado pela 27.7.2B.
- 27.7.2B Backup pré-migration: `DONE / PRE_MIGRATION_BACKUP_VERIFIED` no run `31742051309`; artifact cifrado retido por 7 dias e job de migration `SKIPPED` naquele run.
- 27.7.2C.1 Secret MFA: `DONE / REMOTE_VERIFIED PRESENT`; existência verificada somente como secret cifrado no ambiente production de `quizbiblicopwa`, sem leitura do valor. O deployment controlado posterior e o smoke 27.7.2D.4 comprovaram seu uso funcional.
- 27.7.2C.2–C.4 Migration 0039: `0039_PRODUCTION_VERIFIED`; aplicada exclusivamente pelo run `31748776445`, com ledger 40/0039, `verify-final`, `quick_check`, FKs e compare estrutural remoto aprovados. O compare corrigido classificou a produção como `EXPECTED_0039_ONLY`, sem drift, remoção ou regressão de linhas.
- 27.7.2D.3.2–D.3.3 Pages/Worker: `PAGES_RELEASE_TRUTH_VERIFIED`, `PAGES_RUNTIME_SMOKE_VERIFIED` e `WORKER_CURRENT_VERIFIED`. A auditoria comprovou que `1e78facd-f710-4ea8-b2ce-3e97bb739661` era apenas um registro `github:push` bloqueado (`skipped`, URL 404), sem alterar produção. O workflow oficial `31764192229` promoveu o artifact `9204548500` do Quality `31760852798` para o deployment Pages `8be3bbd5-95a7-4251-8ef3-dd4e6d079bef`, SHA `7921a0576dacba02720a3fcac871b6afe4412ed0`, com artifact/hash e quatro rotas críticas aprovados. O mesmo workflow publicou `quiz-biblico-journey-awards` versão 61 (`bb9269ae-2065-4611-ad71-940c12403a11`), deployment `1c6ed2c6-0371-4972-a19c-df2e7ea4a2d2`, preservando D1 e cron `* * * * *`. A execução periódica do cron permanece `EXECUTION_HEALTH_UNKNOWN` por ausência de heartbeat persistido, classificada como `RISK_ACCEPTED / POST_RELEASE`.
- 27.7.2D.4 MFA produtivo: `MFA_PRODUCTION_OPERATIONAL_VERIFIED`. A mesma conta administrativa controlada concluiu primeiro fator, enrollment pela UI, confirmação TOTP, sessão `mfa_verified`, acesso administrativo, logout, novo login com challenge MFA e rejeição única de replay. O D1 confirmou MFA `active`, `key_version=1`, oito recovery codes não utilizados, metadado anti-replay e zero challenges pendentes, sem selecionar segredo, IV ou hashes. Operational Health autenticado ficou saudável; ledger 40/0039, `quick_check=ok`, FKs limpas, Quiz 984, oficiais 380, economia sem saldos negativos e Outbox com dois eventos entregues. Consumo manual de recovery code não foi forçado.
- 27.7.3 RC Final: `DONE`; a versão formal permanece `2.0.0-rc.1`.
- 27.7.4 Validação Manual do Usuário: `IN_PROGRESS`. A primeira auditoria real em navegador/celular percorreu login, MFA, Home, Perfil, Loja, Inventário, Jogos, Daily, sete jogos e Administração. Os problemas reproduzíveis encontrados geraram a rodada de estabilização abaixo; a revalidação do artifact publicado ainda é obrigatória.
- 27.7.5 Correções e Revalidação: `IN_PROGRESS / IMPLEMENTED_ON_MAIN`. Foram consolidados layout e contraste mobile, navegação inferior e botões Voltar, cards compactos, dimensionamento de assets, Perfil, Loja/Inventário, Home, Daily e Administração; foram corrigidos alinhamentos/instruções dos jogos, regra de desbloqueio do Cofre, browser-smoke e registro resiliente/idempotente de resultados.
- 27.7.5B.1 Matriz Editorial v2: `DONE_LOCAL / DOCUMENTATION_ONLY`. Foram congeladas as metas mínimas de escala, unidades de contagem, distribuições, identidade editorial dos sete jogos, controle de duplicidade e gates de lote.
- 27.7.5B.2 Inventário e lacunas: `DONE_LOCAL / READ_ONLY`. Após a aprovação humana do lote 01, a baseline Wordle versionada aprovada passou a 323 soluções únicas (lacuna 877); Linha do Tempo mantém 40 sequências (760), Memória 120 pares canônicos (180), Associação 60 conjuntos (740), Quem Sou Eu? 60 conjuntos (740) e Três Pistas 60 conjuntos (740). A evidência não consulta produção; Quiz permanece na baseline operacional verificada de 984.
- 27.7.5B.3 Escala Wordle: `CONTENT_PRODUCED / HUMAN_REVIEW_REQUIRED`. O lote 01 de 50 soluções foi aprovado explicitamente pelo proprietário. Sob autorização excepcional de lote único, foram gerados os 877 candidatos restantes como DRAFT: 180 de 5 letras, 350 de 6 e 347 de 7; 240 EASY, 406 MEDIUM e 231 HARD; 438 AT e 439 NT. A projeção após aprovação é exatamente 1.200 soluções, 400 por comprimento, mas o lote restante permanece `PENDING_HUMAN_REVIEW` e não autoriza dry-run, importação ou publicação.
- 27.7.5B.4–B.6 Demais jogos: `CONTENT_PRODUCED / HUMAN_REVIEW_REQUIRED`. Sob autorização de produção conjunta, foram gerados 3.040 candidatos: 760 Timeline, 60 conteúdos de Memória com 180 pares novos, 740 Associação, 740 Quem Sou Eu? e 740 Três Pistas. A projeção após aprovação atinge 800 unidades nos jogos de conjunto e 300 pares canônicos em Memória. Todos permanecem `PENDING_HUMAN_REVIEW`; Quem Sou Eu? e Três Pistas exigem atenção especial à repetição de desafios, progressão e identidade editorial antes do dry-run.
- Wordle 2.0: seleção posicional de letras, normalização de acentos, respostas de 5–7 letras e validação server-side por léxico PT-BR aberto/revisado mais respostas CMS. O pacote editorial adicional contém 153 itens aprovados (50 de 5, 50 de 6 e 53 de 7 letras), sem duplicar os 120 Wordles oficiais anteriores.
- Importação universal: interface administrativa guiada em três etapas, upload/colar/modelos JSON e CSV, dry-run sem escrita, relatório legível e confirmação explícita. Permissão e validação server-side permanecem obrigatórias.
- ajuste pós-27.6: controlador pessoa física e `suporteconteosfeitos@gmail.com` definidos; CPF/endereço residencial não serão publicados e eventual endereço físico segue sujeito à revisão jurídica.
- ajuste pós-27.6: público-alvo formal da v2 definido como adolescentes e adultos; crianças ficaram fora do público-alvo. Tratamento jurídico de adolescentes/acesso incidental infantil permanece pendente e contas supervisionadas são pós-release.
- ajuste pós-27.6: v2 sem exclusão automática por inatividade; matriz técnica preliminar de retenção definida e possível processamento internacional reconhecido. Prazos/mecanismos jurídicos e qualquer automação permanecem pendentes.

## Capacidades atuais

| Domínio | Estado |
|---|---|
| Plataforma participante | Home, Perfil 2.0, catálogo, Recompensas, Loja, Inventário e Notificações implementados. |
| Jogos e modos | Sete jogos em `FREE_PLAY`, `DAILY` e `EVENT`, com Loader/Providers universais. Wordle aceita 5–7 letras, entrada posicional e vocabulário PT-BR normalizado. |
| Core Platform | Progress, Reward, Statistics, Achievements, Missions e Event Engine persistentes e idempotentes. |
| Economia e coleções | Economia 2.0, cosméticos, propriedade, equipamentos e coleções implementados. |
| Engajamento | Daily 2.0, recompensas, missões, conquistas e engajamento integrado implementados. |
| Ranking | **Ranking Universal moderno implementado**. Estruturas históricas do ranking do Quiz são legado distinto. |
| CMS e curadoria | CMS Universal, publicação, governança editorial, conteúdo oficial e Curadoria 25.7 concluídos. Importação em lote possui fluxo guiado com dry-run e confirmação; expansão Wordle v2 está versionada e aprovada pelo proprietário. |
| Biblioteca | Biblioteca Inteligente, Catálogo Elegível, Gerador e sinais editoriais implementados. |
| Eventos | Editor Visual, reservas, lifecycle e experiência participante implementados. |
| Planejamento | Calendário e agenda administrativos implementados sobre fontes existentes. |
| Administração | Central Administrativa e Analytics 2.0 implementados. Placeholders vazios de Progressão/Economia e links do CMS antigo foram retirados; áreas especializadas só serão retomadas se tiverem objetivo distinto de Analytics. |
| Operação | Reconciliação, backup cifrado com chave dedicada/checksum, restore local e remoto isolado, diagnósticos, observabilidade e runbooks estão implementados; heartbeat e alertas externos permanecem evolução futura. |
| Sustentabilidade | Política canônica e orçamento configurável existem; consumo real e quotas vigentes dependem de revisão manual dos painéis Cloudflare/GitHub. |
| PWA/mobile | Artifact production-like validado com SW real, cache, offline e update em desktop/mobile emulado. A rodada de correções mobile de 20–22/08 está na `main` e exige revalidação após promoção; Android físico ainda exige checklist humano. |

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
- migrations remotas estão verificadas até 0039; qualquer migration futura continua exigindo o fluxo operacional completo.
- não há migration nova nas correções de 20–22/08. O SHA atual do repositório não deve ser confundido com o último SHA de runtime formalmente promovido;
- o pacote Wordle v2 possui 153 conteúdos localmente aprovados; quantidade efetivamente publicada/projetada em produção deve ser confirmada pelo relatório administrativo após importação idempotente;
- a falha intermitente de registro de resultado foi corrigida com retry limitado e reentrada idempotente. A revalidação produtiva deve confirmar sucesso sob perda de resposta/rede móvel sem recompensa duplicada;
- documentos públicos atuais são drafts técnicos; a aprovação jurídica histórica cobre apenas o piloto v1, não a v2/Google Play;
- Google Play permanece bloqueado por domínio, package ID, assinatura/DAL/AAB, target SDK vigente, Data Safety/classificação e Android físico.
## Asset Pack v2 — Wave 3

Recompensas e progressão visual usam o registro compartilhado `RewardArt`, com derivados leves para moeda, XP, nível, conquistas, Daily e os três baús. Valores, barras, estados, economia e contratos de API permanecem funcionais e inalterados.
