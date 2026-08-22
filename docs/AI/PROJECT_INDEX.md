# Índice operacional do projeto

## Entrada obrigatória

- `docs/AI/AGENTS.md`
- `docs/AI/PROJECT_CONTEXT.md`
- `docs/AI/CURRENT_STATE.md` — fonte oficial do estado corrente
- `docs/AI/KNOWN_ISSUES.md`
- `docs/PRODUCT/ROADMAP.md`

## Produto e governança

- `README.md`
- `CHANGELOG.md`
- `BACKLOG.md`
- `docs/PRODUCT/README.md`
- `docs/PRODUCT/DEPRECATIONS.md`
- `docs/PRODUCT/DECISION_LOG.md`
- `docs/PRODUCT/PRE_PHASE_5_COMPREHENSIVE_AUDIT.md`
- `docs/PRODUCT/PHASE_5_LEGACY_AUDIT_BACKLOG.md`
- `docs/REPOSITORY_GOVERNANCE.md`
- `docs/V2_RELEASE_SCOPE.md`
- `docs/V2_RELEASE_BLOCKERS.md`
- `docs/RELEASE_CANDIDATE_MANUAL_TEST.md`
- `docs/PWA_MOBILE_STRATEGY.md`
- `docs/DAILY_CHALLENGE.md`
- `docs/ECONOMY.md`
- `docs/COLLECTIONS_AND_ACHIEVEMENTS.md`
- `docs/GOOGLE_PLAY_PREPARATION.md`
- `docs/APP_DATA_SAFETY_CHECKLIST.md`

## Conteúdo e arquitetura universal

- `docs/PRODUCT/EDITORIAL_ARCHITECTURE.md`
- `docs/PRODUCT/CONTENT_SCALE_UP_V2_EDITORIAL_MATRIX.md` — metas e gates da expansão editorial v2
- `docs/PRODUCT/CONTENT_SCALE_UP_V2_INVENTORY.md` — inventário local, lacunas, sobreposições e plano de lotes
- `docs/PRODUCT/CONTENT_SCALE_UP_V2_REMAINING_GAMES_REVIEW.md` — revisão conjunta dos candidatos dos cinco jogos restantes
- `scripts/generate-content-scale-up-v2-inventory.mjs` — reprodução determinística do inventário editorial
- `content/wordle-scale-up-v2-lot-01.json` — primeiro lote Wordle da escala v2, ainda pendente de revisão
- `docs/PRODUCT/WORDLE_SCALE_UP_V2_LOT_01_REVIEW.md` — checklist humano integral do lote 01
- `scripts/generate-wordle-scale-up-v2-lot-01.mjs` — fonte e geração determinística do lote 01
- `content/wordle-scale-up-v2-remaining.json` — 877 candidatos Wordle em DRAFT, pendentes de revisão humana
- `docs/PRODUCT/WORDLE_SCALE_UP_V2_REMAINING_REVIEW.md` — checklist integral do lote único restante
- `scripts/generate-wordle-scale-up-v2-remaining.mjs` — geração determinística e rastreável do lote restante a partir do corpus autoral
- `docs/EDITORIAL_GOVERNANCE.md`
- `docs/ASSET_REGISTRY.md`
- `docs/CONTENT_IMPORT.md`
- `docs/PRODUCT/PHASE_4_ARCHITECTURE_DESIGN.md`
- `docs/PRODUCT/PHASE_4_RELEASE_CANDIDATE.md`
- `shared/content/`
- `functions/_lib/universal-content-library.ts`
- `functions/_lib/library-health.ts` — sinais editoriais determinísticos e read-only da Biblioteca
- `functions/api/admin/content/library-health.ts` — consulta administrativa tenant-scoped da saúde editorial
- `functions/_lib/editorial-governance.ts`
- `functions/_lib/asset-registry.ts`
- `functions/_lib/universal-game-generator.ts`
- `app/games/loader/`

## Banco e operação

- `drizzle/`
- `docs/D1_MIGRATION_RECONCILIATION.md`
- `scripts/reconcile-d1-migrations.mjs`
- `.github/workflows/reconcile-production-d1.yml`
- `OPERATIONS.md`

## Core Platform

- `docs/PRODUCT/CORE_PLATFORM_ARCHITECTURE.md`
- `functions/_lib/platform-event-engine.ts`
- `functions/_lib/platform-progress.ts`
- `functions/_lib/platform-statistics.ts`
- `functions/_lib/platform-achievements.ts`
- `functions/_lib/platform-missions.ts`

## Legado e retirada controlada

- `docs/PRODUCT/DEPRECATIONS.md`
- `docs/PRODUCT/PHASE_5_LEGACY_AUDIT_BACKLOG.md`
- `app/jogar/page.tsx`
- `workers/journey-awards/`
