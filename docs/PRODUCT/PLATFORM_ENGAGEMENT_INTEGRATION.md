# Integração de Engajamento da Plataforma

Status: implementado na Sprint 25.6.

## Ciclo integrado

A Home apresenta uma única próxima ação prioritária. O jogador segue para Daily, cofre, Evento ou catálogo; o resultado alimenta Progress, recompensas, coleções, Perfil e Ranking pelos serviços já existentes. Daily oferece, após o resgate, caminhos curtos para Recompensas e Perfil. Recompensas oferece acesso a Loja, Inventário e Perfil; Perfil mantém o contexto do Ranking.

## Prioridade da CTA da Home

1. recompensa Daily pronta para resgate;
2. Daily já iniciado com jogos disponíveis;
3. cofre desbloqueado e ainda fechado;
4. Evento ativo;
5. novo Daily disponível;
6. Evento agendado;
7. catálogo de jogos.

A seleção é derivada do estado já carregado pela Home. Quando um Evento ocupa a CTA principal, seu card secundário não é repetido.

## Daily e recompensas

- 3/7: XP e moedas conforme a política existente, por resgate explícito e idempotente.
- 7/7: XP, moedas e o `Avatar Lâmpada`, pelo mesmo resgate explícito.
- A resposta do resgate descreve a recompensa e o colecionável concedido; não cria outro grant.
- O feedback contextual liga para `/recompensas` e `/perfil`; o Inventário continua sendo a única interface de equipamento.

## Notificações internas

| Estado | Suportado | Chave idempotente | Destino |
| --- | --- | --- | --- |
| recompensa Daily pronta | sim | dia + meta | Daily |
| conquista obtida | sim | código + instante de desbloqueio | Recompensas |
| colecionável obtido | sim | item | Recompensas |
| Evento ativo/próximo/terminando | sim | evento + janela | Evento |
| novo Daily disponível | não nesta sprint | — | — |
| streak em risco | não nesta sprint | — | — |

As notificações são derivadas por usuário e organização, permanecem no canal interno existente e reutilizam `notification_receipts` para leitura/deduplicação. O produto ainda não possui preferências configuráveis por tipo; por isso nenhum novo tipo dependente de preferência ou horário foi criado. Não há push, e-mail ou SMS.

## Analytics

`DAILY_OPENED` v1 é emitido pelo serviço `platform-daily` por uma ação autenticada exclusiva da página Daily, uma vez por usuário, organização e dia local. Consultar o resumo na Home não conta como abertura. O `eventId` determinístico torna reaberturas idempotentes. O Analytics passa a expor usuários únicos e eventos de abertura, sem consumidor novo e sem instrumentar cliques.

Falhas nesse sinal são best-effort e não impedem a consulta dos objetivos. `GAME_STARTED` continua sendo a fonte para partidas efetivamente iniciadas.

## Limitações deliberadas

- Não há aviso de streak em risco até existir contrato temporal e preferência de comunicação adequados.
- Não há aviso separado de “novo Daily”; a Home já prioriza o Daily e evita repetir a mesma mensagem em múltiplas superfícies.
- Não há recompensa por Ranking, Ranking de Evento, recomendação, onboarding ou motor de engajamento.
- Nenhuma migration, tabela, ledger ou pipeline nova foi criada.
