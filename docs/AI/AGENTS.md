# AGENTS.md — Regras obrigatórias para assistentes

## Fonte de verdade

Em caso de conflito:

1. código e migrations da branch atual;
2. decisões formais de arquitetura e produto;
3. `CURRENT_STATE.md`;
4. documentação técnica específica;
5. roadmap;
6. conversa ou memória do assistente.

## Regras permanentes

- Não trabalhar diretamente na `main`.
- Não fazer deploy, merge, push, migration remota ou alteração de dados reais sem autorização explícita.
- Não ampliar escopo por iniciativa própria.
- Não remover testes ou proteções para fazer algo passar.
- O servidor é a fonte da verdade para valores persistentes.
- O cliente nunca concede XP, moedas, pontuação ou recompensas persistentes.
- Jornadas, Ranking e Medalhas pertencem exclusivamente ao Quiz Bíblico.
- Conquistas da plataforma são separadas das Medalhas do Quiz.
- Mudanças arquiteturais exigem decisão formal.
- Conteúdo bíblico sugerido por IA entra como rascunho e exige revisão humana.
- Toda tarefa deve declarar objetivo, escopo, riscos, critérios de aceite e validações.

## Economia de contexto e cota

- Não pedir para uma IA “ler o projeto inteiro”.
- Não usar Codex para planejamento, documentação ou pré-análise.
- Não reler arquivos já resumidos pelo CF-POS sem necessidade.
- Usar termos de busca e pontos de entrada do `PROJECT_INDEX.md`.
- Separar investigação, planejamento, implementação e revisão.

## Encerramento obrigatório

Ao concluir uma sprint ou decisão relevante:

- atualizar `CURRENT_STATE.md`;
- atualizar `HISTORY/`;
- atualizar `KNOWN_ISSUES.md` quando aplicável;
- atualizar `PROJECT_INDEX.md` quando novos pontos de entrada surgirem;
- registrar decisão formal quando houver impacto de arquitetura ou processo.
