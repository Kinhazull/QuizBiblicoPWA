# GovernanÃ§a editorial do CMS Universal

## Modelo canÃ´nico

O CMS preserva trÃªs conceitos independentes:

- `editorial_status`: fluxo humano `DRAFT`, `IN_REVIEW`, `PUBLISHED`, `ARCHIVED`;
- `version`: snapshot imutÃ¡vel do conteÃºdo e metadados;
- `universal_content_library.availability_status`: elegibilidade operacional para seleÃ§Ãµes.

A coluna histÃ³rica `content_items.status` continua limitada a `DRAFT/PUBLISHED` como compatibilidade de runtime. Ela nÃ£o Ã© mais a fonte editorial: apenas `PUBLISHED` editorial projeta `PUBLISHED`; os demais estados projetam `DRAFT`.

## TransiÃ§Ãµes e permissÃµes

| Origem | Destino | Capacidade | Efeito |
| --- | --- | --- | --- |
| DRAFT | IN_REVIEW | `content.manage` | registra envio e bloqueia ediÃ§Ã£o |
| IN_REVIEW | DRAFT | `content.review` | exige comentÃ¡rio e devolve para ajustes |
| IN_REVIEW | PUBLISHED | `content.review` | revalida, registra revisÃ£o e projeta na Biblioteca |
| PUBLISHED | ARCHIVED | `content.review` | impede novas seleÃ§Ãµes e preserva snapshots |
| ARCHIVED | DRAFT | `content.review` | cria etapa editÃ¡vel sem reativar publicaÃ§Ã£o |

TransiÃ§Ãµes fora dessa matriz retornam conflito. `content.review` possui ponte unidirecional temporÃ¡ria para `questions.review`; `content.manage` conserva a ponte para `questions.edit`.

## ComentÃ¡rios, histÃ³rico e rollback

ComentÃ¡rios editoriais tÃªm no mÃ¡ximo 2.000 caracteres, autor, data e versÃ£o. NÃ£o pertencem a APIs participantes. Auditoria registra somente a aÃ§Ã£o e a versÃ£o, sem payload editorial.

`content_versions` preserva metadados e payload de cada versÃ£o. A comparaÃ§Ã£o administrativa Ã© campo a campo e nÃ£o depende de biblioteca externa. Rollback Ã© permitido apenas em `DRAFT`: copia um snapshot anterior para uma **nova** versÃ£o e registra `rollback_source_version`; nenhuma versÃ£o antiga Ã© alterada.

## Compatibilidade

ConteÃºdos existentes recebem `editorial_status` equivalente ao estado atual. PublicaÃ§Ãµes histÃ³ricas continuam resolvidas por `contentId + contentVersion`. Arquivamento altera apenas elegibilidade futura. Importadores histÃ³ricos permanecem disponÃ­veis.

