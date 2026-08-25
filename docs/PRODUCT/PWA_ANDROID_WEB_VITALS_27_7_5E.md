# Sprint 27.7.5E — Android físico, PWA e Web Vitals

**Data:** 24/08/2026  
**Baseline:** `2.0.0-rc.1`  
**Branch/SHA:** `main` / `98b0dc45cbbeb36d9a979c5558d531744878c83c`  
**Estado:** `DONE / PWA_ANDROID_READY`

## Release Truth observado

- `HEAD` e `origin/main` apontavam para o mesmo SHA e a árvore estava limpa no início da auditoria;
- Quality and security `32794998206`: `SUCCESS`;
- promoção controlada `32795432790`: `SUCCESS`, no mesmo SHA;
- PWA release gate `32796200354`: `SUCCESS`, no mesmo SHA;
- o domínio candidato `https://quizbiblicopwa.pages.dev/` respondeu `200`;
- a baseline operacional já comprovada permanece com ledger D1 de 40 migrations, última `0039_administrative_mfa.sql` e zero pendências. Nenhuma consulta ou escrita D1 foi executada nesta sprint.

## Evidência Android humana

O proprietário informou execução em Android físico e aprovou os quatro blocos solicitados:

- instalação/abertura e navegação mobile;
- teclado do Wordle, background/foreground e interrupção/recuperação de rede;
- ausência de resultado/recompensa duplicados;
- jogos e superfícies administrativas relevantes.

Foram informados zero `BLOCKER` e zero `MAJOR`. A evidência é classificada como `ANDROID_MANUAL_VALIDATION_PASSED`. Ela é evidência humana e não é atribuída ao Codex. Modelo do aparelho, versão do Android e navegador não foram registrados e devem acompanhar a próxima matriz de compatibilidade, sem reabrir este gate funcional.

## Contrato PWA

### Manifest e ícones

- `name`: `Conte os Feitos — Jogos e Desafios Bíblicos`;
- `short_name`: `Conte os Feitos`;
- `start_url`, `scope` e `id`: `/`;
- `display`: `standalone`; orientação principal `portrait`;
- ícones reais: 192×192 `any`, 512×512 `any`, 512×512 `maskable` e Apple Touch Icon 180×180;
- tema/fundo pertencem à paleta atual da plataforma.

### Service Worker, offline e atualização

- APIs, páginas administrativas e navegações autenticadas usam rede e não entram em cache privado;
- o precache contém apenas shell público, manifest, favicon, ícones e fallback offline;
- navegação sem rede recebe `/offline`, sem reutilizar HTML privado;
- ativação remove versões incompatíveis do cache e assume os clientes;
- o gate production-like valida instalação/controle do SW, offline→online e atualização A→B sem loop nem shell obsoleto.

Resultado: `PWA_RELEASE_AUTOMATION_PASSED` no run `32796200354`.

## Web Vitals

Não existe amostra FIELD/CrUX suficiente disponível para este domínio. A API PageSpeed Insights recusou a consulta por quota (`429`), e não foi instalada dependência adicional. Foi executada uma medição LAB headless em perfil Pixel 5, navegador limpo, sem throttling artificial e com Service Worker bloqueado para medir o documento público diretamente.

| Rota pública | HTTP | TTFB | FCP | LCP | CLS | TBT | Classificação LAB |
|---|---:|---:|---:|---:|---:|---:|---|
| `/` | 200 | 128 ms | 472 ms | 512 ms | 0 | 0 ms | boa |
| `/termos/` | 200 | 273 ms | 480 ms | 480 ms | 0 | 0 ms | boa |
| `/offline/` | 200 | 383 ms | 476 ms | 884 ms | 0 | 0 ms | boa |

LCP e CLS estão abaixo dos limites recomendados de 2,5 s e 0,1. INP não é inferido em laboratório; TBT foi registrado apenas como proxy e ficou em 0 ms nesta amostra. Speed Index não foi produzido pelo instrumento disponível. Home autenticada e catálogo autenticado foram cobertos pela validação Android humana e pelos testes existentes, mas não receberam números LAB artificiais sem sessão controlada.

Conclusão: `LAB_GOOD / FIELD_DATA_UNAVAILABLE`. A ausência de FIELD não bloqueia a RC controlada; RUM/CrUX deve ser reavaliado após tráfego real suficiente.

## Peso do artifact e assets

Auditoria local do artifact já construído:

- `public/`: 145 arquivos, 109.179.214 bytes (104,12 MiB);
- `out/`: 804 arquivos, 113.378.302 bytes (108,13 MiB);
- Pages Functions: 2.533.953 bytes (2,42 MiB);
- maior chunk JS: 232.540 bytes (227,09 KiB);
- masters de Store: 9 arquivos, 17.020.211 bytes (16,23 MiB).

Os masters não entram no precache e os consumidores visuais usam derivados, portanto não foi identificado impacto bloqueante no carregamento observado. Manter os masters de Store em `public/` continua `RISK_ACCEPTED / POST_RELEASE`; movê-los exige confirmar antes URLs e consumidores externos.

## Acessibilidade relevante

- contratos focados confirmaram skip link, foco/estados acessíveis, logout, status vivo, redução de movimento, metadados de instalação e proteção das rotas críticas;
- Android humano não reportou bloqueador ou problema major de interação;
- leitor de tela em matriz ampliada permanece melhoria contínua, não blocker reproduzível desta baseline.

## Validações

- contratos PWA/SW/artifact/release truth: 20/20;
- `pnpm run test:quick`: 266/266;
- PWA release gate remoto: `SUCCESS`;
- `git diff --check`: executado após a atualização documental;
- nenhum arquivo de runtime, migration, conteúdo ou configuração de produção foi alterado.

## Decisão

- `PWA_ANDROID_READY`: **SIM** para a RC web/PWA controlada;
- `GOOGLE_PLAY_READY`: **NÃO**. Ainda depende de domínio/package ID, assinatura, Digital Asset Links, AAB, target SDK, Play Console, Data Safety, Target Audience, classificação e aprovação da listagem;
- próximo gate: `27.7.5F — Jurídico/editorial final/Data Safety`.

