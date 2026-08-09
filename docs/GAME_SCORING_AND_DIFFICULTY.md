# Scoring, Dificuldade e Repetição

## Pontuação

- Quiz: 100 pontos por resposta correta; resposta incorreta ou timeout vale zero.
- Wordle: 600 a 100 pontos conforme 1 a 6 tentativas; derrota vale zero.
- Linha do Tempo: pontuação decrescente por tentativa; somente sequência correta pontua.
- Memória: pontuação considera pares e número de jogadas; ações sem mérito não concedem pontos.
- Associação: pares válidos compõem a pontuação; erros não pontuam e o terceiro encerra a partida.
- Quem Sou Eu?: cada personagem vale mais quando identificado com menos pistas (500 a 100 no contrato atual).
- Três Pistas: cada desafio vale 300, 200 ou 100 pontos conforme pistas utilizadas.

O servidor permanece como autoridade. `sessionId`, participação e ledger determinísticos impedem dupla concessão por refresh, replay ou concorrência.

## Dificuldade por jogo

| Jogo | EASY | MEDIUM | HARD |
|---|---|---|---|
| Quiz | enunciado direto | relação e contexto | detalhe, inferência e distratores próximos |
| Wordle | palavra familiar/dica direta | familiaridade intermediária | termo menos frequente, ainda natural em português |
| Timeline | eventos distintos | eventos próximos | sequência narrativa ou temporal sutil |
| Memória | pares muito distintos | relações contextuais | pares semanticamente próximos |
| Associação | relações diretas | alternativas relacionadas | distratores plausíveis e próximos |
| Quem Sou Eu? | pistas reconhecíveis cedo | pistas contextuais | pistas iniciais específicas e indiretas |
| Três Pistas | pistas concretas | combinação de contexto | pistas abstratas sem ambiguidade |

## Política de repetição

- FREE_PLAY exclui os últimos 20 conteúdos usados pelo usuário e jogo, quando o catálogo comporta a seleção.
- Se a exclusão tornar o catálogo insuficiente, o gerador repete a seleção sem a janela recente; nunca mistura fontes nem reduz o tamanho contratado.
- DAILY é determinístico por organização, data local, jogo e versão do algoritmo.
- EVENT utiliza exclusivamente o conteúdo reservado pelo evento.
- Métricas existentes: `usage_count`, `last_used_at`, `last_used_mode` e diagnóstico administrativo do catálogo/geração.

Não se exige ausência absoluta de repetição: catálogos pequenos usam fallback controlado e observável.
