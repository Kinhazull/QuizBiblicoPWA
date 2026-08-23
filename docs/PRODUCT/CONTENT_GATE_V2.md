# Content Gate v2 — baseline editorial congelada

**Data da verificação:** 22/08/2026  
**Estado:** `27.7.5C DONE / 27.7.5C.1 DONE / READY_FOR_27_7_5C_2`  
**Natureza:** auditoria read-only de produção e simulação local determinística

## Evidência operacional

- repositório e runtime: `3ce5397b013d28f86ff63709c5de12a2f8bab14c`;
- Quality `32604328519` e promoção `32604646554`: `SUCCESS`;
- D1 `quiz-biblico-db`: ledger 40/40, 70/70 estruturas essenciais, sem migration pendente;
- CMS: 5.485 `PUBLISHED`, zero `DRAFT`, `IN_REVIEW` ou `ARCHIVED`;
- Biblioteca: 5.485 projeções `AVAILABLE`, zero órfão, divergência de versão, reserva ativa ou conteúdo publicado não projetado.

## Baseline por jogo

| Jogo | CMS publicado | Biblioteca/AVAILABLE | Elegível FREE_PLAY/DAILY/EVENT | Unidade editorial | Estado |
|---|---:|---:|---:|---|---|
| Quiz | 984 | 984 | 984 | perguntas | `CONTENT_READY_V2` |
| Wordle | 1.201 | 1.201 | 1.200 | soluções válidas únicas | `CONTENT_READY_V2` |
| Linha do Tempo | 800 | 800 | 800 | sequências | `CONTENT_READY_V2` |
| Memória | 100 | 100 | 100 | 300 pares canônicos, compostos dinamicamente em partidas de 3 pares | `CONTENT_READY_V2` |
| Associação | 800 | 800 | 800 | conjuntos | `CONTENT_READY_V2` |
| Quem Sou Eu? | 800 | 800 | 800 | conjuntos | `CONTENT_READY_V2` |
| Três Pistas | 800 | 800 | 800 | conjuntos | `CONTENT_READY_V2` |

O registro Wordle adicional é `531dbe0d-1c19-4ec5-a88a-320f26229424`, “Átila”, versão 6. Ele está publicado e projetado, mas o Schema Registry o exclui corretamente da elegibilidade porque a dica está vazia. Não pertence às 1.200 soluções aprovadas, não entra no Gerador e deve ser tratado futuramente como higiene editorial, sem mutação nesta auditoria.

## Contrato do Gerador e antirrepetição

A política real é `ANTI_REPEAT_PARTIAL`:

- a Biblioteca prioriza `priority DESC`, menor `usage_count`, `last_used_at` mais antigo, publicação e ID;
- o Gerador respeita organização, jogo, disponibilidade, reservas, dificuldade e filtros editoriais;
- seleção com seed/`selection_key` é determinística e persistida de forma imutável;
- `FREE_PLAY` exclui os 20 conteúdos recentes do mesmo usuário/jogo e recua para o catálogo completo somente se faltar conteúdo;
- `DAILY` não possui histórico individual; usa chave determinística por organização, data e jogo;
- `EVENT` usa seleção reservada/persistida; reservas retiram conteúdo de `DAILY` e `FREE_PLAY`;
- não existe cooldown temporal explícito;
- `usage_count` e `last_used_at` são globais por organização; apenas a janela de `FREE_PLAY` é individual.

Conteúdo recentemente usado não deve vencer conteúdo nunca usado nas mesmas condições, salvo prioridade editorial superior ou filtro restritivo. `last_used_at` desempata a janela do Catálogo; o comparador final usa prioridade, uso, hash determinístico e ID.

## Simulação local

| Jogo | Únicos em 30 / 100 / 365 / 730 seleções | Primeira repetição | Repetição em 365 / 730 |
|---|---|---:|---:|
| Quiz (5 perguntas/partida) | 150 / 500 / 984 / 984 | seleção 197 | 46,08% / 73,04% das posições |
| Wordle | 30 / 100 / 365 / 730; 1.200/1.200 | seleção 1.201 | 0% / 0% |
| Linha do Tempo | 30 / 100 / 365 / 730 | seleção 801 | 0% / 0% |
| Memória | 30 / 100 / 100 / 100 | seleção 101 | 72,60% / 86,30% |
| Associação | 30 / 100 / 365 / 730 | seleção 801 | 0% / 0% |
| Quem Sou Eu? | 30 / 100 / 365 / 730 | seleção 801 | 0% / 0% |
| Três Pistas | 30 / 100 / 365 / 730 | seleção 801 | 0% / 0% |

A concentração depois de uma volta completa permanece proporcional: 10% no Wordle e aproximadamente 10,96% nos jogos de 800/100 itens; no Quiz chega a 10,85% por causa das cotas congeladas de dificuldade. Não foi detectada repetição precoce significativa que justifique alteração do Gerador antes da v2.

## 27.7.5C.1 — composição dinâmica da Memória

- cada seleção nova de Memória persiste três `content_items` elegíveis e deriva deterministicamente um par canônico de cada fonte;
- a partida continua contendo exatamente três pares/seis cartas e nunca mistura organizações, conteúdo indisponível ou pares duplicados;
- `FREE_PLAY` reutiliza a janela limitada já existente de 20 fontes recentes, sem materializar combinações nem criar histórico ilimitado;
- `DAILY` usa seed/chave determinística v2 por organização, dia e jogo; `EVENT` preserva reservas e imutabilidade;
- seleções históricas contendo um único `content_item` seguem pelo adaptador legado e permanecem exatamente reproduzíveis;
- a simulação determinística com 300 pares, nos horizontes 30/100/365/730/1.200, encontrou no máximo uma repetição completa e nenhuma repetição precoce material.

O espaço teórico continua `C(300,3) = 4.455.100`, mas o runtime não enumera nem persiste esse universo: seleciona somente três fontes por partida e grava apenas a seleção real.

## Amostragem e gates estruturais

- foram inspecionados 20 resumos produtivos por jogo, com ID, status, versão, referência, dificuldade e campos específicos preservados;
- a saúde produtiva confirmou zero seleção incompleta, zero resolução histórica ausente e zero participação travada;
- o encadeamento Biblioteca → Catálogo Elegível → Gerador → resolução histórica/payload seguro foi exercitado pelos testes focados sem escrita remota;
- não foram iniciadas partidas em produção, para não criar seleções ou participações durante uma auditoria read-only;
- os pacotes aprovados mantêm IDs/fingerprints únicos e passam pelos schemas reais; Wordle conserva 400 soluções de 5, 400 de 6 e 400 de 7 letras, únicas após normalização e separadas do léxico de tentativas;
- Quiz permanece congelado em 984 perguntas, com distribuição 393 `EASY`, 393 `MEDIUM` e 198 `HARD`;
- concentrações editoriais materiais observadas, sem quebra estrutural: Timeline 100% Eventos; Associação 95,5% Conceitos; Who Am I 94,75% Personagens; Wordle 69,36% Conceitos; Memória 76% Conceitos. São coerentes com a identidade atual dos jogos e devem orientar curadoria futura.

## Cenários de uso

As estimativas não são garantias, porque o uso global da organização e os filtros alteram a ordem. Em `DAILY`, uma partida/dia alcança a primeira volta após 100 dias na Memória, 196 dias no Quiz, 800 dias nos jogos de catálogo 800 e 1.200 dias no Wordle. Em `FREE_PLAY`, 2/5/10 partidas por dia aceleram esses horizontes proporcionalmente, com proteção individual apenas para as 20 partidas recentes.

## Decisão

Todos os sete jogos são `CONTENT_READY_V2`. O Content Gate geral e a composição dinâmica da Memória estão aprovados localmente. O registro Wordle “Átila” continua inelegível por dica vazia e, por não representar conteúdo bíblico inequívoco, a recomendação editorial é `UNPUBLISH` (sem mutação nesta sprint). O próximo passo é 27.7.5C.2; a validação manual ampla permanece em 27.7.5D.
