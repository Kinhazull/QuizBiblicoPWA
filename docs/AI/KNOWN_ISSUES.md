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
| KI-010 | MFA administrativo | Alto | TOTP requer migration e segundo estágio de autenticação; planejar implementação dedicada antes da abertura pública de contas privilegiadas. |
| KI-011 | Canal de recuperação | Médio | Recuperação é segura por códigos locais, mas não há entrega por e-mail; documentar suporte e recuperação assistida antes da abertura pública. |

## Encerrados

- decisão e implementação do Ranking Universal;
- “migration 0037 pendente” como afirmação geral. O estado remoto agora é sempre obtido operacionalmente e a migration local mais recente é 0038.
