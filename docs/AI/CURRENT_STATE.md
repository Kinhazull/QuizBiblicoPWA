# Estado operacional corrente

**Última atualização:** 08/08/2026
**Fonte oficial de verdade para o estado corrente:** este arquivo.

Documentos de release, auditorias, roadmaps antigos e arquivos em `docs/AI/HISTORY/` preservam contexto histórico, mas não substituem este estado.

## Estado geral

A Fase 4 foi concluída e registrada como Release Candidate. A plataforma possui sete jogos integrados, CMS Universal, Biblioteca Universal, Gerador Universal, Game Loader, modos Livre, Diário e Evento, progressão, estatísticas, missões, conquistas, retenção, economia e administração.

A tag `v1.0.0` permanece como referência histórica do piloto do produto anterior centrado no Quiz Bíblico. A primeira release formal da plataforma Conte os Feitos será `v2.0.0`; essa tag ainda não foi criada.

## Fase atual

**Fase 5 — Consolidação, operação e desacoplamento progressivo do legado.**

Sprint corrente: **24.0 — Governança do Repositório e Estado Oficial da Plataforma**.

Próximas sprints aprovadas no roadmap:

- 24.1 — Integridade Operacional;
- 24.2 — Privacidade e Ciclo de Vida dos Dados;
- 24.3 — Desacoplamento Progressivo do Legado;
- 24.4 — Observabilidade e Segurança Operacional;
- 24.5 — Administração, Permissões e Analytics;
- 24.6 — Governança Editorial e Assets;
- 24.7 — Qualidade dos Jogos;
- 24.8 — Release Candidate Público/Mobile.

## Estado técnico confirmado

- `main` é a linha integrada corrente da plataforma.
- Migrations oficiais existem até `0036_platform_events.sql`.
- CMS Universal é a fonte oficial de conteúdo publicado.
- Biblioteca, Catálogo Elegível e Gerador Universal alimentam os modos atuais.
- Os sete jogos utilizam a infraestrutura universal.
- O Worker processa premiações legadas, outbox do Quiz, retry de eventos oficiais do Core e reconciliação independente de Eventos encerrados.
- Backup administrativo, diagnóstico e reset usam o contrato operacional canônico até a migration `0036`.
- Estruturas legadas permanecem por compatibilidade e evidência histórica; a remoção ainda não começou.

## Riscos priorizados

- restauração administrativa em produção continua dependendo de procedimento humano e validação prévia em D1 isolado;
- privacidade e retenção precisam incluir todos os novos domínios;
- fallback, Ranking, Medalhas, Jornadas e Worker legado precisam de critérios de saída.

## Regras operacionais atuais

- trabalho em branch própria é recomendado, mas trabalho direto na `main` é permitido quando o proprietário autorizar explicitamente;
- autorização para editar a `main` não inclui automaticamente commit, push, deploy ou migration;
- pnpm é o único package manager oficial;
- nenhuma tag `v2.0.0` será criada antes do gate correspondente;
- ações remotas continuam dependendo de autorização específica.
