# Roadmap oficial — Conte os Feitos

**Estado:** Fase 5
**Fonte do estado operacional corrente:** `docs/AI/CURRENT_STATE.md`

Este documento registra a sequência aprovada do produto. Fases concluídas permanecem resumidas como histórico; detalhes técnicos continuam nos documentos de implementação e release.

## Convenção de versões

- `v1.0.0` permanece como tag histórica do produto anterior e do piloto controlado do Quiz Bíblico.
- A primeira release formal da plataforma Conte os Feitos será `v2.0.0`.
- A tag `v2.0.0` ainda não foi criada.
- Tags históricas não serão alteradas ou recriadas.

## Histórico concluído

### Fase 1 — Quiz Bíblico e piloto controlado

Quiz competitivo, Jornadas, tentativas, Ranking, Medalhas, administração, segurança, operação e piloto `v1.0.0`.

### Fase 2 — Fundação modular

Identidade visual, shell da plataforma, catálogo de jogos, Home, Game SDK e desenvolvimento local seguro.

### Fase 3 — Core Platform e jogos

Event Engine, Progress, Reward, Statistics, Achievements, Missions, outbox, retenção, economia, Perfil e sete jogos.

### Fase 4 — Plataforma universal

CMS Universal, Biblioteca, Catálogo Elegível, Gerador, Game Loader, modos `FREE_PLAY`, `DAILY` e `EVENT`, conteúdo oficial e Release Candidate.

## Fase 5 — Consolidação e preparação da plataforma pública

### 24.0 — Governança do Repositório

Atualizar a fonte de verdade, versionamento, package manager, inventários, changelog, deprecações e contrato de migrations.

### 24.1 — Integridade Operacional

Atualizar backup/restauração, diagnóstico, reset do piloto e reconciliação operacional de Eventos para o schema atual.

### 24.2 — Privacidade e Ciclo de Vida dos Dados

Completar exportação, anonimização, retenção e documentação de privacidade dos novos domínios.

### 24.3 — Desacoplamento Progressivo do Legado

Retirar fallback e acessos legados em etapas reversíveis, preservando dados históricos e decidindo o futuro de Ranking, Medalhas e Temporadas.

### 24.4 — Observabilidade e Segurança Operacional

Alertas, health checks, dead letters, projeções, reservas, sanitização de erros e runbooks.

### 24.5 — Administração, Permissões e Analytics

Permissões próprias da plataforma e indicadores por jogo, modo, conteúdo, Evento, retenção e economia.

### 24.6 — Governança Editorial e Assets

Revisão, aprovação, arquivamento, rollback, importação e Asset Registry.

### 24.7 — Qualidade dos Jogos

Diferenciação, conteúdo, acessibilidade, dificuldade, repetição, feedback e cobertura E2E.

### 24.8 — Release Candidate Público/Mobile

Dispositivo real, desempenho, PWA, Google Play, observabilidade, aprovação legal e gate para `v2.0.0`.

## Radar pós-Fase 5

- expansão do catálogo de jogos;
- colecionáveis e evolução da economia;
- temporadas voltadas a desbloqueáveis, se aprovadas;
- Google Play e evolução mobile contínua;
- imagens e assets avançados nos jogos;
- melhorias editoriais e mecânicas específicas;
- recursos sociais somente após necessidade medida.

## Regra de avanço

Cada sprint deve possuir escopo, critérios de aceite, validações e rollback proporcionais ao risco. Branch própria é o padrão; trabalho direto na `main` é permitido quando explicitamente autorizado pelo proprietário. Persistência deve permanecer aditiva e operações remotas exigem autorização específica.
