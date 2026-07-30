# Modo Livre — implementação v1

## Contratos

- `GameMode` descreve a origem da partida: `NORMAL`, `DAILY`, `FREE_PLAY` e `EVENT`.
- `SelectionPolicy` descreve políticas que usam seleções geradas: `DAILY`, `FREE_PLAY` e `EVENT`.
- `Mode Capabilities` centraliza ativação, filtros, compartilhamento, replay, janela temporal e uso de seleção gerada.
- `EVENT` permanece reservado e desativado.

## Provider Registry

O `Game Loader` resolve o provider pelo Registry tipado. Registros duplicados e modos sem provider são rejeitados. Os providers ativos são:

- `NORMAL` → carregamento direto já existente;
- `DAILY` → seleção diária compartilhada;
- `FREE_PLAY` → seleção individual existente;
- `EVENT` → sem provider.

Os jogos recebem o mesmo `LoadedGameContent` e não conhecem endpoints do modo.

## Geração e idempotência

`POST /api/platform/free-play/generate` recebe apenas `gameType`, filtros públicos e uma `idempotencyKey`. Organização e usuário vêm da sessão.

A chave lógica inclui organização, usuário, jogo e `idempotencyKey`. A seed é derivada no servidor também com versão do algoritmo e filtros normalizados. Assim:

- retry da mesma solicitação reutiliza seleção, ordem e fingerprint;
- nova ação explícita usa nova chave e cria outra seleção;
- outro usuário não pode reutilizar ou carregar a seleção.

## Filtros e repetição

As opções são declaradas pelas capacidades de cada jogo e revalidadas no servidor. A interface apresenta somente filtros compatíveis e valores existentes no catálogo elegível. Nesta versão, testamento permanece desativado até existir metadado bíblico normalizado compartilhado.

O gerador prioriza conteúdos ainda não usados nas 20 utilizações mais recentes do usuário no Modo Livre. Se isso tornar o catálogo insuficiente, repete a geração sem a exclusão recente. Conteúdos `DRAFT`, arquivados ou reservados continuam fora do catálogo elegível.

## Lifecycle e segurança

O fluxo é:

`generate → load → start → validate → finish`

`FreePlayProvider` nunca gera conteúdo durante reload; ele inicia idempotentemente e recarrega o `selectionId` recebido na URL. `GAME_STARTED`, uso e `GAME_FINISHED` usam os checkpoints existentes. Todas as respostas e sequências corretas permanecem no servidor e são resolvidas historicamente por `contentId + contentVersion`.

## Novo modo futuro

Para adicionar um modo:

1. declarar `GameMode`, `SelectionPolicy` e capabilities;
2. implementar um provider pelo contrato comum;
3. registrar o provider uma única vez;
4. implementar geração/lifecycle no servidor sem expor dados sensíveis;
5. adicionar validações cruzadas de modo, organização, usuário e jogo.

Não se adiciona decisão condicional por modo nos componentes de jogo.
