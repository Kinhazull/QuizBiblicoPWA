# Inventário da superfície de sugestões com IA

**Estado funcional:** desativado.  
**Decisão de continuidade:** pendente para 24.3 ou posterior.

| Superfície | Classificação | Estado observado |
| --- | --- | --- |
| `shared/features.ts` — `AI_SUGGESTIONS_ENABLED` | **ACTIVE** | guard central ativo com valor `false` |
| `functions/api/admin/ai-suggestions.ts` | **DORMANT** | handlers preservados; retornam `feature_disabled` antes de chamar o provider |
| `/admin/perguntas/ia` | **REDIRECT** | redireciona para `/admin/perguntas` |
| `app/ai.css` | **DORMANT** | carregado pelo layout administrativo, mas sem tela acessível no menu |
| tabela `ai_question_suggestions` e índices da migration 0013 | **HISTORICAL/DORMANT** | preservados para auditoria ou possível reativação |
| binding `AI` e diagnóstico administrativo | **DORMANT** | configuração pode existir, mas não habilita o recurso |
| `docs/AI_SUGGESTIONS.md` | **HISTORICAL** | descreve o bloqueio e critérios anteriores |
| testes de regressão e segurança | **ACTIVE** | garantem que o recurso não seja exposto ou chamado enquanto desativado |

## Dependências e dados

- Não foi identificada dependência npm exclusiva da funcionalidade.
- O endpoint utiliza o binding Workers AI quando habilitado.
- O backup e a limpeza do piloto conhecem a tabela histórica.
- A exclusão definitiva exigiria decidir retenção dos registros e remover referências de diagnóstico, backup e testes.

## Decisão pendente

Escolher uma das opções, sem decisão implícita:

1. manter dormente com testes e custo de manutenção conhecido;
2. reativar com orçamento, limites, revisão humana e UX atualizada;
3. retirar a superfície executável e preservar somente histórico/dados necessários.

