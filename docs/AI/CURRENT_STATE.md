# Estado operacional corrente

**Status:** CURRENT — fonte oficial de verdade operacional
**Atualização:** 12/08/2026
**Roadmap canônico:** `docs/PRODUCT/ROADMAP.md`
**Snapshot de release:** `docs/PRODUCT/RELEASE_SNAPSHOT.md`

Auditorias e relatórios de fases anteriores são históricos. Em caso de divergência sobre o estado atual, este arquivo prevalece.

## Baseline integrada

- versão local: `2.0.0-rc.1`;
- branch integrada: `main`;
- HEAD integrado antes das alterações locais desta sprint: `2b8fd2fd35e86296a938ce1364b72b007803de79`;
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
- 26.4.1 Release Truth e Integridade da Baseline: concluída localmente, ainda não commitada;
- 26.5 Analytics 2.0: concluída localmente, ainda não commitada;
- 26.6 Automação Administrativa: concluída localmente, ainda não commitada.
- 27.1 Segurança e Contas: concluída localmente, ainda não commitada.
- 27.1.1 MFA Administrativo: concluída localmente, ainda não commitada.
- 27.2 Operação e Recuperação: **DONE**; chave de backup provisionada/custodiada e restore remoto comprovado em D1 isolado com dataset sintético.
- 27.3 Retirada do Legado: em validação local; navegação moderna desacoplada de Jornada/Medalhas e de entradas administrativas históricas, sem remoção de dados/APIs.
- 27.3.1 Sustentabilidade Operacional e Custo Zero: **NEXT**, ainda não iniciada.

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
| PWA/mobile | RC local; instalação e comportamento em Android real ainda exigem validação externa. |

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
- licenças bíblicas, privacidade de menores e Data Safety aguardam revisão humana/jurídica;
- Asset Registry ainda depende de URLs externas e precisa ser conciliado com CSP futura;
- APIs, dados e rotas diretas históricas permanecem por compatibilidade, mas Jornada, Medalhas e CMS antigo não fazem parte da navegação moderna;
- retenção futura dos backups e canal externo de alertas ainda precisam de decisão humana; a chave de backup `v1` já está provisionada e custodiada;
- Cron não possui heartbeat persistido; sua última execução depende dos logs e sinais indiretos;
- estado remoto de migrations requer verificação operacional antes de qualquer promoção.
