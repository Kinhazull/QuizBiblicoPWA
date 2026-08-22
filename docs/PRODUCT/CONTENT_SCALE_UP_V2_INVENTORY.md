# Inventário e lacunas — Content Scale-Up v2

**Status:** CURRENT LOCAL INVENTORY  
**Sprint:** 27.7.5B.2  
**Gerado deterministicamente de:** `Quiz.csv`, `content/official-base-content-v1.json`, `content/wordle-expansion-v2.json`, `content/wordle-scale-up-v2-lot-01.json`, `content/wordle-scale-up-v2-remaining.json`, `content/content-scale-up-v2-remaining-games.json`

## Limite da evidência

Este relatório mede somente fontes versionadas. Ele não consulta produção e não afirma que o pacote Wordle v2 já foi importado. Para Quiz, usa a última baseline operacional verificada de 984 publicados; o CSV autoral possui 1000 linhas, mas não substitui a contagem CMS.

## Resumo das lacunas

| Jogo | Unidade | Inventário contabilizável | Meta | Lacuna |
|---|---|---:|---:|---:|
| Quiz Bíblico | perguntas publicadas | 984 | 984 | 0 |
| Wordle Bíblico | soluções únicas | 323 | 1200 | 877 |
| Linha do Tempo | sequências CMS | 40 | 800 | 760 |
| Memória Bíblica | pares canônicos únicos | 120 | 300 | 180 |
| Associação | conjuntos CMS | 60 | 800 | 740 |
| Quem Sou Eu? | conjuntos CMS | 60 | 800 | 740 |
| Três Pistas | conjuntos CMS | 60 | 800 | 740 |

## Projeção do lote conjunto pendente

O arquivo `content/content-scale-up-v2-remaining-games.json` contém 3040 candidatos em estado `PENDING_HUMAN_REVIEW`. Ele não integra o inventário contabilizável acima até aprovação humana, dry-run e importação controlada.

| Jogo | Conteúdos candidatos | Unidades canônicas projetadas após aprovação |
|---|---:|---:|
| Linha do Tempo | 760 | 800 |
| Memória | 60 | 300 pares |
| Associação | 740 | 800 |
| Quem Sou Eu? | 740 | 800 |
| Três Pistas | 740 | 800 |

Validade de schema e unicidade de conjunto não substituem revisão editorial. Em Quem Sou Eu? e Três Pistas, o lote combina desafios autorais existentes em novos conjuntos; repetição, progressão e identidade entre jogos exigem atenção humana explícita.

## Wordle

- pacote oficial: 120 soluções;
- expansão v2 aprovada: 153 soluções;
- lote 01 aprovado pelo proprietário: 50 soluções;
- total local único: 323;
- duplicatas exatas entre os pacotes aprovados: 0;
- comprimentos: 5 letras 220; 6 letras 50; 7 letras 53;
- lacunas para 400 por comprimento: 5 letras 180; 6 letras 350; 7 letras 347.
- lote único restante pendente de revisão: 877 candidatos;
- projeção somente após aprovação humana: 1200 soluções únicas — {"5":400,"6":400,"7":400}.
- dificuldade: EASY: 120 (37.2%); HARD: 69 (21.4%); MEDIUM: 134 (41.5%).
- Testamento: Antigo Testamento: 222 (68.7%); Novo Testamento: 101 (31.3%).
- categoria: Alimentos: 4 (1.2%); Animais: 8 (2.5%); Conceitos: 91 (28.2%); Eventos: 2 (0.6%); Igreja: 3 (0.9%); Livros: 2 (0.6%); Lugares: 29 (9.0%); Natureza: 11 (3.4%); Objetos: 73 (22.6%); Personagens: 76 (23.5%); Pessoas: 10 (3.1%); Povos: 6 (1.9%); Títulos: 8 (2.5%).

Prioridade editorial: ampliar Novo Testamento e elevar proporcionalmente MEDIUM/HARD, sem usar obscuridade artificial.

## Linha do Tempo

- 40 conteúdos e 120 ocorrências de eventos;
- 60 títulos de eventos únicos;
- 0 sequências exatas duplicadas;
- dificuldade: EASY: 10 (25.0%); HARD: 10 (25.0%); MEDIUM: 20 (50.0%).
- Testamento: Antigo Testamento: 28 (70.0%); Novo Testamento: 12 (30.0%).
- categoria: Eventos: 40 (100.0%).

Prioridade editorial: Novo Testamento, ministério de Jesus, Atos e variedade real de sequências; não inflar a meta repetindo os mesmos eventos.

## Memória e Associação

- Memória: 40 conjuntos, 120 pares e 120 pares canônicos únicos;
- Associação: 60 conjuntos, 180 pares e 180 pares únicos;
- pares de Memória também presentes em Associação: 120;
- duplicatas exatas de conjuntos: Memória 0; Associação 0.
- Memória — dificuldade: EASY: 16 (40.0%); HARD: 8 (20.0%); MEDIUM: 16 (40.0%).
- Memória — Testamento: Antigo Testamento: 24 (60.0%); Novo Testamento: 16 (40.0%).
- Memória — categoria: Conceitos: 16 (40.0%); Ensinamentos: 2 (5.0%); Eventos: 2 (5.0%); Livros: 2 (5.0%); Lugares: 2 (5.0%); Objetos: 2 (5.0%); Parábolas: 2 (5.0%); Personagens: 12 (30.0%).
- Associação — dificuldade: EASY: 24 (40.0%); HARD: 12 (20.0%); MEDIUM: 24 (40.0%).
- Associação — Testamento: Antigo Testamento: 36 (60.0%); Novo Testamento: 24 (40.0%).
- Associação — categoria: Conceitos: 24 (40.0%); Ensinamentos: 3 (5.0%); Eventos: 3 (5.0%); Livros: 3 (5.0%); Lugares: 3 (5.0%); Objetos: 3 (5.0%); Parábolas: 3 (5.0%); Personagens: 18 (30.0%).

Prioridade editorial: Memória deve privilegiar pares curtos e visualmente combináveis; Associação deve ampliar relações conceituais, livros, lugares, povos, objetos e profetas. Sobreposição existente não é erro de schema, mas não deve orientar os novos lotes.

## Quem Sou Eu? e Três Pistas

- cada jogo possui 60 conjuntos e 180 desafios;
- respostas únicas: Quem Sou Eu? 60; Três Pistas 60;
- desafios idênticos compartilhados: 20;
- respostas únicas compartilhadas: 20;
- duplicatas exatas internas de conjuntos: Quem Sou Eu? 0; Três Pistas 0.
- Quem Sou Eu? — dificuldade: EASY: 24 (40.0%); HARD: 12 (20.0%); MEDIUM: 24 (40.0%).
- Quem Sou Eu? — Testamento: Antigo Testamento: 36 (60.0%); Novo Testamento: 24 (40.0%).
- Quem Sou Eu? — categoria: Conceitos: 24 (40.0%); Ensinamentos: 3 (5.0%); Eventos: 3 (5.0%); Livros: 3 (5.0%); Lugares: 3 (5.0%); Objetos: 3 (5.0%); Parábolas: 3 (5.0%); Personagens: 18 (30.0%).
- Três Pistas — dificuldade: EASY: 24 (40.0%); HARD: 12 (20.0%); MEDIUM: 24 (40.0%).
- Três Pistas — Testamento: Antigo Testamento: 36 (60.0%); Novo Testamento: 24 (40.0%).
- Três Pistas — categoria: Conceitos: 24 (40.0%); Ensinamentos: 3 (5.0%); Eventos: 3 (5.0%); Livros: 3 (5.0%); Lugares: 3 (5.0%); Objetos: 3 (5.0%); Parábolas: 3 (5.0%); Personagens: 18 (30.0%).

Conclusão: o pacote inicial usa os dois jogos quase como espelhos. Os novos lotes devem corrigir a identidade prospectivamente: Quem Sou Eu? focado em identidades; Três Pistas com personagens limitados e predominância de lugares, eventos, objetos, livros, conceitos, povos, símbolos e natureza.

## Plano de lotes

| Frente | Lacuna | Tamanho máximo sugerido | Quantidade estimada |
|---|---:|---:|---:|
| Wordle | 877 soluções | lote único excepcional autorizado | 1 lote pendente de revisão |
| Linha do Tempo | 760 sequências | 50 conteúdos | 16 lotes |
| Memória | 180 pares | 30 pares | 6 lotes |
| Associação | 740 conjuntos | 50 conteúdos | 15 lotes |
| Quem Sou Eu? | 740 conjuntos | 50 conteúdos | 15 lotes |
| Três Pistas | 740 conjuntos | 50 conteúdos | 15 lotes |

Para Wordle, o proprietário autorizou excepcionalmente um lote único dos 877 candidatos restantes. Nos demais jogos permanece a recomendação de lotes pequenos. Em todos os casos, revisão, dry-run, aprovação e publicação são gates independentes; nada é publicado automaticamente.

## Ordem recomendada

1. Wordle por comprimento: preencher 5 letras, depois 6 e 7, equilibrando Testamentos e dificuldade.
2. Memória: completar 180 pares canônicos com baixa ambiguidade e alta combinabilidade.
3. Linha do Tempo: ampliar eixos sub-representados sem cronologias controversas.
4. Associação: diversificar relações antes de aumentar personagens.
5. Quem Sou Eu?: produzir identidades sem replicar o catálogo inicial.
6. Três Pistas: iniciar por não personagens para romper imediatamente a sobreposição histórica.

## Critério para iniciar produção

- matriz editorial aprovada;
- inventário determinístico verde;
- unidade canônica e fingerprint definidos;
- lote limitado conforme este plano;
- nenhuma escrita ou publicação antes de dry-run e aprovação humana.
