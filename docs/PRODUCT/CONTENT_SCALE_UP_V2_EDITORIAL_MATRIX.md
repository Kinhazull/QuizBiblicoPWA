# Matriz Editorial v2 — Content Scale-Up

**Status:** FROZEN FOR PLANNING  
**Sprint:** 27.7.5B.1  
**Data:** 22/08/2026  
**Escopo:** sete jogos do CMS Universal

## Objetivo

Definir o contrato editorial que antecede a produção em escala para a v2.0.0. Esta matriz controla volume, diversidade, dificuldade, identidade entre jogos e qualidade dos lotes. Ela não altera schemas, conteúdo publicado, Gerador, Providers ou regras dos jogos.

O CMS Universal permanece a fonte da verdade. Conteúdo novo nasce como `DRAFT`, passa pelas validações comuns e específicas e exige revisão humana antes de publicação.

## Metas mínimas da v2

| Jogo | Unidade contabilizada | Meta mínima | Estado inicial conhecido |
|---|---|---:|---:|
| Quiz Bíblico | pergunta CMS publicada | 984 | 984 — preservar |
| Wordle Bíblico | solução CMS publicada e única | 1.200 | 120 oficiais + 153 aprovadas para importação |
| Linha do Tempo | sequência CMS publicada | 800 | aferir no inventário 27.7.5B.2 |
| Memória Bíblica | par canônico único publicado | 300 | aferir no inventário 27.7.5B.2 |
| Associação de Temas | conjunto CMS publicado | 800 | aferir no inventário 27.7.5B.2 |
| Quem Sou Eu? | conjunto CMS publicado | 800 | aferir no inventário 27.7.5B.2 |
| Jogo das 3 Pistas | conjunto CMS publicado | 800 | aferir no inventário 27.7.5B.2 |

As metas são mínimas. Contagens devem ser confirmadas em CMS, Biblioteca Universal e Catálogo Elegível após cada importação. Para Memória, repetir o mesmo par em conjuntos diferentes não aumenta a meta. Para os demais jogos, cópias ou variações meramente redacionais não contam como unidades novas.

## Distribuição transversal

Para conteúdos em que a classificação se aplica:

- Antigo Testamento: alvo de 55%;
- Novo Testamento: alvo de 45%;
- `EASY`: alvo de 30%;
- `MEDIUM`: alvo de 45%;
- `HARD`: alvo de 25%.

Os percentuais são faixas editoriais, não aritmética rígida. Cada lote e o catálogo acumulado devem ficar, preferencialmente, dentro de ±5 pontos percentuais. Exceções exigem justificativa no relatório do lote.

`HARD` mede profundidade, quantidade de pistas necessárias, relações menos imediatas ou sequência mais exigente. Não deve depender de grafia rara, detalhe irrelevante, tradução específica ou obscuridade gratuita.

## Wordle Bíblico

### Meta por comprimento

| Comprimento normalizado | Meta mínima |
|---|---:|
| 5 letras | 400 |
| 6 letras | 400 |
| 7 letras | 400 |

As soluções devem se distribuir entre personagens, lugares, povos, objetos, natureza, conceitos/temas e termos recorrentes no contexto bíblico. Nenhuma categoria deve dominar o catálogo por conveniência de geração.

Regras adicionais:

- solução jogável normalizada, sem espaço, hífen ou pontuação;
- acentos podem existir na forma editorial, mas a comparação jogável segue o contrato de normalização vigente;
- palavra reconhecível em português do Brasil e relevante ao contexto bíblico;
- dica inequívoca, natural e sem revelar a solução;
- referência coerente;
- **palavra aceita como tentativa não é automaticamente solução elegível**;
- o léxico de tentativas pode ser muito maior que as 1.200 soluções publicadas.

Familiaridade, relevância e comprimento compõem a dificuldade editorial. Palavras artificiais, abreviações e formas dependentes de uma tradução específica são recusadas.

## Linha do Tempo Bíblica

| Eixo | Alvo |
|---|---:|
| Eventos e acontecimentos | 35% |
| Vida de personagens | 20% |
| Reis e períodos históricos | 15% |
| Ministério de Jesus | 10% |
| Igreja apostólica e Atos | 10% |
| Profetas, exílio e restauração | 10% |

Cada conteúdo continua respeitando o schema atual de sequência. A ordem precisa ser bíblica ou narrativamente defensável. Cronologias discutíveis devem ser evitadas; quando a proposta for ordem narrativa, isso deve aparecer explicitamente no título ou descrição.

Combinação futura de eventos é oportunidade de escala do Gerador, não autorização para alterar arquitetura nesta etapa. Até decisão técnica posterior, a meta contabiliza sequências CMS completas.

## Memória Bíblica

A meta é de 300 pares canônicos únicos e combináveis, distribuídos entre personagem ↔ descrição; personagem ↔ acontecimento; livro ↔ característica; lugar ↔ acontecimento; objeto ↔ significado ou contexto; povo/grupo ↔ descrição; símbolo ↔ contexto; e evento ↔ referência ou resumo.

Cada lado deve ser curto, inequívoco e compreensível isoladamente. Relações vagas, reversíveis ou com múltiplas combinações igualmente corretas são recusadas. O mesmo par normalizado não pode ser contado novamente em outro conjunto.

## Associação de Temas

| Relação dominante | Quantidade aproximada |
|---|---:|
| Personagem ↔ acontecimento | 120 |
| Personagem ↔ característica | 100 |
| Lugar ↔ acontecimento | 100 |
| Livro ↔ tema ou característica | 90 |
| Objeto ↔ contexto | 90 |
| Povo/grupo ↔ descrição | 80 |
| Conceito ↔ exemplo ou contexto | 80 |
| Profeta ↔ mensagem ou evento | 70 |
| Outros | 70 |

Todos os pares do conjunto devem compartilhar uma proposta clara. Lados A e B precisam ser únicos dentro do conteúdo, e nenhuma alternativa pode admitir mais de uma associação defensável.

## Quem Sou Eu?

| Tipo | Alvo |
|---|---:|
| Personagens principais | 20% |
| Personagens secundários | 30% |
| Personagens menos conhecidos | 25% |
| Reis e governantes | 10% |
| Grupos ou povos identificáveis | 10% |
| Seres ou figuras especiais | 5% |

Profetas, apóstolos e discípulos são distribuídos nas categorias correspondentes, sem dupla contagem. As pistas seguem `ampla → intermediária → quase conclusiva`, nunca contêm a resposta normalizada e não podem ser tão vagas que muitas identidades satisfaçam o mesmo conjunto.

## Jogo das 3 Pistas

Para preservar identidade distinta de Quem Sou Eu?, personagens ficam limitados a 100 dos 800 conteúdos, ou 12,5%, e nunca podem ultrapassar 20% do catálogo acumulado.

| Tipo | Quantidade aproximada |
|---|---:|
| Lugares | 120 |
| Eventos | 120 |
| Objetos | 100 |
| Livros | 80 |
| Conceitos e temas | 100 |
| Povos e grupos | 70 |
| Símbolos | 60 |
| Natureza e animais | 50 |
| Personagens | 100 |

Cada desafio contém exatamente três pistas progressivas, resposta única e referência coerente. Nenhuma pista pode reproduzir a resposta normalizada ou depender de citação extensa.

## Regras comuns obrigatórias

1. **Resposta inequívoca:** não existem duas respostas igualmente defensáveis.
2. **Referência coerente:** a passagem sustenta diretamente o conteúdo.
3. **Português natural:** texto revisável, fluido e sem aparência de registro gerado.
4. **Paráfrase segura:** não reproduzir extensamente traduções bíblicas.
5. **Sem duplicidade semântica:** trocar palavras ou ordem não cria novo conteúdo.
6. **Distribuição controlada:** figuras extremamente conhecidas não dominam o acervo.
7. **Dificuldade justa:** profundidade sem pegadinha, grafia rara ou detalhe arbitrário.
8. **Adequação à mecânica:** validade bíblica não basta se a experiência do jogo for ruim.
9. **Rastreabilidade:** origem do lote, versão, revisão e decisão editorial ficam registradas.
10. **Isolamento organizacional:** importação, publicação e projeção respeitam `organizationId`.

## Controle de duplicidade

Cada lote deve produzir fingerprints normalizados antes da escrita:

- Wordle: solução normalizada;
- Memória e Associação: pares normalizados e independentes da ordem do conjunto;
- Linha do Tempo: sequência normalizada de eventos e proposta editorial;
- Quem Sou Eu e Três Pistas: resposta normalizada + conjunto normalizado de pistas;
- Quiz: permanece sob o contrato já revisado e não entra nesta produção.

O relatório separa duplicata exata, duplicata semântica provável e repetição justificada. Somente a primeira pode ser bloqueada automaticamente; sinais semânticos exigem decisão humana.

## Gate de cada lote

Nenhum lote pode ser aplicado sem:

1. geração determinística e identificação da origem;
2. validação do Schema Registry e do contrato editorial;
3. relatório de volume, Testamento, dificuldade, categoria e tema;
4. detector de resposta revelada, duplicidade e referência ausente;
5. amostra humana representativa por jogo e dificuldade;
6. dry-run sem escrita;
7. confirmação administrativa explícita;
8. importação idempotente e retomável em lotes;
9. publicação somente após aprovação humana;
10. reconciliação de contagens no CMS, Biblioteca e Catálogo Elegível;
11. teste de geração em `FREE_PLAY` e `DAILY` para o jogo afetado;
12. evidência de que Quiz e conteúdos anteriores não foram modificados.

## Plano incremental 27.7.5B

| Etapa | Entrega | Estado |
|---|---|---|
| 27.7.5B.1 | Matriz Editorial v2 | DONE localmente |
| 27.7.5B.2 | Inventário real, lacunas e plano de lotes | DONE localmente |
| 27.7.5B.3 | Escala Wordle até 1.200 soluções | CONTENT PRODUCED — lote 01 aprovado; lote restante de 877 candidatos aguarda revisão |
| 27.7.5B.4 | Escala Linha do Tempo e Memória | CONTENT PRODUCED — revisão conjunta pendente |
| 27.7.5B.5 | Escala Associação | CONTENT PRODUCED — revisão conjunta pendente |
| 27.7.5B.6 | Escala Quem Sou Eu e Três Pistas | CONTENT PRODUCED — revisão conjunta pendente |
| 27.7.5B.7 | Importação, publicação e reconciliação controladas | PLANNED |
| 27.7.5B.8 | Auditoria editorial final e freeze de conteúdo | PLANNED |

Como exceção expressa registrada em 22/08/2026, o proprietário autorizou a produção dos 877 candidatos Wordle restantes em lote único para revisão posterior. A exceção alcança apenas o tamanho do lote: revisão humana, dry-run, importação controlada e publicação continuam gates independentes e obrigatórios.

Na mesma data, o proprietário autorizou produzir em um lote conjunto os candidatos restantes dos outros cinco jogos para revisão posterior: 760 Timeline, 60 conteúdos de Memória com 180 pares, 740 Associação, 740 Quem Sou Eu? e 740 Três Pistas. Os 3.040 itens permanecem `PENDING_HUMAN_REVIEW`; a autorização de geração não constitui aprovação editorial nem autorização de escrita remota.

## Critérios de aceite da matriz

- metas e unidades de contagem são inequívocas;
- os sete jogos possuem identidade editorial própria;
- distribuição por Testamento e dificuldade está definida;
- Wordle separa léxico de tentativas de soluções CMS;
- Quem Sou Eu e Três Pistas não convergem para o mesmo catálogo;
- duplicidade e revisão humana têm gates explícitos;
- nenhuma alteração de conteúdo, schema, migration ou runtime foi realizada.
