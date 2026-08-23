# Checklist humano de revisão bíblica e editorial

**Estado de release:** `SCALE_UP_APPROVED_AND_PUBLISHED / FINAL_STRATIFIED_SAMPLE_REQUIRED`.

Este checklist orienta a revisão; não representa parecer teológico ou jurídico automatizado. Itens desmarcados não foram presumidos como executados e não impedem a preparação técnica da 27.7.2, mas precisam de evidência antes do Go/No-Go público.

## Responsáveis e evidência

- [ ] identificar revisor bíblico/editorial responsável e data;
- [ ] registrar versão exata do pacote e IDs revisados;
- [ ] registrar decisão (`APROVADO`, `CORRIGIR`, `REJEITAR`) e justificativa curta;
- [ ] manter a evidência fora de payloads públicos quando contiver dados pessoais.

## Proveniência aprovada pelo proprietário

- [x] Quiz universal: conteúdo original criado para o projeto com assistência de IA; a rastreabilidade CSV→984 itens ainda não é 1:1;
- [x] base oficial de 380 itens: `ORIGINAL_PLATFORM_EDITORIAL_CONTENT`, `AI_ASSISTED`, `HUMAN_CURATED`;
- [x] textos bíblicos completos sem licença comprovada foram retirados da árvore ativa;
- [ ] decidir se o histórico Git requer purge e revisar citações específicas durante a amostragem.

## Amostra mínima pré-v2

- [ ] Quiz: amostra estratificada por dificuldade, tema e Antigo/Novo Testamento do acervo de 984 perguntas;
- [ ] Quiz: priorizar perguntas HARD, ambiguidades, resposta única e adequação das referências;
- [ ] revisar 100% dos conteúdos HARD alterados na Curadoria 25.7;
- [ ] Três Pistas: respostas únicas, progressão real das pistas e ausência de pistas equivalentes à resposta;
- [ ] Associação: relação A↔B inequívoca e referência capaz de sustentar todos os pares;
- [ ] Linha do Tempo: ordem narrativa claramente indicada quando não for datação histórica absoluta;
- [ ] Quem Sou Eu: dicas progressivas e sem revelação nominal precoce;
- [ ] Memória: pares semanticamente exclusivos dentro de cada conjunto;
- [ ] Wordle: palavra reconhecível, dica clara e referência pertinente, sem dependência da redação de tradução específica.
- [x] Expansão Wordle v2: 153 IDs de `content/wordle-expansion-v2.json` revisados e aprovados pelo proprietário em 2026-08-21;
- [x] Content Scale-Up v2: lotes Wordle e demais jogos revisados e aprovados pelo proprietário em 2026-08-22; aplicação reconciliada em 5.485 conteúdos publicados;
- [ ] conteúdo publicável da RC: registrar amostra final por jogo, dificuldade, categoria, tema e referência.

## Verificações por item

- [ ] referência existe e sustenta a afirmação/resposta;
- [ ] grafia e nomes bíblicos são consistentes em PT-BR;
- [ ] não há ambiguidade óbvia ou mais de uma resposta defensável;
- [ ] enunciado não depende de citação literal cuja licença não esteja comprovada;
- [ ] dificuldade é plausível para o público, sem reclassificação massiva automática;
- [ ] conteúdo não é fixture, recovery dataset, exemplo ou placeholder;
- [ ] observações doutrinárias são tratadas como tais e não como consenso histórico quando houver controvérsia.

## Assets

- [ ] cada asset indispensável tem origem, autor, licença/status e evidência;
- [ ] cada URL do Asset Registry usada no release pertence a host controlado/aprovado;
- [ ] nenhum asset `ACTIVE` depende apenas de texto livre não verificado como prova de licença;
- [ ] os 16 colecionáveis receberam decisão explícita de arte final ou adiamento de release;
- [ ] ícones PWA e identidade v001 correspondem aos arquivos aprovados.

## Aprovação

- [ ] nenhum item classificado `REPLACE_BEFORE_RELEASE` permanece sem decisão;
- [x] itens do Content Scale-Up v2 anteriormente `PENDING_HUMAN_REVIEW` foram aprovados e publicados; pendências jurídicas/assets continuam tratadas separadamente;
- [ ] resultado registrado no Go/No-Go da v2.
