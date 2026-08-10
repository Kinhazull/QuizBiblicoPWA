# Roadmap oficial — Conte os Feitos

**Estado:** Sprint 25.3 concluída localmente, baseline `2.0.0-rc.1`
**Roadmap canônico:** este arquivo
**Fonte do estado operacional corrente:** `docs/AI/CURRENT_STATE.md`

Qualidade da primeira versão pública tem prioridade sobre velocidade de publicação. O RC local não representa aprovação de release e a tag `v2.0.0` ainda não existe.

## Convenção de versões

- `v1.0.0` permanece como tag histórica do piloto do Quiz Bíblico.
- A primeira release formal da plataforma Conte os Feitos será `v2.0.0`.
- `2.0.0-rc.1` é a baseline local atual, não uma release aprovada.
- Tags históricas não serão alteradas ou recriadas.

## Fases concluídas

- **Fase 1 — Quiz Bíblico e piloto:** Quiz competitivo, Jornadas e operação do piloto.
- **Fase 2 — Fundação modular:** identidade, Home, catálogo, Game SDK e ambiente local.
- **Fase 3 — Core Platform:** Event Engine, Progress, Reward, Statistics, Achievements, Missions, economia, retenção e sete jogos.
- **Fase 4 — Plataforma universal:** CMS, Biblioteca, Catálogo Elegível, Gerador, Loader e modos `FREE_PLAY`, `DAILY` e `EVENT`.
- **Fase 5 — Consolidação:** operação, privacidade, retirada controlada do legado, observabilidade, analytics, governança editorial, assets, qualidade dos jogos e preparação do RC público/mobile.

## Auditoria do plano anterior

| Item antigo | Estado | Evidência e delta real |
|---|---|---|
| 25.1 Objetivo Diário Completo | DONE | Sete tentativas, progresso por vitórias, estados finais, metas 3/7–7/7 e claim idempotente foram consolidados e validados localmente. |
| 25.2 Economia | DONE | Política v2 centralizada, recompensas recorrentes e Daily calibradas, catálogo permanente reprecificado e cenários de aquisição documentados; monitoramento com Analytics existente permanece operacional. |
| 25.3 Colecionáveis | DONE | Catálogo expandido de 16 itens, duas coleções, raridade/origem, progresso derivado, experiência de Recompensas e conquistas existentes integradas sem nova persistência. |
| 25.4 Perfil | DONE | Perfil 2.0 consolida identidade equipada, progressão, jornada, estatísticas dos sete jogos, feitos recentes confiáveis e coleções; identidade social pública permanece fora do escopo. |
| 25.5 Ranking | NEEDS_REVIEW | O ranking existente é histórico e específico do Quiz. Ranking universal não foi iniciado e exige regras de privacidade, temporadas e competição saudável. |
| 26.1 Central Administrativa | COMPLETE | Entrada administrativa consolidada como projeção read-only de Health, Analytics, Eventos, conteúdo, reservas e auditoria, com drill-down para os módulos existentes. |
| 26.2 Biblioteca Inteligente | PARTIAL | Biblioteca Universal, catálogo elegível, filtros, uso e gerador existem. Busca, qualidade, diversidade e recomendações editoriais ainda são limitadas. |
| 26.3 Editor de Eventos | SUPERSEDED | Eventos v1 já possuem criação, validação, sugestão, agendamento, cancelamento, reservas e experiência participante. O delta futuro é Eventos 2.0. |
| 26.4 Planejamento | PARTIAL | Calendário e ferramentas históricas coexistem com Eventos/CMS; falta um planejamento editorial e operacional universal, sem dependência de Jornada. |
| 26.5 Analytics | SUPERSEDED | A Sprint 24.5 entregou API e página de Analytics agregados. A evolução restante é profundidade, comparação e acionabilidade, não reconstrução. |

## Fase 6 — Experiência e engajamento

### 25.0 — Sincronização do estado e roadmap

- **Objetivo:** reconciliar código, testes, documentação e pendências com a baseline `2.0.0-rc.1`.
- **Entregas:** estado corrente, auditoria das fases antigas, roadmap e backlog classificados.
- **Aceite:** uma fonte operacional e um roadmap canônico, sem alterações funcionais ou remotas.

### 25.1 — Desafios e Objetivo Diário 2.0

**Estado:** concluído e validado localmente.

- **Objetivo:** evoluir o ciclo diário já existente para uma experiência clara, consistente e mensurável nos sete jogos.
- **Escopo:** UX de progresso diário, metas de 3/7 desafios, estados de participação, recompensa e retorno; eliminar inconsistências remanescentes sem recriar seleção/lifecycle.
- **Entregas:** contrato funcional consolidado, UI mobile-first, regras idempotentes e cobertura dos estados críticos.
- **Dependências:** Analytics atual, modos `DAILY`, Progress/Reward/Missions e decisão de balanceamento.
- **Aceite macro:** nenhuma repetição indevida, progresso/recompensa consistentes e sete jogos cobertos.
- **Fora do escopo:** ranking, Eventos 2.0 e novo sistema de progressão.

### 25.2 — Economia e recompensas

- **Objetivo:** calibrar a economia existente para a primeira versão pública.
- **Escopo:** fontes e sumidouros de moedas, preços, recompensas diárias/de jogos, catálogo cosmético e métricas de integridade.
- **Entregas:** política versionada, limites/idempotência, cenários de saldo e indicadores administrativos.
- **Dependências:** dados de teste representativos e decisão de produto sobre ritmo de aquisição.
- **Aceite macro:** economia sem saldo negativo/duplicação e progressão compreensível em uso real.
- **Fora do escopo:** pagamentos, marketplace e moedas premium.
- **Estado:** concluída localmente; política oficial em `docs/ECONOMY.md` e valores executáveis em `shared/platform-economy.ts`.

### 25.3 — Colecionáveis e conquistas

**Estado:** concluído e validado localmente.

- **Objetivo:** transformar conquistas e cosméticos existentes em uma experiência de coleção coerente.
- **Escopo:** catálogo, progresso, raridade/visibilidade, relação com Perfil/Inventário e recompensa única.
- **Entregas:** contrato de coleção aprovado e experiência de descoberta/acompanhamento.
- **Dependências:** 25.2 e catálogo de conquistas existente.
- **Aceite macro:** desbloqueio, recompensa e exibição idempotentes, inclusive itens ocultos.
- **Fora do escopo:** troca entre usuários e itens pagos.
- **Decisões:** 14 itens pela Loja, Avatar Lâmpada pelo Daily 7/7 e Moldura Luz pela conquista Primeiros Passos; nenhuma recompensa por completar coleção; Eventos/Missões e arte final permanecem evoluções explícitas.

### 25.4 — Perfil 2.0

**Estado:** concluído e validado localmente.

- **Objetivo:** consolidar Perfil como identidade e resumo da jornada na plataforma.
- **Escopo:** hierarquia mobile, equipamentos, evolução, estatísticas por jogo, conquistas e separação clara de conta/privacidade.
- **Entregas:** visão participante unificada e estados vazios/erro/carregamento consistentes.
- **Dependências:** 25.2–25.3 e APIs existentes; novas APIs somente se o delta for comprovado.
- **Aceite macro:** dados confiáveis, acessibilidade e consistência visual com a plataforma.
- **Fora do escopo:** perfil social público sem decisão de privacidade.
- **Decisões:** jogo mais jogado derivado de partidas concluídas; Últimos Feitos usa somente `unlockedAt` de conquistas; Ranking permanece reservado para a 25.5 sem placeholder ou reaproveitamento legado.

### 25.5 — Ranking e competição saudável

- **Objetivo:** decidir e, se aprovado, implementar ranking universal sem reutilizar cegamente o ranking legado.
- **Escopo:** modelo de pontuação comparável, períodos, opt-in/privacidade, moderação e antifraude básico.
- **Entregas:** decisão arquitetural e de produto antes da implementação; ranking somente se os critérios forem aprovados.
- **Dependências:** 25.1–25.4, Analytics e validação jurídica de exposição de nomes.
- **Aceite macro:** competição compreensível, justa, isolada por organização e reversível.
- **Fora do escopo:** ranking global público e prêmios financeiros.

## Fase 7 — Administração e inteligência

### 26.1 — Dashboard operacional e analítico

**Estado:** concluído localmente como Central Administrativa.

- **Objetivo:** integrar indicadores já existentes em uma visão acionável.
- **Escopo:** saúde, filas/dead letters, migrations, Eventos, conteúdo e métricas de uso com drill-down seguro.
- **Dependências:** observabilidade e Analytics atuais.
- **Aceite macro:** problemas operacionais detectáveis sem consulta direta ao banco e sem PII desnecessária.
- **Decisões:** `/api/admin/dashboard` permanece autenticado, tenant-scoped, read-only e `no-store`; a Central reutiliza `getPlatformAnalytics` e `buildOperationalHealth`, limita atividade recente a oito registros auditados e não persiste contadores próprios.

### 26.2 — Biblioteca Inteligente

**Estado:** concluída localmente.

- **Objetivo:** evoluir a Biblioteca existente para apoiar qualidade, diversidade e planejamento editorial.
- **Escopo:** busca, cobertura taxonômica, repetição, disponibilidade, qualidade e sugestões explicáveis.
- **Dependências:** Asset Registry, governança editorial e metadados consistentes.
- **Aceite macro:** decisões explicáveis, isolamento organizacional e nenhuma alteração automática de conteúdo publicado.
- **Decisões:** cálculo read-only sob demanda; concentração acima de 50% em catálogos com 20+ itens; cobertura EASY/MEDIUM/HARD abaixo de 10%; mínimo operacional derivado das capacidades dos jogos; sobreuso em 3× a média e ao menos cinco utilizações; impacto de reservas a partir de 25%; publicação sem projeção é crítica. Os sinais apoiam, mas não substituem, revisão humana.

### 26.3 — Eventos 2.0

- **Objetivo:** evoluir o Evento v1 sem reconstruir editor, reservas ou lifecycle.
- **Escopo:** recorrência/temporadas somente se aprovadas, apresentação, premiação, acompanhamento e operação.
- **Dependências:** 25.2, 26.1 e validação do uso real de Eventos v1.
- **Aceite macro:** configuração segura, reservas consistentes, uma tentativa por jogo e encerramento recuperável.

### 26.4 — Planejamento editorial e operacional

- **Objetivo:** unificar calendário de conteúdo, publicação, Eventos e capacidade operacional.
- **Escopo:** visão temporal e conflitos; substituir gradualmente ferramentas centradas em Jornada.
- **Dependências:** 26.2–26.3.
- **Aceite macro:** planejamento universal sem tornar o calendário legado fonte de verdade.

### 26.5 — Analytics 2.0

- **Objetivo:** aprofundar os Analytics já entregues para decisões de produto e operação.
- **Escopo:** funis, coortes, comparação por jogo/modo/conteúdo, retenção e economia, com privacidade.
- **Dependências:** eventos confiáveis, dicionário de métricas e volume suficiente.
- **Aceite macro:** métricas versionadas, reproduzíveis e sem duplicar Progress/Statistics.

## Fase 8 — Release Readiness

### 27.1 — Auditoria funcional final
Fluxos completos, matriz dos sete jogos/modos, migrations e regressões críticas.

### 27.2 — Polimento UX/UI
Correções orientadas por testes reais, acessibilidade, mobile e consistência; sem expansão funcional.

### 27.3 — Conteúdo e qualidade editorial
Revisão amostral e automatizada, cobertura taxonômica, assets e referências, sem alterar conteúdo sem aprovação editorial.

### 27.4 — Performance, observabilidade e segurança
Web Vitals públicos, alertas, CSP, dependências, restore e runbooks de incidente.

### 27.5 — Android físico e PWA pública
Instalação, atualização entre deploys, teclado, background, bloqueio/encerramento e ícone maskable no domínio final.

### 27.6 — Jurídico, Data Safety e licenças
Privacidade, menores, retenção, licenças bíblicas, Data Safety, domínio e package ID.

### 27.7 — Go/No-Go `2.0.0`
Reunir evidências, resolver blockers, aprovar checklist e somente então autorizar tag/publicação.

## Pós-2.0 que não bloqueia a release

- TWA ou wrapper nativo, após decisão baseada no PWA público;
- offline integral dos jogos;
- marketplace, pagamentos ou economia avançada;
- recursos sociais e ranking público global;
- novos jogos, modo projetor, push e assets avançados;
- serviços externos de telemetria sem decisão de privacidade/custo.

## Regras de avanço

Cada sprint deve declarar escopo, aceite, validações e rollback proporcionais ao risco. Trabalho direto na `main` depende de autorização explícita. Commit, push, deploy, migration e qualquer operação remota exigem autorização própria. Persistência permanece aditiva e o estado remoto nunca é presumido a partir do repositório local.
