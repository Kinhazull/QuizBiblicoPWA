# Inventário de artefatos históricos e textos bíblicos

**Data:** 08/08/2026  
**Escopo:** arquivos históricos na raiz relacionados à construção do acervo do Quiz.

Nenhum artefato deste inventário foi removido na Sprint 24.0.

| Arquivo | Tamanho aproximado | Uso ativo/referências | Finalidade e reprodução | Licença/fonte encontrada | Recomendação |
| --- | ---: | --- | --- | --- | --- |
| `bible-acf.json` | 4,3 MB | usado por `reconstruct_quiz_acf.py` e `scripts/generate-official-base-content.mjs` | fonte de referência para reconstrução histórica e geração editorial reproduzível | nenhuma licença de redistribuição encontrada no repositório | **MANTER + INVESTIGAR LICENÇA** |
| `bible-almeida.json` | 9,0 MB | usado somente por `audit_quiz.py` | conferência histórica do CSV original | identifica “Almeida Atualizada”, sem licença anexada | **ARQUIVAR + INVESTIGAR LICENÇA** |
| `Quiz.csv` | 198 KB | usado por `audit_quiz.py` e `reconstruct_quiz_acf.py` | fonte tabular histórica das perguntas iniciais | autoria/licença não formalizada no arquivo | **ARQUIVAR** |
| `quiz_audit.json` | 1,1 MB | saída de `audit_quiz.py`; sem consumidor atual | evidência de auditoria intermediária, regenerável | derivada das fontes acima | **ARQUIVAR** |
| `quiz_acf_reestruturado.json` | 1,0 MB | entrada de `homologate_quiz_acf.py`; saída de `reconstruct_quiz_acf.py` | estágio intermediário reproduzível | derivada de `Quiz.csv` e ACF | **ARQUIVAR** |
| `quiz_acf_homologacao.json` | 1,5 MB | entrada de `resolve_obpc_caveats.py`; saída de homologação | estágio editorial intermediário reproduzível | derivada das fontes anteriores | **ARQUIVAR** |
| `quiz_acf_obpc_final.json` | 1,8 MB | saída final do pipeline histórico; sem consumidor runtime encontrado | evidência anterior à migração para o CMS | derivada das fontes anteriores | **ARQUIVAR** |
| `audit_quiz.py` | 9 KB | executável manual, sem workflow ativo | reproduz `quiz_audit.json` | código próprio; fontes de entrada pendem de licença | **MANTER junto ao arquivo histórico** |
| `reconstruct_quiz_acf.py` | 19 KB | executável manual, sem workflow ativo | reconstrói o acervo intermediário | código próprio; depende de ACF | **MANTER para reprodução** |
| `homologate_quiz_acf.py` | 5 KB | executável manual, sem workflow ativo | homologa o estágio reestruturado | código próprio | **MANTER para reprodução** |
| `resolve_obpc_caveats.py` | 5 KB | executável manual, sem workflow ativo | produz o resultado editorial histórico final | código próprio | **MANTER para reprodução** |

## Conclusões

- Nenhum desses arquivos é consumido diretamente pelos jogos em runtime.
- `bible-acf.json` ainda participa de um gerador editorial versionado e não pode ser movido sem adaptar esse fluxo.
- Os JSONs intermediários são regeneráveis, mas preservam evidência editorial útil para a retirada do legado.
- O repositório não contém prova suficiente de licença para redistribuir os textos bíblicos completos.
- A decisão de manter os textos completos num repositório público exige validação humana/jurídica.
- Uma futura arquivação deve preservar cadeia de origem, hashes e instruções de reprodução; não deve reescrever o histórico Git sem causa jurídica ou de segurança.

