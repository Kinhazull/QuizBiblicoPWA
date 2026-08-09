# Estado operacional corrente

**Última atualização:** 08/08/2026
**Fonte oficial de verdade para o estado corrente:** este arquivo.

Documentos de release, auditorias, roadmaps antigos e arquivos em `docs/AI/HISTORY/` preservam contexto histórico, mas não substituem este estado.

## Estado geral

A Fase 4 foi concluída e registrada como Release Candidate. A plataforma possui sete jogos integrados, CMS Universal, Biblioteca Universal, Gerador Universal, Game Loader, modos Livre, Diário e Evento, progressão, estatísticas, missões, conquistas, retenção, economia e administração.

A tag `v1.0.0` permanece como referência histórica do piloto do produto anterior centrado no Quiz Bíblico. A primeira release formal da plataforma Conte os Feitos será `v2.0.0`; essa tag ainda não foi criada.

## Fase atual

**Fase 5 — Consolidação, operação e desacoplamento progressivo do legado.**

Sprint corrente: **24.8 — Release Candidate Público/Mobile**.

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
- A migration local `0037_editorial_governance_assets.sql` está preparada e não foi aplicada remotamente; produção permanece em `0036`.
- O CMS possui fluxo DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED, comentários, histórico comparável e rollback por nova versão.
- O Asset Registry usa metadados no D1 e URL HTTPS controlada; R2 está apenas preparado, sem bucket ou binding remoto.
- CMS Universal é a fonte oficial de conteúdo publicado.
- Erros públicos modernos, supportId, logs estruturados, health unificado e runbooks possuem contratos compartilhados.
- Analytics administrativos agregados reutilizam participações, eventos, Biblioteca, estatísticas e ledgers existentes, com isolamento organizacional e sem PII.
- Permissões semânticas modernas possuem ponte unidirecional para grants históricos, preservando admin, leader e usuários existentes.
- Alertas externos permanecem desativados; o sink operacional padrão registra somente logs seguros.
- Biblioteca, Catálogo Elegível e Gerador Universal alimentam os modos atuais.
- Os sete jogos utilizam a infraestrutura universal.
- Os sete jogos possuem contrato explícito de identidade, dificuldade e scoring; feedback, progresso e instruções contextuais seguem o Game SDK.
- A versão corrente está centralizada no `package.json` como `2.0.0-rc.1`, sem criação da tag `v2.0.0`.
- O PWA possui manifest completo, cache restrito ao shell público, atualização controlada por `controllerchange` e contrato `ONLINE_REQUIRED` para operações de servidor.
- FREE_PLAY evita os últimos 20 conteúdos por usuário/jogo quando o catálogo permite e aplica fallback controlado quando necessário; DAILY permanece determinístico e EVENT usa reservas.
- O runtime participante do Quiz usa exclusivamente CMS, Biblioteca, Catálogo Elegível, Gerador, Selection, Provider e Game Loader; o fallback de leitura legado foi removido.
- O Worker preserva o identificador técnico histórico `journey-awards`, mas executa somente outbox do Quiz, retry de eventos oficiais do Core e reconciliação independente de Eventos encerrados.
- Backup administrativo, diagnóstico e reset usam o contrato operacional canônico até a migration `0036`.
- Privacidade usa matriz canônica derivada do mesmo contrato; exportação pessoal v2 cobre Core, jogos, economia, Eventos e contribuições CMS.
- Anonimização revoga sessões e credenciais efêmeras, preservando CMS organizacional e ledgers pseudônimos necessários a FKs e idempotência.
- Jornadas, ranking, medalhas e temporadas permanecem como rotas/dados históricos sem exposição na navegação ativa. A sincronização automática de medalhas e as notificações legadas foram desativadas.

## Riscos priorizados

- restauração administrativa em produção continua dependendo de procedimento humano e validação prévia em D1 isolado;
- privacidade e retenção precisam incluir todos os novos domínios;
- ranking universal ainda precisa de decisão e reconstrução futura;
- rotas/APIs históricas ainda exigem medição de uso e política de retenção antes da remoção física;
- o nome técnico do Worker permanece legado por decisão operacional.

## Regras operacionais atuais

- trabalho em branch própria é recomendado, mas trabalho direto na `main` é permitido quando o proprietário autorizar explicitamente;
- autorização para editar a `main` não inclui automaticamente commit, push, deploy ou migration;
- pnpm é o único package manager oficial;
- nenhuma tag `v2.0.0` será criada antes do gate correspondente;
- ações remotas continuam dependendo de autorização específica.
