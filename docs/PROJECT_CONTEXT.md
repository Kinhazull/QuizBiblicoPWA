# Contexto permanente do projeto

## Produto

**Conte os Feitos** é uma plataforma cristã gratuita de Jogos e Desafios Bíblicos. O Quiz Bíblico é o primeiro módulo funcional, com evolução para jogos independentes dentro de uma experiência comum.

Jogos planejados:

- Quiz Bíblico
- Wordle Bíblico
- 3 Pistas
- Linha do Tempo
- Associação de Temas

O Show do Milhão foi removido permanentemente do escopo.

## Princípios de produto

- Experiência gratuita.
- Sem publicidade pesada.
- Retenção saudável, sem mecânicas predatórias.
- Linguagem cristã acessível.
- Conteúdo bíblico revisado por pessoas.
- Novos jogos possuem regras e persistência próprias.

## Progressão da plataforma

A plataforma possui XP global, nível global, moedas, estatísticas por jogo, Conquistas da plataforma, missões, eventos e recompensas.

As Medalhas continuam pertencendo ao domínio competitivo do Quiz e não são equivalentes às Conquistas.

## Invariantes arquiteturais

- O servidor concede recompensas.
- O cliente nunca concede XP, moedas ou recompensas persistentes.
- Estatísticas devem ser reconstruíveis a partir dos eventos canônicos.
- Mudanças arquiteturais exigem ADR ou decisão formal equivalente.
- `GAME_FINISHED` é o evento canônico de conclusão.
- Consumidores são versionados.
- O produtor grava o evento em transactional outbox na mesma transação da conclusão.
- Retry usa backoff exponencial, limite de cinco tentativas e dead letter.
- Processamento deve ser idempotente.
- Ordem oficial dos consumidores:
  1. `platform-statistics:1`
  2. `reward-progress:1`
  3. `platform-achievements:1`
  4. `platform-missions:1`

## Fundação implementada

- Progress Service
- Achievement Service
- Mission Service
- Event Engine
- Statistics Service
- Reward Service
- Transactional Outbox
- Dispatcher
- Mission Generator
- Mission Consumer
- Mission Claim
- Dead letter e retry
- Checkpoint de estatísticas por `(event_id, consumer_version)`

## Fluxo oficial

`main → feature branch → implementação e validações → commit → push → Pull Request → GitHub Actions → squash merge → exclusão da branch → pull da main`

## Papéis das ferramentas

### ChatGPT com GitHub

Contexto, planejamento, auditoria, documentação, arquitetura, revisão e preparação de sprints.

### Codex

Implementação local, lint, build, testes, investigação dependente do ambiente e mudanças complexas.

### GitHub Desktop

Sincronização entre cópia local e GitHub, branches, commits, push e pull.

Gemini CLI e Roo/Qwen não fazem parte do fluxo oficial atual.

## Restrição de contexto

Conversas de chat são temporárias e podem perder contexto. Este repositório é a memória operacional persistente do projeto. Informações importantes não devem existir somente no chat.
