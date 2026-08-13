# Roadmap oficial — Conte os Feitos

**Status:** CURRENT
**Baseline:** `2.0.0-rc.1`
**Fonte operacional:** `docs/AI/CURRENT_STATE.md`

## Convenção

- `v1.0.0`: tag histórica do piloto Quiz Bíblico.
- `v2.0.0`: primeira release formal da plataforma; ainda não criada.
- Qualidade, segurança, custo sustentável e validação real têm prioridade sobre a data de publicação.

## Fases 1–5

Concluídas: piloto, fundação modular, Core Platform, plataforma universal e consolidação operacional/editorial.

## Fase 6 — Experiência e engajamento

| Sprint | Entrega | Estado |
|---|---|---|
| 25.0 | Sincronização do estado | DONE |
| 25.1 | Desafios Diários 2.0 | DONE |
| 25.2 | Economia e Recompensas 2.0 | DONE |
| 25.3 | Colecionáveis e Conquistas 2.0 | DONE |
| 25.4 | Perfil e Identidade do Jogador | DONE |
| 25.5 | Ranking Universal | DONE |
| 25.6 | Engajamento Integrado | DONE |
| 25.7 | Curadoria de Conteúdo e Jogos | DONE |

## Fase 7 — Administração e inteligência

| Sprint | Entrega | Estado |
|---|---|---|
| 26.1 | Central Administrativa | DONE |
| 26.2 | Biblioteca Inteligente | DONE |
| 26.3 | Editor Visual de Eventos | DONE |
| 26.4 | Planejamento e Calendário Administrativo | DONE |
| 26.4.1 | Release Truth e Integridade da Baseline | DONE |
| 26.5 | Analytics 2.0 | DONE |
| 26.6 | Automação Administrativa | DONE |

## Fase 8 — Release Readiness

| Sprint | Entrega | Estado |
|---|---|---|
| 27.1 | Segurança e Contas | DONE localmente |
| 27.1.1 | MFA administrativo e autoridade owner | DONE localmente |
| 27.2 | Operação e recuperação | DONE |
| 27.3 | Retirada do legado e superfícies administrativas incompletas | DONE localmente |
| 27.3.1 | Sustentabilidade Operacional e Custo Zero | DONE localmente |
| 27.4 | Qualidade Real, CI e PWA | DONE localmente; Android físico pendente |
| 27.5 | Conteúdo, Arte e Licenças | DONE localmente; revisão/licenças e arte final pendentes |
| 27.6 | Jurídico e Google Play | DONE localmente; decisões humanas bloqueiam release |
| Pós-27.6 | Isolamento de textos bíblicos completos | DONE localmente; árvore ativa limpa, purge histórico sob decisão jurídica |
| 27.7.0 | Release Readiness Final | DONE |
| 27.7.1 | Fechamento dos blockers internos | DONE localmente |
| 27.7.2 | Preparação de Produção | NEXT |
| 27.7.3 | RC Final | PLANNED |
| 27.7.4 | Validação Manual do Usuário | PLANNED |
| 27.7.5 | Correções e Revalidação | PLANNED |
| 27.7.6 | Go/No-Go Formal | PLANNED |
| 27.7.7 | Release v2.0.0 | PLANNED |

Progressão e Economia administrativas não terão painéis duplicados: Analytics 2.0 permanece o destino agregado. Uma Sprint 27.3.2 só será necessária se requisitos operacionais especializados, distintos dos Analytics atuais, forem aprovados.

- validar PWA e Android físico, atualização e ciclo de vida;
- concluir revisão de citações/licenças remanescentes, purge histórico, tratamento de adolescentes/acesso infantil incidental e Data Safety;
- alinhar Asset Registry, hospedagem e CSP;
- reduzir superfícies legadas com telemetria e rollback;
- preencher o orçamento operacional com quotas/consumo reais e aprovar juridicamente os prazos da matriz de retenção antes de qualquer automação;
- executar segurança, desempenho, acessibilidade e Go/No-Go sobre um SHA imutável;
- promover produção apenas pelo workflow manual usando o artefato validado.

## Fase 9 — Evolução dos Jogos e Base de Conhecimento

Direção futura, sem implementação nesta baseline:

- biblioteca de referência bíblica;
- múltiplas traduções somente após validação de licença;
- fonte lexical PT-BR licenciada/aprovada, incluindo possível Aurélio ou alternativa;
- Wordle Bíblico 2.0 separando respostas bíblicas de palavras válidas para tentativa;
- evolução dos sete jogos e novos jogos posteriormente;
- expansão editorial e arte final autoral/licenciada.
- Bíblia completa, ACF/traduções modernas e léxico PT-BR somente com licença documental; Aurélio apenas se o licenciamento permitir, caso contrário usar alternativa aberta/aprovada.

## Pós-release no radar

- evolução de colecionáveis/economia sem pagamentos prematuros;
- Google Play quando o pacote mobile e obrigações legais estiverem aprovados;
- expansão do catálogo condicionada à qualidade editorial, custo e capacidade operacional.
- contas infantis e supervisionadas (`POST_RELEASE`): definir faixas suportadas, consentimento/vínculo responsável quando aplicável, privacidade/minimização, gestão e exclusão, UX, LGPD/ECA Digital, políticas Play/Families e testes específicos.
- retenção/inatividade automatizadas (`POST_RELEASE`): definir prazos jurídicos, avisos, dependências por tabela, agregação segura e anonimização/exclusão controlada antes de implementar jobs.
