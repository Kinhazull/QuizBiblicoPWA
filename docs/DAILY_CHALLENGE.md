# Desafios Diários 2.0

## Objetivo

O Daily oferece uma tentativa por dia em cada um dos sete jogos. O progresso principal é medido por vitórias em jogos diferentes e possui metas em 3/7 e 7/7.

## Fonte da verdade

- Seleção: Gerador Universal, modo `DAILY`.
- Dia e reset: timezone da organização, calculado no servidor.
- Tentativa: `generated_game_participations`.
- Resultado: `finish_event_id` e `GAME_FINISHED`; abandono usa o evento determinístico de encerramento.
- Recompensa: Progress e ledgers existentes.
- Frontend: somente apresenta o contrato retornado por `GET /api/platform/daily-objectives`.

## Jogos e estados

Os sete jogos são Quiz, Wordle, Linha do Tempo, Memória, Associação, Quem Sou Eu e Três Pistas.

Estados visíveis:

- `AVAILABLE`: ainda pode iniciar a tentativa;
- `WON`: tentativa encerrada com vitória;
- `LOST`: derrota, abandono ou participação iniciada que voltou à lista;
- `UNAVAILABLE`: catálogo/geração indisponível.

`STARTED` continua sendo lifecycle técnico durante a sessão aberta, mas nunca produz ação “Continuar” na lista. Uma participação finalizada não pode ser reaberta nem gerar outra seleção no mesmo dia.

## Metas e recompensas

- Meta intermediária: 3 vitórias.
- Meta completa: 7 vitórias.
- Estados: `LOCKED`, `READY`, `CLAIMED`.
- Claim: manual, autenticado e validado novamente no servidor.
- 3/7: 25 XP e 3 moedas.
- 7/7: 50 XP e 7 moedas.

Os valores são provisórios e centralizados em `platform-daily-challenge.ts`; devem ser revisados na Sprint 25.2. IDs determinísticos e `ON CONFLICT` dos ledgers impedem duplicação por refresh, múltiplas abas ou requisições concorrentes.

## Derrota, abandono e indisponibilidade

Derrota e abandono consomem a tentativa e não contam como vitória. Conteúdo indisponível não é contado como derrota, não reduz o denominador e não habilita 7/7; a correção do catálogo permanece operacional, sem fallback legado.

## Reset e histórico

O `dayKey` usa o timezone da organização. A mudança de dia gera novas seleções e novos IDs de recompensa, preservando participações e ledgers anteriores.

## Relação com retenção, Missão e Cofre

- A sequência atual continua sendo sequência de login; Daily não altera seu significado.
- Desafios Diários são sete jogos e metas 3/7–7/7.
- Missão do Dia continua sendo um objetivo adicional do Mission Service.
- Cofre continua sendo liberado pela Missão do Dia e mantém sua economia.

## UX e acessibilidade

- Home apresenta somente vitórias, marcadores e próxima recompensa.
- A página Daily distingue não jogado, vitória, derrota e indisponibilidade por texto, ícone e estilo.
- Resultado Daily oferece somente retorno aos desafios.
- A lista recarrega em `pageshow`, foco e retorno à visibilidade, sempre com `cache: no-store`.
- Feedback de claim respeita `prefers-reduced-motion`.

## Analytics e notificações

Analytics continua derivando início, conclusão e vitórias das participações e eventos. `DAILY_VIEWED` não foi criado porque exigiria um novo sinal persistido sem benefício operacional comprovado. Notificações de reward ready ficam reservadas para a central unificada; o estado READY já é exposto no contrato sem criar notificações duplicadas.
