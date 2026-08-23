# Snapshot de release e Go/No-Go

**Status:** CURRENT  
**Data:** 22/08/2026
**Baseline:** `2.0.0-rc.1`

## Identidade formal da RC

- estado: `RC_STABILIZATION / FEATURE_FREEZE`;
- `REPOSITORY_RC_SHA`: commit que contém este snapshot, resolvido por `git rev-parse HEAD`; o relatório operacional da 27.7.3 registra o SHA literal e os checks anexados a ele;
- `REPOSITORY_CURRENT_SHA`: `09950e31e322940120a6efe4e4b12b07de77d293`;
- `RUNTIME_VERIFIED_SHA`: `7921a0576dacba02720a3fcac871b6afe4412ed0` (último encadeamento formal registrado; não representa automaticamente os commits posteriores);
- Pages deployment: `8be3bbd5-95a7-4251-8ef3-dd4e6d079bef`;
- Worker: versão 61, deployment `1c6ed2c6-0371-4972-a19c-df2e7ea4a2d2`;
- D1: `33fc35a0-46cf-4756-b6be-89b07371256c`, ledger 40/`0039_administrative_mfa.sql`;
- gates locais da RC: `test:all` 285/285, Playwright 100 aprovados/4 ignorados/0 falhas, PWA production-like 10/10, typecheck, lint, build 66/66 páginas, Pages Functions e Worker dry-run aprovados;
- gates do repositório: Quality e PWA Release devem estar `SUCCESS` no `REPOSITORY_RC_SHA`; os run IDs ficam associados ao SHA no GitHub Actions e no relatório da sprint;
- promoção runtime adicional: não necessária enquanto o commit da RC contiver somente documentação e contratos sem efeito no artifact/runtime.

### FEATURE_FREEZE

Até o Go/No-Go são permitidos apenas blocker/regressão, segurança, acessibilidade crítica, incompatibilidade de release e documentação necessária. A rodada de UX/mobile e Wordle foi aceita como estabilização pré-publicação e está encerrada no código; novas features, redesign opcional, mudança de economia, conteúdo oportunista, novo jogo e refatoração sem necessidade voltam a ficar proibidos.

## Release Truth

- branch observada: `main`;
- HEAD/`origin/main` operacional verificado: `7921a0576dacba02720a3fcac871b6afe4412ed0`;
- migration local mais recente: `0039_administrative_mfa.sql`;
- 0039: `0039_PRODUCTION_VERIFIED`; ledger remoto 40, zero pendências;
- MFA: `MFA_PRODUCTION_OPERATIONAL_VERIFIED`; enrollment pela UI, TOTP, sessão `mfa_verified`, novo login, replay rejection e recovery generation comprovados sem exposição de credenciais;
- Pages: `PAGES_RELEASE_TRUTH_VERIFIED` e `PAGES_RUNTIME_SMOKE_VERIFIED`; Quality `31760852798` → artifact `9204548500` → promoção oficial `31764192229` → deployment `8be3bbd5-95a7-4251-8ef3-dd4e6d079bef` no SHA `7921a0576dacba02720a3fcac871b6afe4412ed0` → smoke das quatro rotas aprovado. O registro Git `1e78facd-f710-4ea8-b2ce-3e97bb739661` foi comprovado como `skipped`, sem artifact ou alteração de produção;
- Worker: `WORKER_CURRENT_VERIFIED`, versão 61 (`bb9269ae-2065-4611-ad71-940c12403a11`), deployment `1c6ed2c6-0371-4972-a19c-df2e7ea4a2d2`, D1 esperado e cron `* * * * *`; execução recorrente sem heartbeat permanece desconhecida.

As afirmações remotas acima possuem evidência operacional da 27.7.2; não implicam aprovação jurídica ou release pública.

## Entregas concluídas

- Fases 1–7 e Sprints 27.1–27.6;
- Analytics 2.0 e Automação Administrativa;
- sete jogos, CMS, Biblioteca, Gerador, Loader e modos FREE_PLAY/DAILY/EVENT;
- Core Platform, economia, coleções, Perfil 2.0 e Ranking Universal;
- PWA production-like, Quality gates e promoção manual vinculada ao SHA/artifact;
- Asset Pack v2 Waves 1–5 integradas; Wave 6 `POST_RELEASE`; Wave 7 `DONE` como auditoria/preparação de Store;
- 27.7.0–27.7.3 `DONE`; estabilização técnica 27.7.5A, escala 27.7.5B e Content Gate 27.7.5C `DONE`; 27.7.5D (validação manual final) é o próximo gate.
- Wordle 2.0 e importação universal guiada fazem parte da baseline candidata atual.

## Conteúdo e proveniência

- Quiz: `PROVENANCE_RESOLVED`, com autoria interna, assistência de IA e curadoria humana; `Quiz.csv` preservado; 984 itens publicados foram reconfirmados remotamente na 27.7.2D.4;
- pacote oficial inicial: 380 IDs únicos, preservado como origem histórica da expansão;
- Content Scale-Up v2: revisão humana e aplicação administrativa concluídas; contagem reconciliada de 5.485 publicados/projetados/AVAILABLE — Quiz 984, Wordle 1.201 (1.200 elegíveis), Timeline 800, Memória 100 conteúdos/300 pares, Associação 800, Quem Sou Eu 800 e Três Pistas 800. Content Gate: `READY_FOR_27_7_5D`;
- freeze editorial pós-importação: `IN_PROGRESS`; requer amostragem final e registro formal, sem nova importação;
- textos bíblicos completos/derivados sem licença comprovada continuam fora da árvore ativa;
- scripts que referenciam fontes removidas são `HISTORICAL / NOT_FOR_RELEASE_USE`;
- purge do histórico Git: `HUMAN_LEGAL_REVIEW_REQUIRED`, não blocker técnico da RC.

## Asset Pack v2

- `BrandLogo`, `GameArt`, `RewardArt`, `CollectibleArt` e `PlatformIllustration` possuem consumidores reais;
- aliases aprovados: `frame-covenant` → `frame-aliance.png`; `frame-royal` → `frame-real.png`;
- extras reservados não integram economia/grants; runtime usa derivados leves e masters permanecem fontes;
- masters Store em `public/` acrescentam 16,23 MiB ao artifact: `RISK_ACCEPTABLE` para RC web e futura otimização;
- nenhum asset Store está pronto para upload sem etapa humana. Isso não bloqueia RC web.

## Compatibilidade histórica

- perfil público: `KEEP_HISTORICAL_COMPATIBILITY`; rota/API protegidas permanecem fora da navegação principal, sem reconstrução social na v2;
- Jornada e Medalhas: APIs `KEEP_COMPATIBILITY`, superfícies participantes `REDIRECT_SURFACE`;
- Analytics antigo e ranking histórico do Quiz: `SAFE_TO_RETIRE_LATER`; Analytics 2.0 e Ranking Universal são ativos;
- APIs administrativas antigas permanecem até prova segura de ausência de consumidores/necessidade de retenção.

## Operação e recuperação

- backup pré-0039: `REMOTE_VERIFIED`, run `31742051309`, artifact privado `9197534287`, SHA-256 cifrado `65571640b719e9e99fc4838d89b12f4b77296331adab8dd671ac04c8d24c2d2a`, plaintext removido; `D1_BACKUP_ENCRYPTION_KEY` v1 possui evidência de custódia externa;
- restore remoto isolado com dataset sintético: comprovado; D1 descartável excluído; produção não restaurada;
- heartbeat persistido, monitor externo e alertas proativos: riscos aceitos/`POST_RELEASE`, não blockers internos;
- backup, reconciliador, verify-promotable/final, compare e rollback seguem gates obrigatórios.

## Jurídico e Google Play

- controlador, contato institucional, público-alvo adolescentes/adultos, ausência de controles infantis fictícios e ausência de exclusão automática por inatividade são decisões registradas;
- Termos/Privacidade, bases/prazos, adolescentes/acesso incidental, transferências e citações/licenças exigem `HUMAN_LEGAL_REVIEW_REQUIRED` antes do Go público;
- Google Play é `BLOCKED_EXTERNAL / FUTURE_PUBLICATION_PREPARATION` e não bloqueia RC web.

## Checklist operacional da 27.7.2

1. SHA/Quality/browser-smoke: concluído;
2. secrets por metadata, backup cifrado e restore isolado: concluídos;
3. migration 0039, `verify-final` e compare: concluídos;
4. contagens 984/380 e Outbox: confirmadas;
5. rotas críticas, Pages Release Truth e Worker/Cron: confirmados;
6. enrollment/TOTP MFA controlado: concluído; novo login e replay rejection aprovados; consumo manual de recovery code não foi forçado.

## Decisão atual

**`RC_STABILIZATION_IN_PROGRESS`: as correções foram promovidas, Wordle foi revalidado e o conteúdo escalado foi aplicado.** Os próximos gates são a revalidação manual ampla, freeze editorial, jurídico/Android e Go/No-Go. Ainda não existe autorização de release pública.

## Classificação dos riscos residuais

| Item | Classificação |
|---|---|
| heartbeat persistido, monitor externo e alertas proativos | `RISK_ACCEPTED / POST_RELEASE` |
| warning Actions Node.js 20 → 24 | `POST_RELEASE` antes da remoção do runtime antigo |
| consumo produtivo de recovery code | `MANUAL_CHECK`; geração e single-use automatizado comprovados |
| recuperação extrema do owner | `MANUAL_CHECK`; procedimento operacional externo |
| masters Store em `public/` | `RISK_ACCEPTED / POST_RELEASE` |
| advisories transitivos aceitos | `RISK_ACCEPTED`, com exceções restritas e revisão periódica |
| APIs históricas mantidas | `RISK_ACCEPTED / POST_RELEASE`, retirada somente com telemetria e rollback |
| Web Vitals públicos | `MANUAL_CHECK` antes do Go público; não bloqueia RC privada |

Revisão editorial/bíblica e jurídica não bloqueiam RC privada/controlada, mas são `HUMAN_APPROVAL_REQUIRED` antes de `PUBLIC_RELEASE_GO`. Google Play é `BLOCKED_EXTERNAL / FUTURE_PUBLICATION_PREPARATION` e não integra o caminho crítico da RC web.
