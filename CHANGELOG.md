# Changelog

As mudanças relevantes do Conte os Feitos serão registradas neste arquivo. O formato segue Keep a Changelog de maneira simplificada e o versionamento formal passa a seguir SemVer.

## Unreleased — v2.0.0-rc.1

### Estabilização pré-publicação — agosto de 2026

- auditoria manual mobile das trilhas participante e administrativa;
- unificação visual de login/MFA, Home, Perfil, Loja, Inventário, Recompensas, catálogos, jogos e Administração;
- cards mobile compactos, navegação inferior centralizada, botão Voltar padronizado e contrato de dimensionamento de assets;
- correções de alinhamento/instruções no Wordle, Associação, Quem Sou Eu e Três Pistas;
- Cofre Diário liberado após a primeira vitória, sem confundir a recompensa com as metas de 3 e 7 vitórias;
- conclusão de partidas resiliente a falhas transitórias, com retry limitado e reentrada idempotente sem duplicar progressão;
- Wordle com seleção de posição, palavras de 5–7 letras, normalização de acentos e léxico PT-BR aberto/revisado;
- pacote adicional de 153 conteúdos Wordle aprovado pelo proprietário;
- importação universal em lote guiada por upload/modelos, dry-run, relatório e confirmação explícita.
- Content Scale-Up v2 revisado, aprovado e publicado, totalizando 5.485 conteúdos CMS nos sete jogos;
- correção da conclusão server-side do Wordle para preservar o comprimento real de palavras de 6 e 7 letras, além do retry idempotente de registro.
- Memória passou a compor novas partidas com três pares canônicos vindos de três fontes elegíveis, preservando seleções históricas e os contratos Free, Daily e Event.

### Release Candidate público/mobile

- versão de desenvolvimento `2.0.0-rc.1` centralizada no pacote, sem criação de tag;
- manifest PWA consolidado, atualização controlada e contrato offline seguro;
- estratégia Android/Google Play, Data Safety e gate manual documentados.

### Governança

- fonte oficial do estado operacional consolidada;
- convenção de versões formalizada;
- pnpm definido como package manager único;
- deprecações, artefatos históricos e superfície de IA inventariados;
- contrato de migrations futuras documentado.

## Fase 4 — Release Candidate da plataforma — 2026-08-03

### Adicionado

- CMS e Biblioteca Universal;
- Catálogo Elegível, Gerador Universal e Game Loader;
- modos `FREE_PLAY`, `DAILY` e `EVENT`;
- sete jogos integrados;
- conteúdo oficial da plataforma;
- progressão, estatísticas, missões, conquistas, retenção e economia;
- administração de conteúdo e Eventos.

Esta etapa não recebeu tag pública. O estado consolidado está documentado em `docs/PRODUCT/PHASE_4_RELEASE_CANDIDATE.md`.

## Transformação para plataforma — julho/agosto de 2026

- identidade Conte os Feitos;
- shell, Home e catálogo modular;
- Game SDK;
- Core Platform e Event Engine;
- outbox transacional e consumers;
- Wordle, Três Pistas, Timeline, Memória, Associação e Quem Sou Eu;
- Loja, inventário, equipamentos e Perfil visual.

## v1.0.0 — Quiz Bíblico / piloto histórico — 2026-07-16

- piloto controlado do produto anterior centrado no Quiz Bíblico;
- Jornadas, tentativas, Ranking e Medalhas;
- administração, segurança, backup e operação do Worker;
- pipeline de qualidade e deploy verificado.

`v1.0.0` permanece imutável como tag histórica. A primeira release formal da plataforma Conte os Feitos será `v2.0.0`, ainda não criada.
