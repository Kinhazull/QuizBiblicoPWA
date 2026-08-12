# Problemas conhecidos

**Status:** CURRENT — somente riscos atuais ou validações pendentes.

| ID | Tema | Severidade | Estado / próximo passo |
|---|---|---|---|
| KI-001 | PWA e Android real | Release blocker externo | Validar instalação, atualização, background, retomada e aparelho físico. |
| KI-002 | Restore real | Release blocker técnico | Ensaiar backup/restore em D1 isolado e registrar RTO/RPO observados. |
| KI-003 | Jurídico e licenças | Release blocker humano | Confirmar textos, assets, privacidade de menores, termos e Data Safety. |
| KI-004 | Asset Registry × CSP | Alto | Definir hospedagem confiável e CSP sem dependência indefinida de URLs externas. |
| KI-005 | Legado exposto | Médio | Remover gradualmente apenas com telemetria, compatibilidade e rollback. |
| KI-006 | CI/release | Médio | Validar em execução real o novo gate manual por SHA/artefato e manter auto-deploy Git desativado. |
| KI-007 | Custo e retenção | Médio | Formalizar orçamento zero, limites, retenção e limpeza por domínio. |
| KI-008 | Alertas operacionais | Médio | Conectar os sinais existentes a um canal efetivamente monitorado. |
| KI-009 | Advisory transitivo temporário | Baixo | Revisar periodicamente `GHSA-mh99-v99m-4gvg`; manter exceção exclusiva até existir correção upstream compatível. |
| KI-010 | MFA administrativo | Alto | Implementado localmente na Sprint 27.1.1; provisionar `MFA_ENCRYPTION_KEY`, promover migration 0039 e validar operação antes da abertura pública. |
| KI-011 | Recuperação do owner | Médio | Recovery codes existem; perda simultânea de senha, TOTP e códigos do owner depende de procedimento operacional externo controlado. |
| KI-012 | Advisories transitivos de `image-size` | Baixo | `vinext` fixa `image-size@2.0.2`; a correção anunciada `2.0.3` ainda não foi publicada. Exceções restritas a `GHSA-w3rx-r6r6-pgpr` e `GHSA-5p2g-fcmc-qvqq`, somente para assets locais controlados no build, devem ser removidas assim que o upstream corrigir a cadeia. |

## Encerrados

- decisão e implementação do Ranking Universal;
- “migration 0037 pendente” como afirmação geral. O estado remoto agora é sempre obtido operacionalmente e a migration local mais recente é 0038.
