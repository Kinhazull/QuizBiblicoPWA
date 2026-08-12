# Checklist humano de revisão bíblica e editorial

Este checklist orienta a revisão; não representa parecer teológico ou jurídico automatizado.

## Responsáveis e evidência

- [ ] identificar revisor bíblico/editorial responsável e data;
- [ ] registrar versão exata do pacote e IDs revisados;
- [ ] registrar decisão (`APROVADO`, `CORRIGIR`, `REJEITAR`) e justificativa curta;
- [ ] manter a evidência fora de payloads públicos quando contiver dados pessoais.

## Amostra mínima pré-v2

- [ ] Quiz: amostra estratificada por dificuldade, tema e Antigo/Novo Testamento do acervo de 984 perguntas;
- [ ] revisar 100% dos conteúdos HARD alterados na Curadoria 25.7;
- [ ] Três Pistas: respostas únicas, progressão real das pistas e ausência de pistas equivalentes à resposta;
- [ ] Associação: relação A↔B inequívoca e referência capaz de sustentar todos os pares;
- [ ] Linha do Tempo: ordem narrativa claramente indicada quando não for datação histórica absoluta;
- [ ] Quem Sou Eu: dicas progressivas e sem revelação nominal precoce;
- [ ] Memória: pares semanticamente exclusivos dentro de cada conjunto;
- [ ] Wordle: palavra reconhecível, dica clara e referência pertinente, sem dependência da redação de tradução específica.

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
- [ ] itens `PENDING_HUMAN_REVIEW` relevantes à distribuição foram aprovados ou excluídos do artifact;
- [ ] resultado registrado no Go/No-Go da v2.
