# Governança do repositório

## Package manager

pnpm `11.15.0` é o único package manager oficial. Use `pnpm-lock.yaml` e `pnpm install --frozen-lockfile`. Não gere `package-lock.json` nem versione relatórios temporários de audit.

## Branches e autorização

- Branch própria é o padrão para mudanças comuns.
- Trabalho direto na `main` é permitido quando o proprietário autorizar explicitamente na tarefa.
- A autorização é específica: editar a `main` não autoriza automaticamente commit, push, merge, deploy, tag, migration remota ou escrita em produção.
- Ações remotas exigem autorização clara para seu efeito.

## Conventional Commits

Use uma mensagem curta, no imperativo e que descreva o efeito principal:

- `feat:` nova capacidade;
- `fix:` correção de comportamento;
- `refactor:` reorganização sem mudança funcional;
- `docs:` documentação;
- `test:` testes;
- `chore:` manutenção;
- `ci:` pipeline e automação.

Exemplos:

- `docs: establish phase 5 repository governance`
- `fix: release expired event reservations`
- `test: cover universal game lifecycle`

Não use mensagens genéricas como “Correções”, “Atualização” ou apenas o nome de um arquivo.

## Identificadores técnicos históricos

Os nomes abaixo não devem ser renomeados apenas por estética:

- D1 `quiz-biblico-db`;
- Worker e pasta `journey-awards`;
- nomes de migrations já publicadas;
- tabelas e colunas persistentes;
- IDs de eventos, consumers, ledgers e conteúdos históricos.

Uma renomeação futura precisa de benefício operacional, compatibilidade, plano de migração e rollback. A identidade pública do produto continua sendo **Conte os Feitos**, independentemente desses nomes internos.

## Textos visíveis e documentação

Textos atuais devem falar em Conte os Feitos, plataforma, jogos, Livre, Diário e Eventos. “Jornada”, “Ranking” e “Medalha” permanecem válidos somente quando descrevem o domínio histórico/competitivo do Quiz.

## Branch remota antiga

Em 08/08/2026, `origin/audit/game-content-inventory` possuía zero commits exclusivos e estava 28 commits atrás da `main`. Pode ser removida remotamente após autorização humana; a Sprint 24.0 não a remove.

