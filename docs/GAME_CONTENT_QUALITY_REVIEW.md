# Revisão de Qualidade do Conteúdo dos Jogos

Relatório heurístico sobre `content/official-base-content-v1.json`. Alertas editoriais são recomendações humanas e não bloqueiam build; violações de schema continuam bloqueadoras.

## Inventário

| Jogo | Total | EASY | MEDIUM | HARD | Principal observação |
|---|---:|---:|---:|---:|---|
| Wordle | 120 | 48 | 48 | 24 | Revisar familiaridade em dispositivo real, preservando cinco letras e léxico validado |
| Linha do Tempo | 40 | 10 | 20 | 10 | Conteúdos narrativos devem se declarar como ordem narrativa |
| Memória | 40 | 16 | 16 | 8 | 26/40 conjuntos usam categoria Personagens; ampliar diversidade em futura curadoria |
| Associação | 60 | 24 | 24 | 12 | 39/60 em Personagens; risco de relações repetitivas ou semanticamente genéricas |
| Quem Sou Eu? | 60 | 24 | 24 | 12 | Concentração em Personagens é intencional e coerente com a identidade |
| Três Pistas | 60 | 24 | 24 | 12 | 39/60 em Personagens conflita parcialmente com a identidade ampla do jogo |

Total: 380 conteúdos. O Quiz universal (984 perguntas) não foi modificado nem incluído neste pacote.

## Alertas para revisão humana

1. Prioridade alta: diversificar Três Pistas com lugares, objetos, eventos, milagres, livros e conceitos.
2. Prioridade alta: revisar Associações em que uma referência isolada não representa todos os pares.
3. Prioridade média: substituir títulos técnicos numerados por tema/categoria editorial na próxima revisão do pacote; a UI já oculta o padrão técnico conhecido.
4. Prioridade média: revisar proximidade semântica dos pares em Memória e Associação para evitar múltiplas interpretações.
5. Prioridade média: confirmar que cronologias discutíveis declaram “ordem narrativa”.
6. Prioridade contínua: comparar dificuldade declarada com comportamento real por telemetria agregada, sem reclassificação massiva nesta sprint.

## Heurísticas recomendadas

- resposta normalizada não aparece literalmente nas pistas;
- títulos não terminam em identificador puramente numérico;
- lados A e B são únicos dentro de Associação;
- referências representam o conjunto ou são omitidas/compactadas;
- repetição de respostas é aceita apenas quando a abordagem editorial é diferente;
- Três Pistas não deve voltar a ser um segundo Quem Sou Eu?.
