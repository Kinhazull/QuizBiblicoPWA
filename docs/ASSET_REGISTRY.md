# Asset Registry

O Asset Registry Ã© o catÃ¡logo canÃ´nico de assets editoriais. D1 armazena apenas metadados e relaÃ§Ãµes; binÃ¡rios grandes nÃ£o sÃ£o armazenados no banco.

Tipos: `IMAGE`, `ICON`, `BANNER`. Estados: `DRAFT`, `ACTIVE`, `ARCHIVED`. Metadados incluem organizaÃ§Ã£o, tÃ­tulo, texto alternativo, URL, origem, atribuiÃ§Ã£o, licenÃ§a, dimensÃµes, tamanho, MIME, autoria e datas.

## Storage 1.0

A prova funcional usa URL HTTPS controlada. Formatos aceitos: PNG, JPEG e WEBP; SVG Ã© recusado. Limites contratuais: 12.000 px por dimensÃ£o e 10 MiB. Um asset `ACTIVE` exige origem e licenÃ§a declaradas; a plataforma nÃ£o infere licenÃ§as.

R2 Ã© o destino preparado para binÃ¡rios futuros, mas esta sprint nÃ£o cria bucket, binding ou secret remoto.

Para a v2, o cadastro técnico não substitui a comprovação humana de origem/licença. Assets destinados ao release devem constar em `docs/PRODUCT/ASSET_LICENSE_MANIFEST.json`; URLs externas permanecem `PENDING_HUMAN_REVIEW` até host, autoria, licença e compatibilidade com CSP serem aprovados. Não se deve abrir a CSP genericamente para acomodar origem desconhecida.

## RelaÃ§Ã£o com conteÃºdo e Eventos

`content_assets` vincula `contentId + contentVersion` ao `assetId`, com papÃ©is `PRIMARY`, `THUMBNAIL`, `CLUE`, `PAIR_A`, `PAIR_B` e `BACKGROUND`. Nenhum jogo Ã© obrigado a usar imagem.

Eventos aceitam `cover_asset_id` preferencial e preservam `cover_url` como fallback histÃ³rico. O asset precisa ser `ACTIVE` e pertencer Ã  mesma organizaÃ§Ã£o.

## Prova da MemÃ³ria

O contrato suporta textoâ€“texto sem alteraÃ§Ã£o, imagemâ€“texto por um vÃ­nculo `PAIR_A`/`PAIR_B`, e imagemâ€“imagem por dois vÃ­nculos posicionais. A interface participante permanece textual; a conversÃ£o dos 40 conteÃºdos fica fora desta sprint.
