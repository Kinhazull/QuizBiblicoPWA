# Inventário de artefatos históricos e textos bíblicos

**Data:** 08/08/2026  
**Escopo:** arquivos históricos na raiz relacionados à construção do acervo do Quiz.

Atualização pós-27.6: textos integrais sem licença comprovada e seus derivados foram removidos da árvore ativa da v2, sem reescrita do histórico Git.

| Arquivo | Tamanho aproximado | Uso ativo/referências | Finalidade e reprodução | Licença/fonte encontrada | Recomendação |
| --- | ---: | --- | --- | --- | --- |
| `bible-acf.json` | 4,3 MB | nenhum consumidor ativo; scripts históricos apenas | fonte histórica bloqueada | redistribuição não comprovada | **REMOVIDO DA ÁRVORE ATIVA** |
| `bible-almeida.json` | 9,0 MB | nenhum consumidor ativo; script histórico apenas | conferência histórica | cadeia de licença/edição pendente | **REMOVIDO DA ÁRVORE ATIVA** |
| `Quiz.csv` | 198 KB | scripts históricos | fonte tabular das perguntas criadas para o projeto | origem interna declarada pelo proprietário; assistência de IA | **MANTER** |
| `quiz_audit.json` | 1,1 MB | sem consumidor ativo | preservava texto integral | risco herdado | **REMOVIDO DA ÁRVORE ATIVA** |
| `quiz_acf_reestruturado.json` | 1,0 MB | sem consumidor ativo | preservava texto integral | risco herdado | **REMOVIDO DA ÁRVORE ATIVA** |
| `quiz_acf_homologacao.json` | 1,5 MB | sem consumidor ativo | preservava texto integral | risco herdado | **REMOVIDO DA ÁRVORE ATIVA** |
| `quiz_acf_obpc_final.json` | 1,8 MB | sem consumidor ativo | preservava texto integral | risco herdado | **REMOVIDO DA ÁRVORE ATIVA** |
| `audit_quiz.py` | 9 KB | executável manual, sem workflow ativo | reproduz `quiz_audit.json` | código próprio; fontes de entrada pendem de licença | **MANTER junto ao arquivo histórico** |
| `reconstruct_quiz_acf.py` | 19 KB | executável manual, sem workflow ativo | reconstrói o acervo intermediário | código próprio; depende de ACF | **MANTER para reprodução** |
| `homologate_quiz_acf.py` | 5 KB | executável manual, sem workflow ativo | homologa o estágio reestruturado | código próprio | **MANTER para reprodução** |
| `resolve_obpc_caveats.py` | 5 KB | executável manual, sem workflow ativo | produz o resultado editorial histórico final | código próprio | **MANTER para reprodução** |

## Conclusões

- Nenhum desses arquivos é consumido diretamente pelos jogos em runtime.
- Os scripts permanecem como evidência histórica, marcados `HISTORICAL / NOT FOR RELEASE USE`; não integram workflow ou runtime e não devem ser executados sem fonte licenciada.
- A remoção atual não elimina blobs de commits históricos. Nenhuma decisão de purge foi tomada.
- O repositório não contém prova suficiente de licença para redistribuir os textos bíblicos completos.
- A decisão de manter os textos completos num repositório público exige validação humana/jurídica.
- Uma futura arquivação deve preservar cadeia de origem, hashes e instruções de reprodução; não deve reescrever o histórico Git sem causa jurídica ou de segurança.
