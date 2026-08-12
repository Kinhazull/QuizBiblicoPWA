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
- migration local mais recente: `0038_platform_rankings_indexes.sql`;
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
| Administração | Central Administrativa e Analytics 2.0 implementados, com comparações, tendências, funis, retenção, jogos, conteúdo, economia e Eventos agregados. |
| Operação | Reconciliação, backup, diagnósticos, observabilidade e privacidade possuem infraestrutura; restore real ainda precisa ser exercitado. |
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
- restore real ainda não ensaiado em ambiente isolado;
- licenças bíblicas, privacidade de menores e Data Safety aguardam revisão humana/jurídica;
- Asset Registry ainda depende de URLs externas e precisa ser conciliado com CSP futura;
- legado compatível continua exposto em superfícies controladas;
- políticas de retenção/custo zero e canal externo de alertas ainda precisam ser formalizados;
- estado remoto de migrations requer verificação operacional antes de qualquer promoção.
