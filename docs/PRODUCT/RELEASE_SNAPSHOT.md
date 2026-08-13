# Snapshot de release e Go/No-Go

**Status:** CURRENT  
**Data:** 13/08/2026
**Baseline:** `2.0.0-rc.1`

## Release Truth

- branch observada: `main`;
- HEAD observado antes das alterações locais 27.7.0/27.7.1: `11fd739b7824854890662d075f2e9c0311590b68`;
- alterações 27.7.0/27.7.1 permanecem locais e não commitadas;
- migration local mais recente: `0039_administrative_mfa.sql`;
- 0039: `LOCAL_VERIFIED`; ledger/schema atual de produção: `REMOTE_UNKNOWN / TO_VERIFY_IN_27_7_2`;
- MFA: implementação local pronta; `MFA_ENCRYPTION_KEY` em produção: `REMOTE_UNKNOWN / TO_VERIFY_IN_27_7_2`;
- não houve deploy, migration, secret, tag ou release durante 27.7.0/27.7.1.

Ausência de evidência remota atual não é tratada como falha nem sucesso. A 27.7.2 verificará o estado sem revelar secrets e aplicará somente o fluxo necessário.

## Entregas concluídas

- Fases 1–7 e Sprints 27.1–27.6;
- Analytics 2.0 e Automação Administrativa;
- sete jogos, CMS, Biblioteca, Gerador, Loader e modos FREE_PLAY/DAILY/EVENT;
- Core Platform, economia, coleções, Perfil 2.0 e Ranking Universal;
- PWA production-like, Quality gates e promoção manual vinculada ao SHA/artifact;
- Asset Pack v2 Waves 1–5 integradas; Wave 6 `POST_RELEASE`; Wave 7 `DONE` como auditoria/preparação de Store;
- 27.7.0 `DONE`; 27.7.1 `DONE localmente`; 27.7.2 `NEXT`.

## Conteúdo e proveniência

- Quiz: `PROVENANCE_RESOLVED`, com autoria interna, assistência de IA e curadoria humana; `Quiz.csv` preservado; 984 itens permanecem evidência operacional anterior a reconfirmar na 27.7.2;
- pacote oficial: 380 IDs únicos — Wordle 120, Timeline 40, Memória 40, Associação 60, Quem Sou Eu 60 e Três Pistas 60 — validado por schemas/contratos;
- revisão editorial humana final: `HUMAN_APPROVAL_REQUIRED`, sem impedir preparação técnica ou RC privada;
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

- `D1_BACKUP_ENCRYPTION_KEY`: `HISTORICAL_REMOTE_EVIDENCE` de provisionamento v1 e custódia externa; verificar estado atual na 27.7.2 sem revelar valor;
- restore remoto isolado com dataset sintético: comprovado; D1 descartável excluído; produção não restaurada;
- heartbeat persistido, monitor externo e alertas proativos: riscos aceitos/`POST_RELEASE`, não blockers internos;
- backup, reconciliador, verify-promotable/final, compare e rollback seguem gates obrigatórios.

## Jurídico e Google Play

- controlador, contato institucional, público-alvo adolescentes/adultos, ausência de controles infantis fictícios e ausência de exclusão automática por inatividade são decisões registradas;
- Termos/Privacidade, bases/prazos, adolescentes/acesso incidental, transferências e citações/licenças exigem `HUMAN_LEGAL_REVIEW_REQUIRED` antes do Go público;
- Google Play é `BLOCKED_EXTERNAL / FUTURE_PUBLICATION_PREPARATION` e não bloqueia RC web.

## Checklist operacional da 27.7.2

1. consolidar SHA candidato e executar Quality/PWA gates;
2. verificar `MFA_ENCRYPTION_KEY` e `D1_BACKUP_ENCRYPTION_KEY` sem expor valores;
3. produzir backup cifrado/checksum;
4. verificar ledger; aplicar 0039 somente se pendente; executar verify-final/compare;
5. confirmar contagens/elegibilidade 984/380;
6. promover exatamente o artifact validado e executar smoke operacional;
7. registrar evidências e rollback sem dados pessoais/secrets.

## Decisão atual

**Repositório internamente pronto para 27.7.2.** Ainda não existe autorização de release pública. Jurídico/editorial impedem `PUBLIC_RELEASE_GO`; Google Play permanece separado; produção depende da 27.7.2.
