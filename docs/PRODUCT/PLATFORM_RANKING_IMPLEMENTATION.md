# Ranking Universal — Implementação v1

## Fonte de verdade

O Ranking Universal é uma projeção somente leitura. Ele não mantém pontos próprios:

- **Geral:** `user_platform_progress.total_xp`.
- **Semanal:** soma dos lançamentos aplicados de `platform_xp_ledger.amount` na semana corrente.
- **Por jogo:** `best_score` para Quiz, Wordle e Linha do Tempo; `best_normalized_performance` (0–100) para os quatro jogos de tamanho variável.

Todas as consultas são autenticadas e limitadas à `organizationId` da sessão. E-mail, telefone e identificadores internos não fazem parte da resposta pública do ranking.

## Critérios e desempates

### Geral

1. XP total, decrescente.
2. Quantidade de partidas concluídas, decrescente.
3. Data de entrada na progressão da plataforma, crescente.
4. `user_id`, apenas como desempate técnico estável e não exposto pela API.

### Semanal

A semana usa o fuso configurado da organização, começa na segunda-feira às 00:00 e termina na segunda seguinte às 00:00. A janela é convertida para instantes UTC e aplicada sobre `platform_xp_ledger.applied_at`. O XP global não é zerado.

Desempates: XP semanal, XP total, instante em que o último lançamento da soma semanal foi aplicado e identificador técnico.

### Jogos

| Jogo | Estado | Critério |
|---|---|---|
| Quiz Bíblico | Ativo | Melhor pontuação; partidas concluídas como desempate |
| Wordle Bíblico | Ativo | Melhor pontuação; partidas concluídas como desempate |
| Linha do Tempo Bíblica | Ativo | Melhor pontuação; partidas concluídas como desempate |
| Memória Bíblica | Ativo | `round(100 × score / (pares × 150))`; mede eficiência das jogadas |
| Associação de Temas | Ativo | 80% proporção concluída + 20% eficiência contra o limite de três erros |
| Quem Sou Eu? | Ativo | `round(100 × score / (desafios × 500))`; acertos e menos pistas elevam o resultado |
| Jogo das 3 Pistas | Ativo | `round(100 × score / (desafios × 300))`; uma pista vale mais que duas ou três |

As quatro métricas são calculadas pelo Statistics Consumer exclusivamente a partir do `GAME_FINISHED v2` produzido após a validação server-side. Elas são comparáveis somente dentro do mesmo jogo; não existe score universal. Em todos os jogos, o desempate usa mais partidas concluídas, depois o instante de atualização da projeção e o identificador técnico não exposto.

Partidas históricas permanecem sem desempenho normalizado: a migration não inventa valores nem executa backfill complexo. Novas conclusões alimentam a projeção; uma reconstrução explícita das estatísticas pode recalcular eventos históricos que ainda contenham dados canônicos suficientes.

## Contrato e UX

`GET /api/platform/rankings` aceita `scope=overall|weekly|game`, `gameId` do catálogo fechado e `limit` de 1 a 25 (10 por padrão). Ordenação, Top N e posição do jogador são resolvidos no servidor. A posição própria é retornada mesmo fora do Top N e a interface evita duplicá-la quando já estiver visível.

A rota participante é `/rankings`. O Perfil 2.0 exibe apenas a posição Geral compacta e um link para a experiência completa. Avatar e moldura equipados são obtidos na mesma consulta da identidade, sem N+1.

## Performance, privacidade e futuro

A migration 0038 adiciona a projeção normalizada e índices para XP geral, janela semanal, melhores pontuações e desempenho por jogo. As respostas usam `Cache-Control: no-store, private`.

Ranking de Evento permanece fora do contrato. A arquitetura admite um novo `scope` futuro, mas não cria tabelas ou APIs especulativas nesta versão.
