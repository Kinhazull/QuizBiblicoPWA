# Contexto permanente do projeto

## Produto

**Conte os Feitos** é uma plataforma cristã modular de Jogos e Desafios Bíblicos.

O **Quiz Bíblico** é o primeiro módulo funcional. A plataforma evolui para comportar jogos independentes dentro de uma experiência comum.

Jogos planejados:

- Quiz Bíblico
- Wordle Bíblico
- Jogo das 3 Pistas
- Linha do Tempo
- Associação de Temas

O Show do Milhão foi removido do escopo.

## Princípios

- experiência gratuita;
- sem publicidade pesada;
- retenção saudável;
- linguagem cristã acessível;
- conteúdo bíblico revisado por pessoas;
- regras e persistência próprias por jogo;
- servidor como fonte de verdade;
- evolução modular sem enfraquecer o Quiz.

## Progressão geral

A plataforma pode utilizar:

- XP global;
- nível global;
- moedas;
- estatísticas por jogo;
- Conquistas;
- missões;
- eventos;
- recompensas;
- desbloqueáveis.

Medalhas continuam pertencendo ao domínio competitivo do Quiz.

## Arquitetura conhecida

- frontend/PWA;
- Cloudflare Pages;
- Pages Functions;
- Cloudflare D1;
- Worker separado;
- GitHub Actions;
- migrations versionadas;
- serviços de domínio;
- transactional outbox;
- processamento assíncrono idempotente.

## Fluxo Git

`main → feature branch → implementação → validações → commit → push → PR → CI → revisão → squash merge → exclusão da branch → pull da main`

## Ferramentas oficiais

### ChatGPT

- planejamento;
- arquitetura;
- auditoria;
- documentação;
- revisão;
- preparação de prompts;
- continuidade entre conversas.

### Codex

- implementação;
- testes;
- build;
- debug;
- refatoração;
- investigação dependente do ambiente local.

### Usuário

- aprova decisões;
- executa ações humanas;
- autoriza push, merge, deploy e migrations;
- valida comportamento final.

Gemini CLI, Roo Code e Qwen não fazem parte do fluxo oficial atual.
