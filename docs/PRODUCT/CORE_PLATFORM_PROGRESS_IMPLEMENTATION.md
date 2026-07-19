# Progressão Global do Usuário — primeira vertical

## Escopo implementado

Esta vertical introduz XP, nível e moedas globais da plataforma sem integrar qualquer jogo. O Quiz Bíblico continua isolado: Jornadas, tentativas, pontuação, ranking e medalhas não concedem progresso global nesta etapa.

## Decisões técnicas

- O servidor é a única fonte da verdade para saldos e concessões.
- O nível não é persistido: ele é derivado deterministicamente do XP total pela curva `quadratic-v1`.
- O limiar acumulado do nível `n` é `100 × (n - 1)²` XP.
- XP e moedas usam ledgers separados e imutáveis, com `event_id` único para idempotência.
- `user_platform_progress` é uma projeção materializada dos saldos, atualizada na mesma operação em lote do ledger.
- As concessões são serviços internos; não existe endpoint cliente para adicionar XP ou moedas.
- Toda leitura e concessão é limitada por usuário e organização.
- Contas sem registro persistido recebem uma projeção segura: nível 1, 0 XP e 0 moedas, sem escrita durante a leitura.

## Contratos de leitura

- `GET /api/platform/progress`: retorna somente o progresso do usuário autenticado e usa `Cache-Control: no-store, private`.
- `GET /api/profile/me`: inclui o mesmo objeto `progress` para a tela de Perfil.
- A Home usa o endpoint dedicado e mantém valores zero apenas como fallback visual durante o carregamento.

## Persistência

A migration `0023_platform_user_progress.sql` adiciona:

- `user_platform_progress`;
- `platform_xp_ledger`;
- `platform_coin_ledger`;
- índices de organização/usuário e histórico por usuário/data.

Backup, diagnóstico estrutural e limpeza segura de dados do piloto reconhecem as novas estruturas. Nenhuma migration remota foi aplicada por esta implementação.

## Limites desta etapa

- Nenhum jogo emite eventos de progressão.
- Missões, gemas, baú e recompensas não foram implementados.
- Não existe interface administrativa de ajuste manual.
- A nomenclatura `PLATFORM_MASTER_PLAN` não existe no repositório; a aderência ao plano mestre foi verificada contra `docs/PRODUCT/ROADMAP.md`, além dos três documentos de arquitetura solicitados.
