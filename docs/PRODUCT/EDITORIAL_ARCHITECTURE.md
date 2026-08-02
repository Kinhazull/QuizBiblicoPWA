# Arquitetura Editorial do CMS Universal

Status: Oficial  
Versão: 1.0  
Escopo: sete jogos publicados pela plataforma

## Objetivo

Este documento define o contrato editorial comum do CMS Universal. O CMS continua sendo a fonte da verdade; Biblioteca Universal, Catálogo Elegível, Gerador, Providers, Lifecycle e Game Loader apenas consomem o conteúdo resultante e não são alterados por este contrato.

## Fontes canônicas

- `shared/content/editorial-taxonomy.ts`: dificuldades, grandes áreas bíblicas, categorias e temas oficiais.
- `shared/content/editorial-contracts.ts`: contrato editorial dos sete jogos.
- `shared/content/editorial-validation.ts`: validação e normalização dos metadados comuns.
- `shared/content/schemas/*.ts`: campos e regras específicas de cada jogo.
- `shared/content/registry.ts`: registro único dos schemas específicos.

## Taxonomia

### Dificuldades

`VERY_EASY`, `EASY`, `MEDIUM`, `HARD` e `SPECIAL` são valores fechados e persistidos. Não são aceitos aliases na camada universal. Adaptadores de fontes legadas são responsáveis pela conversão.

### Grandes áreas bíblicas

Pentateuco; Livros Históricos; Poesia e Sabedoria; Profetas Maiores; Profetas Menores; Evangelhos; Atos dos Apóstolos; Cartas Paulinas; Cartas Gerais; Apocalipse.

### Categorias e temas

As listas oficiais orientam novos cadastros e promovem consistência. Elas usam a política `OPEN_COMPATIBLE`: valores históricos fora dessas listas continuam válidos. Essa decisão preserva integralmente as perguntas publicadas e permite evolução editorial sem reescrever conteúdo existente.

Categorias oficiais: Personagens, Lugares, Eventos, Livros, Versículos, Milagres, Parábolas, Ensinamentos, Profecias, Símbolos, Conceitos, Reis, Profetas, Atos, Antigo Testamento e Novo Testamento.

Temas oficiais: Criação, Aliança, Fé, Graça, Salvação, Obediência, Oração, Sabedoria, Justiça, Amor, Esperança, Reino de Deus, Espírito Santo e Missão.

## Contrato comum

Todo conteúdo possui os metadados compartilhados já definidos pelo `SharedContentMetadata`. Para publicação, categoria, dificuldade, referência bíblica e tags participam do contrato editorial. Referência bíblica continua obrigatória para `PUBLISHED` e opcional durante a elaboração de um `DRAFT`.

Categoria, tags e fontes temáticas são texto editorial aberto e normalizado por NFKC, remoção de espaços externos e compactação de espaços repetidos. A dificuldade é um valor canônico fechado.

## Contratos dos jogos

| Jogo | Unidade editorial | Payload específico | Fontes temáticas |
|---|---|---|---|
| Quiz | Pergunta | prompt, choices, book, theme, explanation | theme, categoria, tags |
| Wordle | Palavra | word, hint | categoria, tags |
| Memória | Conjunto | title, pairs | categoria, tags |
| Linha do Tempo | Conjunto | title, events | categoria, tags |
| Associação | Conjunto | title, pairs | categoria, tags |
| Quem Sou Eu | Conjunto | title, challenges | categoria, tags |
| Três Pistas | Conjunto | title, challenges | categoria, tags |

O mapa executável `EDITORIAL_CONTRACTS` deve conter exatamente os mesmos sete `GameType` do Schema Registry. Os campos de payload do contrato devem permanecer alinhados aos campos do respectivo schema.

## Validação

```mermaid
flowchart LR
  Input["Entrada editorial"] --> Common["Validação comum de metadados"]
  Common --> Schema["Schema Registry"]
  Schema --> Specific["Validação específica do jogo"]
  Specific --> Result["Modelo normalizado ou erros por campo"]
```

A validação comum não conhece regras específicas de jogo. Cada schema mantém apenas regras de seu payload, como quantidade de alternativas, posições cronológicas ou duplicidade de respostas. A função pública `validateContent` compõe ambas as camadas e permanece o ponto único usado pelo CMS e pelo Catálogo Elegível.

## Compatibilidade

- Nenhum conteúdo é regravado por esta arquitetura.
- Nenhuma migration é necessária.
- Categorias, temas e tags históricas não se tornam inválidas por não constarem na taxonomia recomendada.
- As dificuldades universais persistidas permanecem inalteradas.
- O adaptador legado do Quiz continua convertendo `easy`, `medium` e `hard` para os valores universais.
- Os sete schemas e seus payloads permanecem inalterados.

## Evolução

Novos jogos devem, na mesma alteração, registrar seu `GameType`, schema específico e contrato editorial. Uma eventual decisão futura de fechar categorias ou temas exige versionamento explícito do contrato, análise do acervo e estratégia de migração; não pode ser aplicada implicitamente pela validação.
