# Problemas conhecidos

**Status:** CURRENT — somente riscos atuais ou validações pendentes.

| ID | Tema | Severidade | Estado / próximo passo |
|---|---|---|---|
| KI-001 | Android real | Release blocker externo | SW/cache/offline/update passaram no runtime local production-like; executar checklist de instalação, background, lock/unlock e atualização em aparelho físico. |
| KI-003 | Jurídico e licenças | Release blocker humano | ACF/Almeida completas não entram no runtime, mas não possuem prova de redistribuição no repositório; confirmar também autoria/licença do acervo histórico, privacidade de menores, termos e Data Safety. |
| KI-004 | Asset Registry × CSP | Alto | Para a v2, aprovar somente hosts/assets controlados com proveniência; não ampliar CSP para URLs externas desconhecidas. |
| KI-014 | Arte dos colecionáveis | Release blocker humano/visual | Os 16 itens usam emoji provisório. Aprovar arte final autoral/licenciada e acessível ou decidir conscientemente adiar a release. |
| KI-005 | Legado preservado | Médio | Jornada/Medalhas e Analytics antigo redirecionam para superfícies modernas; APIs/dados históricos e perfil público legado permanecem até prova de não uso ou decisão de produto. |
| KI-006 | CI/release | Médio | Validar em execução real o novo gate manual por SHA/artefato e manter auto-deploy Git desativado. |
| KI-007 | Custo e retenção | Médio | Política e contrato existem; proprietário deve preencher quotas/consumo reais e aprovar retenção antes de automatizar limpeza. |
| KI-008 | Alertas e heartbeat | Médio | Health/logs detectam falhas, mas não há heartbeat persistido do Cron nem canal externo proativo; decidir mecanismo de custo zero antes da abertura. |
| KI-009 | Advisory transitivo temporário | Baixo | Revisar periodicamente `GHSA-mh99-v99m-4gvg`; manter exceção exclusiva até existir correção upstream compatível. |
| KI-010 | MFA administrativo | Alto | Implementado localmente na Sprint 27.1.1; provisionar `MFA_ENCRYPTION_KEY`, promover migration 0039 e validar operação antes da abertura pública. |
| KI-011 | Recuperação do owner | Médio | Recovery codes existem; perda simultânea de senha, TOTP e códigos do owner depende de procedimento operacional externo controlado. |
| KI-012 | Advisories transitivos de `image-size` | Baixo | `vinext` fixa `image-size@2.0.2`; a correção anunciada `2.0.3` ainda não foi publicada. Exceções restritas a `GHSA-w3rx-r6r6-pgpr` e `GHSA-5p2g-fcmc-qvqq`, somente para assets locais controlados no build, devem ser removidas assim que o upstream corrigir a cadeia. |

## Encerrados

- decisão e implementação do Ranking Universal;
- “migration 0037 pendente” como afirmação geral. O estado remoto agora é sempre obtido operacionalmente e a migration local mais recente é 0038.
- KI-002: restore remoto comprovado em D1 isolado e descartável com dataset sintético; produção não foi restaurada;
- KI-013: `D1_BACKUP_ENCRYPTION_KEY` v1 provisionada no Environment `production` e custodiada externamente.
