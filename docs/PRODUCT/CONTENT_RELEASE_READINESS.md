# Content Release Readiness — v2.0

**Estado:** conhecido; tecnicamente pronto para validação humana final  
**Data:** 12/08/2026  
**Escopo:** conteúdo e assets distribuídos pela experiência v2

## Inventário publicável

| Superfície | Quantidade/forma | Estado | Decisão |
|---|---:|---|---|
| Quiz universal | 984 perguntas reportadas como publicadas | `APPROVED_INTERNAL` | conteúdo criado para a plataforma pelo proprietário com assistência de IA; validar amostra bíblica final |
| Base oficial dos outros seis jogos | 380 conteúdos versionados | `APPROVED_INTERNAL` | schemas e heurísticas aprovados; falta revisão bíblica humana direcionada |
| Wordle | 120 conteúdos dentro dos 380 | `APPROVED_INTERNAL` | respostas e tentativas vêm exclusivamente do CMS publicado da organização |
| Colecionáveis | 16 representações funcionais em emoji + 20 PNGs no pack | `REPLACE_BEFORE_RELEASE` até integração | 14 IDs possuem arquivo nominal exato; confirmar aliases de `frame-covenant` e `frame-royal`; quatro artes ficam reservadas |
| Memória | experiência textual | `POST_RELEASE_ONLY` para imagens | imagens não são requisito da v2 |
| Ícones PWA atuais | SVG/PNG internos | `FALLBACK` | permanecem ativos até adoção controlada da Brand v2 |
| Asset Pack v2 | 70 PNGs finais | `APPROVED_INTERNAL`, adoção pendente | Brand, jogos, recompensas, colecionáveis, Eventos, sistema, onboarding e Store auditados por hash/dimensão |
| Asset Registry/Eventos | metadados e URLs HTTPS | `PENDING_HUMAN_REVIEW` | v2 deve usar somente origem controlada e evidência revisada; não ampliar CSP genericamente |

## Resultado da revalidação automática

- 380 IDs únicos e quantidades oficiais preservadas;
- todos os 380 itens passam pelo Schema Registry real;
- referências bíblicas presentes;
- dificuldades `EASY`, `MEDIUM` e `HARD` presentes;
- respostas Wordle únicas, com cinco letras e sem acentos/espaços/pontuação;
- respostas de Quem Sou Eu/Três Pistas não aparecem literalmente nas dicas normalizadas;
- cronologias potencialmente discutíveis declaram ordem narrativa;
- associações não repetem nenhum dos lados dentro do conteúdo;
- nenhum marcador de fixture/recovery foi encontrado no pacote publicável.

Isso comprova integridade estrutural, não precisão teológica.

## Wordle atual

O endpoint valida uma tentativa consultando `content_items` da própria organização, com `game_type='wordle-biblico'` e `status='PUBLISHED'`. A lista de tentativas válidas é, portanto, o conjunto de palavras Wordle publicadas no CMS; `bible-acf.json` e `bible-almeida.json` não são lidos em runtime e não entram no bundle.

Conclusão: **não há blocker de licença de tradução bíblica no runtime atual do Wordle**. A limitação de vocabulário é funcional e fica para Wordle 2.0, com léxico PT-BR devidamente licenciado.

## Textos bíblicos completos

`bible-acf.json`, `bible-almeida.json` e quatro derivados que preservavam texto integral foram removidos da árvore ativa da v2. A ACF está `BLOCKED_FOR_REDISTRIBUTION`; Almeida permanece `PENDING_HUMAN_REVIEW`. Nenhum deles era servido, importado pelo runtime ou necessário ao pacote oficial.

Isso resolve o risco técnico de redistribuição pela árvore atual. Os blobs continuam no histórico Git; eventual purge exige decisão jurídica e operação dedicada.

## Proveniência dos acervos próprios

- as aproximadamente 984 perguntas foram criadas especificamente para o Conte os Feitos pelo proprietário com assistência de IA; a ausência de manifesto 1:1 entre o CSV histórico e o CMS é lacuna de rastreabilidade, não indício de origem externa;
- os 380 conteúdos oficiais são `ORIGINAL_PLATFORM_EDITORIAL_CONTENT`, `AI_ASSISTED` e `HUMAN_CURATED`;
- referências bíblicas e tokens ACF foram usados historicamente como apoio editorial/validação; a auditoria não encontrou reprodução exata de versículos completos no pacote de 380 itens.

## Blockers

### Técnicos

Nenhum novo blocker técnico foi encontrado. Não houve necessidade de modificar runtime, schemas, conteúdo ou banco. A autoria/proveniência interna está `PROVENANCE_RESOLVED`; a revisão bíblica/editorial final permanece `FINAL_EDITORIAL_REVIEW_REQUIRED` e deve ser evidenciada antes do Go/No-Go público, sem bloquear a preparação técnica da 27.7.2.

### Humanos/de publicação

1. concluir a amostragem bíblica descrita em `CONTENT_HUMAN_REVIEW_CHECKLIST.md`;
2. validar em aparelho real os 16 colecionáveis já integrados; aliases `frame-covenant`/`frame-royal` estão aprovados e emojis são apenas fallback;
3. validar Brand v2/PWA já integrada em aparelho Android físico;
4. revisar cada asset `ACTIVE` do Asset Registry e os hosts necessários antes de liberar a v2;
5. decidir juridicamente se os blobs históricos precisam de purge e se ACF/Almeida poderão ter qualquer uso futuro.

Esses itens mantêm o release em **NO-GO editorial/jurídico**, embora o runtime não dependa das traduções sem licença comprovada.

Os 8 avatares e 8 molduras funcionais estão integrados por derivados oficiais. Extras reservados não integram economia/grants; a validação física final permanece humana, não blocker interno de adoção.

## Separação da Fase 9

Bíblia completa, múltiplas traduções, Aurélio/alternativa lexical e Wordle 2.0 não são requisitos para lançar a v2. Eles permanecem evolução futura e só podem incorporar fontes cuja licença esteja documentada.
