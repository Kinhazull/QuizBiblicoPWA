# Backlog classificado — Conte os Feitos

O roadmap canônico está em `docs/PRODUCT/ROADMAP.md`. Este arquivo reúne trabalho não sequenciado e não transforma risco em blocker automaticamente.

## Pré-2.0

| Prioridade | Tipo | Item | Condição de saída |
|---|---|---|---|
| P1 | OPERATIONS | Promover a migration 0037 pelo processo controlado | Backup, verify-promotable, aplicação autorizada, verify-final e compare aprovados. |
| P1 | EXTERNAL_VALIDATION | Validar PWA em Android físico | Instalação, atualização, teclado, background, bloqueio/encerramento e maskable aprovados. |
| P1 | LEGAL | Revisar privacidade, menores, Data Safety e licenças bíblicas | Parecer/decisão humana registrados antes da abertura pública. |
| P1 | SECURITY | Exercitar restore e resposta a incidentes | Restauração validada em D1 isolado e runbooks aprovados. |
| P1 | UX | Consolidar ciclo diário e estados de tentativa | Sete jogos sem replay indevido, estado stale ou recompensa duplicada. |
| P1 | EXTERNAL_VALIDATION | Medir Web Vitals no domínio público/CDN | Baseline público registrado e regressões impeditivas resolvidas. |
| P1 | OPERATIONS | Definir domínio público e package ID | Decisão do dono registrada; Digital Asset Links preparado se TWA for aprovada. |
| P2 | FEATURE | Calibrar economia/recompensas | Política versionada e cenários de saldo/progressão validados. |
| P2 | FEATURE | Consolidar colecionáveis/conquistas | Escopo aprovado sem duplicar Achievements, Shop ou Inventory. |
| P2 | UX | Perfil 2.0 | Identidade, evolução e conta/privacidade com hierarquia mobile consistente. |
| P2 | EDITORIAL | Migrar Memória integralmente para assets | Conteúdo revisado e Asset Registry disponível; texto continua fallback válido até lá. |
| P2 | TECH_DEBT | Centralizar matriz E2E dos sete jogos × modos | Cobertura parametrizada sem duplicação frágil. |
| P2 | OPERATIONS | Definir storage do Asset Registry | Decidir R2 versus URLs controladas; nenhuma ativação remota implícita. |
| P2 | FEATURE | Decidir ranking universal | Modelo, privacidade e antifraude aprovados antes de codificar. |
| P2 | EDITORIAL | Melhorar diversidade/repetição/dificuldade | Critérios baseados em dados e revisão editorial. |

## Pós-2.0

| Prioridade | Tipo | Item | Observação |
|---|---|---|---|
| P3 | FEATURE | Novos jogos e expansão de catálogo | Priorizar após estabilização pública. |
| P3 | FEATURE | TWA/wrapper e APIs nativas | PWA primeiro; depende de domínio/package ID. |
| P3 | FEATURE | Offline completo | O contrato atual é `ONLINE_REQUIRED`. |
| P3 | FEATURE | Marketplace, pagamentos e consumíveis | Não faz parte da economia v2 inicial. |
| P3 | FEATURE | Push, modo projetor e recursos sociais | Exigem produto, privacidade e operação próprias. |
| P3 | EDITORIAL | Assets avançados e imagens amplas | Depende do storage definitivo e curadoria. |
| P3 | TECH_DEBT | Busca textual/FTS | Somente após necessidade e volume medidos. |
| P3 | OPERATIONS | Telemetria externa/Sentry | Exige decisão de privacidade, custo e retenção. |
| P3 | TECH_DEBT | Decidir remoção da superfície dormente de IA | Manter desativada até decisão formal. |

## Problemas e dívidas a monitorar

| Prioridade | Tipo | Item |
|---|---|---|
| P2 | TECH_DEBT | Rotas e dados históricos ainda existem; remover somente com medição e política de retenção. |
| P2 | TECH_DEBT | Worker mantém o nome histórico `journey-awards` por segurança operacional. |
| P2 | OPERATIONS | Backup integral criptografado e restauração continuam dependentes de procedimento controlado. |
| P2 | SECURITY | Reduzir `unsafe-inline` da CSP quando compatível com o runtime. |
| P2 | SECURITY | Avaliar TOTP e recuperação de conta por e-mail. |
| P2 | TECH_DEBT | Revisar a exceção temporária do audit quando minimatch/ESLint oferecerem correção compatível. |

## Taxonomia

- `FEATURE`, `BUG`, `UX`, `EDITORIAL`, `TECH_DEBT`, `SECURITY`, `OPERATIONS`, `LEGAL`, `EXTERNAL_VALIDATION`.
- `P0`: blocker reproduzível atual; `P1`: necessário antes de `2.0.0`; `P2`: desejável antes de `2.0.0`; `P3`: pode ficar pós-`2.0.0`.

Não há P0 local confirmado nesta baseline. Itens externos podem se tornar blockers somente quando o gate correspondente falhar.
