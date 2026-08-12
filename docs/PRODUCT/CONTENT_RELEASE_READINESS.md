# Content Release Readiness — v2.0

**Estado:** conhecido; tecnicamente pronto para validação humana final  
**Data:** 12/08/2026  
**Escopo:** conteúdo e assets distribuídos pela experiência v2

## Inventário publicável

| Superfície | Quantidade/forma | Estado | Decisão |
|---|---:|---|---|
| Quiz universal | 984 perguntas reportadas como publicadas | `PENDING_HUMAN_REVIEW` | validar amostra bíblica e a autoria/licença do acervo histórico antes da publicação |
| Base oficial dos outros seis jogos | 380 conteúdos versionados | `APPROVED_INTERNAL` | schemas e heurísticas aprovados; falta revisão bíblica humana direcionada |
| Wordle | 120 conteúdos dentro dos 380 | `APPROVED_INTERNAL` | respostas e tentativas vêm exclusivamente do CMS publicado da organização |
| Colecionáveis | 16 representações em emoji | `REPLACE_BEFORE_RELEASE` | funcionalmente completos, mas a arte está declarada como provisória |
| Memória | experiência textual | `POST_RELEASE_ONLY` para imagens | imagens não são requisito da v2 |
| Ícones PWA e identidade v001 | SVG/PNG internos | `APPROVED_INTERNAL` | tamanhos 192, 512 e 180 presentes; nenhum placeholder evidente |
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

`bible-acf.json` e `bible-almeida.json` são arquivos históricos/editoriais locais. Não há prova de licença de redistribuição anexada ao repositório. Eles não são servidos em `public/`, não são importados pelo runtime e não devem ser incluídos em release/artifacts públicos.

Status: `PENDING_HUMAN_REVIEW`. A existência dos arquivos não prova direito de redistribuição.

## Blockers

### Técnicos

Nenhum novo blocker técnico foi encontrado. Não houve necessidade de modificar runtime, schemas, conteúdo ou banco.

### Humanos/de publicação

1. comprovar autoria/licença do acervo histórico que originou as 984 perguntas do Quiz;
2. concluir a amostragem bíblica descrita em `CONTENT_HUMAN_REVIEW_CHECKLIST.md`;
3. decidir e aprovar arte final autoral/licenciada para os 16 colecionáveis;
4. revisar cada asset `ACTIVE` do Asset Registry e os hosts necessários antes de liberar a v2;
5. obter parecer humano/jurídico sobre textos completos mantidos no repositório e impedir sua distribuição acidental.

Esses itens mantêm o release em **NO-GO editorial/jurídico**, embora o runtime não dependa das traduções sem licença comprovada.

## Separação da Fase 9

Bíblia completa, múltiplas traduções, Aurélio/alternativa lexical e Wordle 2.0 não são requisitos para lançar a v2. Eles permanecem evolução futura e só podem incorporar fontes cuja licença esteja documentada.
