# Contexto permanente do projeto

## Produto

**Conte os Feitos** é uma plataforma cristã modular de Jogos e Desafios Bíblicos.

Jogos integrados ao CMS e à plataforma universal:

- Quiz Bíblico;
- Wordle Bíblico;
- Jogo das 3 Pistas;
- Linha do Tempo Bíblica;
- Memória Bíblica;
- Associação de Temas;
- Quem Sou Eu?.

## Princípios

- experiência gratuita;
- retenção saudável;
- linguagem cristã acessível;
- conteúdo bíblico revisado por pessoas;
- servidor como fonte de verdade;
- isolamento por organização;
- progressão e recompensas idempotentes;
- CMS Universal como fonte oficial do conteúdo publicado;
- remoção do legado somente em etapas reversíveis.

## Arquitetura atual

- frontend/PWA;
- Cloudflare Pages e Pages Functions;
- Cloudflare D1;
- Worker agendado separado;
- GitHub Actions;
- migrations versionadas e reconciliadas;
- CMS, Biblioteca e Gerador Universal;
- Game Loader e Provider Registry;
- modos `FREE_PLAY`, `DAILY` e `EVENT`;
- Event Engine, outbox e consumers idempotentes.

## Fluxo Git

Fluxo recomendado:

`main → branch de trabalho → validações → commit → push → PR → CI → revisão → merge`

Quando o proprietário autorizar explicitamente trabalho direto na `main`, a etapa de branch/PR pode ser omitida. Commit, push, deploy e migrations continuam dependendo do escopo autorizado na tarefa.

## Responsabilidades

- **ChatGPT/Codex:** análise, arquitetura, documentação, implementação, testes, build, debug e revisão conforme o pedido.
- **Usuário/proprietário:** decisões finais e autorização de ações sensíveis ou externas.
