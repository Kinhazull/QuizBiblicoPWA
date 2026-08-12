# Colecionáveis e Conquistas 2.0

## Objetivo e fontes de verdade

Esta é a especificação funcional da experiência de coleção. Ela compõe estruturas existentes, sem criar uma segunda economia ou um segundo serviço de conquistas:

- `shared/platform-economy.ts`: itens, categorias e preços oficiais da Loja;
- `shared/platform-collections.ts`: raridade, origem e agrupamento em coleções;
- `functions/_lib/platform-achievement-catalog.ts`: conquistas oficiais, critérios e recompensas;
- Progress Service e seus ledgers: saldo, propriedade e equipamento;
- Achievement Service: desbloqueio único e recompensa idempotente;
- Statistics Service: projeções confiáveis usadas no progresso das conquistas.

## Modelo de colecionável

Todo colecionável possui identificador estável, categoria (`avatar` ou `frame`), nome, descrição, representação visual, preço server-side, coleção, raridade e origem. A propriedade continua sendo comprovada por um lançamento aplicado e isolado por usuário e organização no ledger de moedas.

Raridades de apresentação:

- `COMMON` — Comum;
- `UNCOMMON` — Incomum;
- `RARE` — Raro;
- `EPIC` — Épico.

A raridade não altera poder, recompensa nem comportamento. Quatorze itens têm origem `SHOP`, um tem origem `DAILY` e um tem origem `ACHIEVEMENT`. As origens `EVENT` e `MISSION` permanecem reservadas para evolução futura.

## Coleções oficiais

| Coleção | Categoria | Itens | Progresso |
|---|---|---:|---|
| Símbolos Bíblicos | Avatares | 8 | propriedade real no ledger |
| Molduras da Jornada | Molduras | 8 | propriedade real no ledger |

Uma coleção é `IN_PROGRESS` enquanto faltar algum item e `COMPLETE` quando todos os seus identificadores estiverem adquiridos. O progresso é derivado em leitura; não existe contador duplicado nem recompensa automática por completar uma coleção nesta versão.

## Catálogo

| Item | Coleção | Raridade | Origem | Preço |
|---|---|---|---|---:|
| Avatar Pergaminho | Símbolos Bíblicos | Comum | Loja | 90 |
| Avatar Pomba | Símbolos Bíblicos | Incomum | Loja | 160 |
| Avatar Leão | Símbolos Bíblicos | Raro | Loja | 240 |
| Avatar Lâmpada | Símbolos Bíblicos | Comum | Desafio Diário 7/7 | 70 (referência) |
| Avatar Peixe | Símbolos Bíblicos | Incomum | Loja | 110 |
| Avatar Oliveira | Símbolos Bíblicos | Incomum | Loja | 130 |
| Avatar Arca | Símbolos Bíblicos | Raro | Loja | 190 |
| Avatar Coroa | Símbolos Bíblicos | Épico | Loja | 250 |
| Moldura Bronze | Molduras da Jornada | Comum | Loja | 60 |
| Moldura Prata | Molduras da Jornada | Incomum | Loja | 140 |
| Moldura Ouro | Molduras da Jornada | Épico | Loja | 260 |
| Moldura Oliveira | Molduras da Jornada | Comum | Loja | 90 |
| Moldura Aliança | Molduras da Jornada | Incomum | Loja | 120 |
| Moldura Luz | Molduras da Jornada | Raro | Conquista Primeiros Passos | 180 (referência) |
| Moldura Real | Molduras da Jornada | Raro | Loja | 220 |
| Moldura Celestial | Molduras da Jornada | Épico | Loja | 250 |

Os seis itens anteriores mantêm exatamente seus identificadores, preços e registros de propriedade/equipamento. Os dez novos itens são aditivos. A Loja expõe somente os 14 itens de origem `SHOP`; itens Daily/Conquista não podem ser comprados. O valor de referência dos 16 itens é 2.560 moedas e o total efetivamente comprável é 2.310 moedas.

## Grants determinísticos

- `avatar-lamp`: concedido ao resgatar pela primeira vez a meta Daily 7/7. Repetir o claim ou concorrer em múltiplas abas preserva uma propriedade.
- `frame-light`: concedido quando a conquista existente `first_steps` está desbloqueada. Em retry, um desbloqueio já persistido ainda reconcilia o item ausente.

O grant é uma operação server-side no ledger existente, com `event_id` derivado de organização, usuário e item. O registro usa `source_type='collectible_grant'`, mantém o gatilho na auditoria, não altera o saldo e é protegido por unicidade contra replay e concorrência.

## Conquistas

As 14 conquistas oficiais existentes permanecem no catálogo versionado. O endpoint de coleções apenas apresenta os desbloqueios reais e calcula progresso com Statistics e Progress; ele não desbloqueia nem recompensa. Conquistas ocultas continuam mascaradas até o desbloqueio. Bronze, Prata, Ouro e Lendária permanecem as raridades próprias das conquistas e não são convertidas nas raridades cosméticas.

## Experiência participante

A entrada `Recompensas` da navegação abre `/recompensas`. A página oferece:

- resumo de itens, coleções e conquistas;
- progresso semântico de cada coleção;
- itens adquiridos, bloqueados e equipados;
- raridade e origem;
- conquistas bloqueadas, em progresso e desbloqueadas;
- atalhos para Loja e Inventário.

Home e Perfil continuam consumindo o equipamento existente; as novas molduras usam variantes visuais compatíveis. Nenhum fluxo de jogo, Daily ou Evento foi alterado.

## Segurança e compatibilidade

- o endpoint de leitura exige sessão autenticada e deriva `userId` e `organizationId` da sessão;
- não existe endpoint público de concessão de item, progresso ou conquista;
- compra e equipamento continuam validados no servidor pelo catálogo oficial;
- não há saldo negativo, duplicação de compra ou recompensa por leitura;
- a resposta usa `Cache-Control: no-store, private`;
- não foi necessária migration: propriedade, equipamento e conquistas já possuíam persistência suficiente.

## Assets e decisões futuras

Os ícones atuais são representações Unicode/emoji internas e não baixam assets externos. Para a v2, os 16 itens permanecem classificados como `REPLACE_BEFORE_RELEASE`: a arte final deve usar arquivos autorais/licenciados e acessíveis, preservando os mesmos IDs. Expandir grants para Eventos ou Missões exige regra de produto explícita e testes do gatilho; Eventos permanecem fora desta etapa. Recompensa por coleção completa também permanece decisão de produto, não comportamento implícito.
