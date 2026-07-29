# Universal Game Generator 1.0

Status: infraestrutura interna em shadow mode.

O Gerador consulta exclusivamente o Catálogo Elegível, aplica o algoritmo
versionado e persiste uma seleção imutável de `contentId + contentVersion`.
Nenhum endpoint público ou modo de jogo utiliza o Gerador nesta versão.

## Contratos

- algoritmo inicial: versão `1`;
- modo habilitado: `INTERNAL_TEST`;
- chave idempotente: organização, jogo, modo, `selectionKey` e versão do
  algoritmo;
- filtros diferentes reutilizando a mesma chave são recusados;
- conteúdo insuficiente falha sem persistir seleção parcial;
- diferenças entre jogos são declaradas no registro de capacidades;
- somente o adaptador Wordle possui resolução de payload nesta etapa.

## Uso de conteúdo

Gerar uma seleção não representa utilização e não incrementa `usageCount`.
O fato canônico futuro para registrar uso será `GAME_STARTED`, contendo
`selectionId`, `contentId` e `contentVersion`. O consumidor de uso deverá ser
idempotente por essa identidade e chamará explicitamente
`recordUniversalLibraryUsage`. `GAME_FINISHED` continuará responsável pela
conclusão, estatísticas e recompensas, sem contar novamente o início.

Esse consumidor não foi registrado nesta sprint.
