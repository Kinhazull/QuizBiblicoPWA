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
| 27.7.2 | Preparação de Produção | DONE |
| 27.7.3 | RC Final | DONE |
| 27.7.4 | Validação Manual do Usuário | IN PROGRESS — primeira auditoria executada |
| 27.7.5 | Correções e Revalidação | IN PROGRESS — promovida; Wordle revalidado, checklist amplo ainda aberto |
| 27.7.5B.1–B.2 | Matriz, inventário e lacunas | DONE |
| 27.7.5B.3–B.6 | Content Scale-Up v2 | DONE — revisão e aprovação humanas registradas |
| 27.7.5B.7 | Importação, publicação e reconciliação | DONE — 5.485 conteúdos publicados |
| 27.7.5B.8 | Auditoria final e freeze editorial | DONE — baseline produtiva congelada |
| 27.7.5C | Content Gate v2 e antirrepetição | DONE — sete jogos `CONTENT_READY_V2` |
| 27.7.5C.1 | Memória: combinação dinâmica dos 300 pares | DONE localmente — histórico compatível, Free/Daily/Event cobertos |
| 27.7.5C.2 | Próximo gate de conteúdo definido pelo plano da release | NEXT |
| 27.7.5D | Validação manual final | PLANNED |
| 27.7.5E | Android/PWA/Web Vitals | PLANNED |
| 27.7.5F | Jurídico/editorial final/Data Safety | PLANNED |
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

## Caminho restante até a v2.0.0

### 1. Fechar a baseline técnica candidata

- obter Quality/browser-smoke verdes no SHA candidato final;
- promover exatamente o artifact validado pelo workflow manual;
- confirmar que não existe migration pendente e não executar reconciliação quando não houver mudança de schema;
- registrar SHA, Quality Run ID, artifact, deployment Pages e Worker efetivamente promovidos.

### 2. Revalidar as correções em produção controlada

- repetir a trilha participante em 320, 360 e 390 px: login/MFA, Home, Jogos, Daily, sete jogos, Perfil, Loja, Inventário, Recompensas e Notificações;
- repetir a trilha administrativa: Central, Conteúdo, importação em lote, Acervo, Eventos, Planejamento, Analytics, Diagnóstico, permissões e navegação mobile;
- testar resultado de partida com rede lenta/interrompida e confirmar retry sem recompensa duplicada;
- confirmar Wordle com 5, 6 e 7 letras, seleção posicional, acentos normalizados e rejeição de palavras inexistentes;
- confirmar Cofre liberado após ao menos uma vitória diária e metas de 3/7 independentes.

### 3. Baseline editorial importada — concluída

- contagens reconciliadas: Quiz 984; Wordle 1.201; Linha do Tempo 800; Memória 100 conteúdos/300 pares; Associação 800; Quem Sou Eu 800; Três Pistas 800; total 5.485;
- Content Gate v2 concluído: Biblioteca, disponibilidade e Catálogo Elegível confirmados para os sete jogos;
- baseline congelada sem alterar as 984 perguntas já revisadas;
- detalhes de elegibilidade, amostragem e antirrepetição em `docs/PRODUCT/CONTENT_GATE_V2.md`.

### 4. Gates humanos e externos

- concluir Android físico, instalação PWA, teclado, background/foreground, offline/update e Web Vitals públicos;
- aprovar Termos, Privacidade, público adolescente/acesso incidental, retenção, transferências e Data Safety;
- confirmar licença/proveniência de assets e citações usadas publicamente;
- decidir domínio/package ID/assinatura/DAL/AAB apenas para a trilha Google Play, separada do lançamento web.

### 5. Go/No-Go e publicação

- congelar um SHA imutável e executar gates finais completos;
- fechar todos os `BLOCKER` e `MAJOR`, aceitando riscos menores explicitamente;
- registrar decisão `GO`, atualizar versão de `2.0.0-rc.1` para `2.0.0`, changelog e release notes;
- promover o artifact final, executar smoke pós-deploy e somente então criar tag/release `v2.0.0`;
- manter plano de rollback, backup e responsáveis disponíveis durante a janela.

## Fase 9 — Evolução pós-v2 e Base de Conhecimento

Direção futura, sem implementação nesta baseline:

- biblioteca de referência bíblica;
- múltiplas traduções somente após validação de licença;
- manutenção do léxico PT-BR aberto já adotado e revisão de novas fontes somente com licença compatível;
- expansão editorial contínua do Wordle, mantendo separadas respostas CMS e palavras aceitas para tentativa;
- evolução dos sete jogos e novos jogos posteriormente;
- expansão editorial e arte final autoral/licenciada.
- Bíblia completa, ACF/traduções modernas e léxico PT-BR somente com licença documental; Aurélio apenas se o licenciamento permitir, caso contrário usar alternativa aberta/aprovada.

## Pós-release no radar

- evolução de colecionáveis/economia sem pagamentos prematuros;
- Google Play quando o pacote mobile e obrigações legais estiverem aprovados;
- expansão do catálogo condicionada à qualidade editorial, custo e capacidade operacional.
- contas infantis e supervisionadas (`POST_RELEASE`): definir faixas suportadas, consentimento/vínculo responsável quando aplicável, privacidade/minimização, gestão e exclusão, UX, LGPD/ECA Digital, políticas Play/Families e testes específicos.
- retenção/inatividade automatizadas (`POST_RELEASE`): definir prazos jurídicos, avisos, dependências por tabela, agregação segura e anonimização/exclusão controlada antes de implementar jobs.
