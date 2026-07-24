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

## Princípios de produto

- Experiência gratuita.
- Sem publicidade pesada.
- Retenção saudável.
- Linguagem cristã acessível.
- Conteúdo bíblico revisado por pessoas.
- Novos jogos com regras e persistência próprias.
- Evolução modular sem enfraquecer o domínio já validado do Quiz.

## Progressão da plataforma

A plataforma poderá utilizar:

- XP global;
- nível global;
- moedas;
- estatísticas por jogo;
- Conquistas;
- missões;
- eventos;
- recompensas;
- desbloqueáveis.

As Medalhas pertencem ao domínio competitivo do Quiz e não equivalem às Conquistas da plataforma.

## Invariantes arquiteturais

- O servidor concede recompensas persistentes.
- O cliente nunca concede XP, moedas ou recompensas persistentes.
- Estatísticas devem ser reconstruíveis.
- Mudanças arquiteturais exigem decisão formal.
- Eventos e consumidores devem ser versionados.
- Processamento assíncrono deve ser idempotente.
- Retry, dead letter e observabilidade devem ser preservados.
- Novos jogos não reutilizam `rounds` ou `attempts` por conveniência.
- Jornadas, Ranking e Medalhas continuam pertencendo ao Quiz Bíblico.

## Arquitetura atual conhecida

A solução utiliza:

- frontend/PWA;
- Cloudflare Pages;
- Pages Functions;
- Cloudflare D1;
- Worker separado;
- GitHub Actions;
- migrations versionadas;
- serviços de domínio;
- processamento assíncrono;
- transactional outbox.

## Fluxo Git oficial

```text
main
  ↓
feature branch
  ↓
implementação
  ↓
validações
  ↓
commit
  ↓
push
  ↓
Pull Request
  ↓
GitHub Actions
  ↓
revisão
  ↓
squash merge
  ↓
exclusão da branch
  ↓
pull da main
```

## Ferramentas oficiais

### ChatGPT com GitHub

- planejamento;
- arquitetura;
- auditoria;
- documentação;
- revisão;
- preparação de sprint;
- continuidade entre conversas.

### Codex

- implementação;
- testes;
- build;
- debug;
- mudanças complexas no ambiente local.

### GitHub Desktop

- sincronização;
- branches;
- commits;
- push;
- pull.

Gemini CLI, Roo Code e Qwen não fazem parte do fluxo oficial atual.

## Memória operacional

Conversas de chat são temporárias. A pasta `docs/AI` é a memória operacional oficial do projeto.

Informações importantes não devem existir apenas no chat.
